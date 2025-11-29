const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, constructWebhookEvent } = require('../services/stripe');
const db = require('../db');

const router = express.Router();

// Create Stripe Checkout Session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { packageId } = req.body;

  if (!packageId) {
    return res.status(400).json({ error: 'Package ID is required' });
  }

  try {
    // Get package details
    const packageResult = await db.query(
      'SELECT * FROM credit_packages WHERE id = $1 AND is_active = TRUE',
      [packageId]
    );

    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const pkg = packageResult.rows[0];

    // Get base URL from request or environment
    const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

    const successUrl = `${baseUrl}/purchase?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/purchase?canceled=true`;

    // Create Stripe Checkout Session
    const session = await createCheckoutSession(
      pkg,
      req.user.userId,
      successUrl,
      cancelUrl
    );

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe Webhook Handler
// IMPORTANT: This route must use express.raw() for body parsing
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.succeeded':
        console.log('PaymentIntent succeeded:', event.data.object.id);
        break;

      case 'payment_intent.payment_failed':
        console.log('PaymentIntent failed:', event.data.object.id);
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get session details (for success page)
router.get('/checkout-session/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session) {
  const userId = parseInt(session.metadata.user_id);
  const packageId = parseInt(session.metadata.package_id);
  const credits = parseInt(session.metadata.credits);
  const priceJpy = parseInt(session.metadata.price_jpy);

  console.log(`Processing successful payment for user ${userId}, package ${packageId}`);

  try {
    await db.query('BEGIN');

    // Add credits to user
    const userResult = await db.query(
      'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2 RETURNING credits',
      [credits, userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    // Record purchase
    await db.query(
      `INSERT INTO purchases
      (user_id, package_id, credits_purchased, amount_paid_jpy, payment_method, payment_status, transaction_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        packageId,
        credits,
        priceJpy,
        'stripe',
        'completed',
        session.payment_intent
      ]
    );

    await db.query('COMMIT');

    console.log(`Successfully processed payment for user ${userId}. New balance: ${userResult.rows[0].credits}`);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
  const userId = paymentIntent.metadata?.user_id;
  const packageId = paymentIntent.metadata?.package_id;

  console.log(`Payment failed for user ${userId}, package ${packageId}`);

  try {
    // Record failed purchase attempt
    if (userId && packageId) {
      await db.query(
        `INSERT INTO purchases
        (user_id, package_id, credits_purchased, amount_paid_jpy, payment_method, payment_status, transaction_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          parseInt(userId),
          parseInt(packageId),
          0,
          paymentIntent.amount,
          'stripe',
          'failed',
          paymentIntent.id
        ]
      );
    }
  } catch (error) {
    console.error('Error recording failed payment:', error);
  }
}

/**
 * Handle refund
 */
async function handleRefund(charge) {
  console.log(`Processing refund for charge ${charge.id}`);

  try {
    // Find the purchase by transaction ID
    const purchaseResult = await db.query(
      'SELECT * FROM purchases WHERE transaction_id = $1',
      [charge.payment_intent]
    );

    if (purchaseResult.rows.length === 0) {
      console.log('Purchase not found for refund');
      return;
    }

    const purchase = purchaseResult.rows[0];

    await db.query('BEGIN');

    // Deduct credits from user
    await db.query(
      'UPDATE users SET credits = GREATEST(0, credits - $1), updated_at = NOW() WHERE id = $2',
      [purchase.credits_purchased, purchase.user_id]
    );

    // Update purchase status
    await db.query(
      'UPDATE purchases SET payment_status = $1 WHERE id = $2',
      ['refunded', purchase.id]
    );

    await db.query('COMMIT');

    console.log(`Successfully processed refund for user ${purchase.user_id}`);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error processing refund:', error);
    throw error;
  }
}

module.exports = router;
