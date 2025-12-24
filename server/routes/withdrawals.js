const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, requireAdmin } = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();

// Get user's withdrawal address
router.get('/address', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT withdrawal_address FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ withdrawal_address: result.rows[0]?.withdrawal_address || null });
  } catch (error) {
    console.error('Get withdrawal address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set user's withdrawal address
router.put('/address', auth, [
  body('withdrawal_address').trim().notEmpty().withMessage('Withdrawal address is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { withdrawal_address } = req.body;

    await pool.query(
      'UPDATE users SET withdrawal_address = $1 WHERE id = $2',
      [withdrawal_address, req.user.id]
    );

    res.json({ message: 'Withdrawal address updated successfully', withdrawal_address });
  } catch (error) {
    console.error('Set withdrawal address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's withdrawal requests
router.get('/requests', auth, async (req, res) => {
  try {
    let query = `
      SELECT 
        wr.*,
        u.name as user_name,
        u.email as user_email
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
    `;
    const params = [];
    
    if (!req.user.role || req.user.role !== 'admin') {
      query += ' WHERE wr.user_id = $1';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY wr.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create withdrawal request
router.post('/requests', auth, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('withdrawal_address').trim().notEmpty().withMessage('Withdrawal address is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, withdrawal_address, notes } = req.body;

    // Get user's current balance
    const balanceResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'reward' THEN amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN status = 'completed' AND type IN ('deduction', 'transfer') THEN amount ELSE 0 END), 0) as balance
       FROM token_transactions
       WHERE user_id = $1`,
      [req.user.id]
    );

    const balance = parseFloat(balanceResult.rows[0]?.balance || 0);
    const withdrawalAmount = parseFloat(amount);

    if (withdrawalAmount > balance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Check for pending withdrawal requests
    const pendingResult = await pool.query(
      'SELECT COUNT(*) as count FROM withdrawal_requests WHERE user_id = $1 AND status = $2',
      [req.user.id, 'pending']
    );

    if (parseInt(pendingResult.rows[0].count) > 0) {
      return res.status(400).json({ message: 'You already have a pending withdrawal request' });
    }

    // Create withdrawal request
    const result = await pool.query(
      `INSERT INTO withdrawal_requests (user_id, amount, withdrawal_address, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, withdrawalAmount, withdrawal_address, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create withdrawal request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update withdrawal request status (admin only)
router.patch('/requests/:id/status', auth, requireAdmin, [
  body('status').isIn(['approved', 'rejected', 'completed']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes, transaction_hash } = req.body;

    // Get the withdrawal request
    const requestResult = await pool.query(
      'SELECT * FROM withdrawal_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending' && status !== 'completed') {
      return res.status(400).json({ message: 'Can only modify pending requests' });
    }

    // If approving, create a deduction transaction
    if (status === 'approved') {
      // Check user balance
      const balanceResult = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN status = 'completed' AND type = 'reward' THEN amount ELSE 0 END), 0) - 
          COALESCE(SUM(CASE WHEN status = 'completed' AND type IN ('deduction', 'transfer') THEN amount ELSE 0 END), 0) as balance
         FROM token_transactions
         WHERE user_id = $1`,
        [request.user_id]
      );

      const balance = parseFloat(balanceResult.rows[0]?.balance || 0);

      if (request.amount > balance) {
        return res.status(400).json({ message: 'User has insufficient balance' });
      }

      // Create deduction transaction
      await pool.query(
        `INSERT INTO token_transactions (user_id, amount, type, status, processed_by, processed_at, notes)
         VALUES ($1, $2, 'deduction', 'completed', $3, CURRENT_TIMESTAMP, $4)`,
        [request.user_id, request.amount, req.user.id, `Withdrawal: ${notes || 'Approved withdrawal request'}`]
      );
    }

    // Update withdrawal request
    const updateQuery = status === 'completed' && transaction_hash
      ? `UPDATE withdrawal_requests 
         SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP, 
             notes = $3, transaction_hash = $4
         WHERE id = $5
         RETURNING *`
      : `UPDATE withdrawal_requests 
         SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP, notes = $3
         WHERE id = $4
         RETURNING *`;

    const params = status === 'completed' && transaction_hash
      ? [status, req.user.id, notes || null, transaction_hash, id]
      : [status, req.user.id, notes || null, id];

    const result = await pool.query(updateQuery, params);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update withdrawal request status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



