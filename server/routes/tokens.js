const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, requireAdmin } = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();

// Get token transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    let query = `
      SELECT tt.*, u.name as user_name, u.email as user_email, t.location as tree_location
      FROM token_transactions tt
      JOIN users u ON tt.user_id = u.id
      LEFT JOIN trees t ON tt.tree_id = t.id
    `;
    let params = [];

    if (req.user.role === 'member') {
      query += ' WHERE tt.user_id = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY tt.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user token balance
router.get('/balance', auth, async (req, res) => {
  try {
    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'reward' THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'completed' AND type IN ('deduction', 'transfer') THEN amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'reward' THEN amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN status = 'completed' AND type IN ('deduction', 'transfer') THEN amount ELSE 0 END), 0) as balance,
        COUNT(CASE WHEN status = 'pending' AND type = 'reward' THEN 1 END) as pending_rewards
      FROM token_transactions
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all user balances (admin only)
router.get('/balances', auth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COALESCE(SUM(CASE WHEN tt.status = 'completed' AND tt.type = 'reward' THEN tt.amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN tt.status = 'completed' AND tt.type IN ('deduction', 'transfer') THEN tt.amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN tt.status = 'completed' AND tt.type = 'reward' THEN tt.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN tt.status = 'completed' AND tt.type IN ('deduction', 'transfer') THEN tt.amount ELSE 0 END), 0) as balance,
        COUNT(CASE WHEN tt.status = 'pending' AND tt.type = 'reward' THEN 1 END) as pending_rewards
      FROM users u
      LEFT JOIN token_transactions tt ON u.id = tt.user_id
      WHERE u.role = 'member'
      GROUP BY u.id, u.name, u.email
      ORDER BY balance DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Allocate tokens to user (admin only)
router.post('/allocate', auth, requireAdmin, [
  body('user_id').isInt(),
  body('amount').isFloat({ min: 0 }),
  body('type').isIn(['reward', 'deduction', 'transfer']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, amount, type, tree_id, notes, auto_approve = false } = req.body;

    // Verify user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const status = auto_approve ? 'completed' : 'pending';
    const processedBy = auto_approve ? req.user.id : null;
    const processedAt = auto_approve ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO token_transactions (user_id, tree_id, amount, type, status, processed_by, processed_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [user_id, tree_id || null, amount, type, status, processedBy, processedAt, notes || null]
    );

    // If it's a reward for a tree, update the tree's tokens_allocated
    if (tree_id && type === 'reward') {
      await pool.query(
        'UPDATE trees SET tokens_allocated = tokens_allocated + $1 WHERE id = $2',
        [amount, tree_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Allocate tokens error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/reject pending transaction (admin only)
router.patch('/transactions/:id/status', auth, requireAdmin, [
  body('status').isIn(['completed', 'cancelled']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    const result = await pool.query(
      `UPDATE token_transactions 
       SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [status, req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found or already processed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk allocate tokens to multiple users (admin only)
router.post('/allocate/bulk', auth, requireAdmin, [
  body('allocations').isArray().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { allocations } = req.body;
    const results = [];

    for (const allocation of allocations) {
      const { user_id, amount, type, tree_id, notes, auto_approve = false } = allocation;

      const status = auto_approve ? 'completed' : 'pending';
      const processedBy = auto_approve ? req.user.id : null;
      const processedAt = auto_approve ? new Date() : null;

      const result = await pool.query(
        `INSERT INTO token_transactions (user_id, tree_id, amount, type, status, processed_by, processed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [user_id, tree_id || null, amount, type, status, processedBy, processedAt, notes || null]
      );

      results.push(result.rows[0]);

      if (tree_id && type === 'reward') {
        await pool.query(
          'UPDATE trees SET tokens_allocated = tokens_allocated + $1 WHERE id = $2',
          [amount, tree_id]
        );
      }
    }

    res.status(201).json({ transactions: results });
  } catch (error) {
    console.error('Bulk allocate tokens error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


