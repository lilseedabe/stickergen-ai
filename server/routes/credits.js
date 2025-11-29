const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// Get user's credit balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT credits FROM users WHERE id = $1', [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ credits: result.rows[0].credits });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Consume credits for generation
router.post('/consume', authenticateToken, async (req, res) => {
  const { resolution } = req.body; // '1K' or '4K'

  if (!['1K', '4K'].includes(resolution)) {
    return res.status(400).json({ error: 'Invalid resolution' });
  }

  try {
    // Get cost
    const costResult = await db.query(
      'SELECT credits_required, stamps_generated FROM credit_costs WHERE action_type = $1 AND is_active = TRUE',
      [`generate_${resolution.toLowerCase()}`]
    );

    if (costResult.rows.length === 0) {
      return res.status(500).json({ error: 'Cost configuration not found' });
    }

    const { credits_required, stamps_generated } = costResult.rows[0];

    // Check user's balance
    const userResult = await db.query('SELECT credits FROM users WHERE id = $1', [req.user.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentCredits = userResult.rows[0].credits;

    if (currentCredits < credits_required) {
      return res.status(400).json({
        error: 'Insufficient credits',
        required: credits_required,
        current: currentCredits
      });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Deduct credits
      const updateResult = await db.query(
        'UPDATE users SET credits = credits - $1, updated_at = NOW() WHERE id = $2 RETURNING credits',
        [credits_required, req.user.userId]
      );

      const newBalance = updateResult.rows[0].credits;

      // Log usage
      await db.query(
        'INSERT INTO credit_usage (user_id, credits_used, action_type, stamps_generated, resolution) VALUES ($1, $2, $3, $4, $5)',
        [req.user.userId, credits_required, `generate_${resolution.toLowerCase()}`, stamps_generated, resolution]
      );

      await db.query('COMMIT');

      res.json({
        success: true,
        creditsUsed: credits_required,
        newBalance: newBalance,
        stampsGenerated: stamps_generated
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error consuming credits:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get usage history
router.get('/history', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await db.query(
      'SELECT * FROM credit_usage WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.userId, limit, offset]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get usage statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_generations,
        SUM(credits_used) as total_credits_used,
        SUM(stamps_generated) as total_stamps_generated,
        action_type,
        resolution
      FROM credit_usage
      WHERE user_id = $1
      GROUP BY action_type, resolution
    `, [req.user.userId]);

    res.json({ stats: result.rows });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
