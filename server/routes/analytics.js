const express = require('express');
const { auth } = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();

// Get analytics data
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const userFilter = userId ? 'WHERE t.user_id = $1' : '';

    // Trees planted by period (monthly)
    const treesByPeriod = await pool.query(`
      SELECT 
        TO_CHAR(planted_date, 'YYYY-MM') as period,
        COUNT(*) as count
      FROM trees t
      ${userFilter}
      GROUP BY TO_CHAR(planted_date, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT 12
    `, userId ? [userId] : []);

    // Trees by status
    const treesByStatus = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM trees t
      ${userFilter}
      GROUP BY status
    `, userId ? [userId] : []);

    // Top tree planters
    const topPlanters = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(t.id) as tree_count,
        COALESCE(SUM(t.tokens_allocated), 0) as total_tokens
      FROM users u
      JOIN trees t ON u.id = t.user_id
      ${userId ? 'WHERE u.id = $1' : ''}
      GROUP BY u.id, u.name, u.email
      ORDER BY tree_count DESC
      LIMIT 10
    `, userId ? [userId] : []);

    // Users who received tokens
    const tokenRecipients = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(tt.id) as transaction_count,
        COALESCE(SUM(CASE WHEN tt.status = 'completed' THEN tt.amount ELSE 0 END), 0) as total_received
      FROM users u
      JOIN token_transactions tt ON u.id = tt.user_id
      WHERE tt.type = 'reward'
      ${userId ? 'AND u.id = $1' : ''}
      GROUP BY u.id, u.name, u.email
      ORDER BY total_received DESC
    `, userId ? [userId] : []);

    // Users who should receive tokens (pending rewards)
    const pendingTokenRecipients = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(tt.id) as pending_count,
        COALESCE(SUM(tt.amount), 0) as pending_amount,
        ARRAY_AGG(t.location) as tree_locations
      FROM users u
      JOIN token_transactions tt ON u.id = tt.user_id
      LEFT JOIN trees t ON tt.tree_id = t.id
      WHERE tt.status = 'pending' AND tt.type = 'reward'
      ${userId ? 'AND u.id = $1' : ''}
      GROUP BY u.id, u.name, u.email
      ORDER BY pending_amount DESC
    `, userId ? [userId] : []);

    // Trees by type
    const treesByType = await pool.query(`
      SELECT 
        tree_type,
        COUNT(*) as count
      FROM trees t
      ${userFilter}
      GROUP BY tree_type
      ORDER BY count DESC
      LIMIT 10
    `, userId ? [userId] : []);

    // Total statistics
    const totalStatsQuery = userId
      ? `
      SELECT 
        (SELECT COUNT(*) FROM trees WHERE user_id = $1) as total_trees,
        (SELECT COUNT(*) FROM trees WHERE user_id = $1 AND status = 'verified') as verified_trees,
        (SELECT COUNT(*) FROM trees WHERE user_id = $1 AND status = 'pending') as pending_trees,
        (SELECT COALESCE(SUM(tokens_allocated), 0) FROM trees WHERE user_id = $1) as total_tokens_allocated,
        (SELECT COUNT(*) FROM users WHERE role = 'member' AND id = $1) as total_members
    `
      : `
      SELECT 
        (SELECT COUNT(*) FROM trees) as total_trees,
        (SELECT COUNT(*) FROM trees WHERE status = 'verified') as verified_trees,
        (SELECT COUNT(*) FROM trees WHERE status = 'pending') as pending_trees,
        (SELECT COALESCE(SUM(tokens_allocated), 0) FROM trees) as total_tokens_allocated,
        (SELECT COUNT(*) FROM users WHERE role = 'member') as total_members
    `;
    
    const totalStats = await pool.query(totalStatsQuery, userId ? [userId] : []);

    res.json({
      treesByPeriod: treesByPeriod.rows,
      treesByStatus: treesByStatus.rows,
      topPlanters: topPlanters.rows,
      tokenRecipients: tokenRecipients.rows,
      pendingTokenRecipients: pendingTokenRecipients.rows,
      treesByType: treesByType.rows,
      totalStats: totalStats.rows[0],
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


