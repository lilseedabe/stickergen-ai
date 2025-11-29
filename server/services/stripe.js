const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe payment intent for credit package purchase
 */
async function createPaymentIntent(amount, packageInfo, userId) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in yen (Stripe uses smallest currency unit)
      currency: 'jpy',
      metadata: {
        user_id: userId,
        package_id: packageInfo.id,
        package_name: packageInfo.name,
        credits: packageInfo.credits
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Retrieve payment intent by ID
 */
async function getPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}

/**
 * Create a Stripe Checkout Session for credit package purchase
 */
async function createCheckoutSession(packageInfo, userId, successUrl, cancelUrl) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `${packageInfo.name}パッケージ`,
              description: `${packageInfo.credits}クレジット - ${packageInfo.description}`,
              images: [], // Add your product image URL here if needed
            },
            unit_amount: packageInfo.price_jpy,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId.toString(),
      metadata: {
        user_id: userId,
        package_id: packageInfo.id,
        package_name: packageInfo.name,
        credits: packageInfo.credits,
        price_jpy: packageInfo.price_jpy
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Construct webhook event from request
 */
function constructWebhookEvent(payload, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Error constructing webhook event:', error);
    throw error;
  }
}

/**
 * Create a refund for a payment intent
 */
async function createRefund(paymentIntentId, amount = null) {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = amount;
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
}

module.exports = {
  stripe,
  createPaymentIntent,
  getPaymentIntent,
  createCheckoutSession,
  constructWebhookEvent,
  createRefund
};
