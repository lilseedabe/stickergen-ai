const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Get all available packages
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM credit_packages WHERE is_active = TRUE ORDER BY credits ASC'
    );

    res.json({ packages: result.rows });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Purchase a package (mock payment for now)
router.post('/purchase', authenticateToken, async (req, res) => {
  const { packageId, paymentMethod = 'stripe' } = req.body;

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

    // Start transaction
    await db.query('BEGIN');

    try {
      // Add credits to user
      const userResult = await db.query(
        'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2 RETURNING credits',
        [pkg.credits, req.user.userId]
      );

      const newBalance = userResult.rows[0].credits;

      // Record purchase
      const purchaseResult = await db.query(
        `INSERT INTO purchases
        (user_id, package_id, credits_purchased, amount_paid_jpy, payment_method, payment_status, transaction_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          req.user.userId,
          packageId,
          pkg.credits,
          pkg.price_jpy,
          paymentMethod,
          'completed', // In production, this would be 'pending' until payment is confirmed
          `txn_${Date.now()}_${req.user.userId}` // Mock transaction ID
        ]
      );

      await db.query('COMMIT');

      res.json({
        success: true,
        purchase: purchaseResult.rows[0],
        newBalance: newBalance,
        message: `Successfully purchased ${pkg.name} package!`
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error purchasing package:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get purchase history
router.get('/history', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await db.query(
      `SELECT p.*, cp.name as package_name, cp.description
       FROM purchases p
       JOIN credit_packages cp ON p.package_id = cp.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    res.json({ purchases: result.rows });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
