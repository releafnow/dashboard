const express = require('express');
const { auth } = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();

// Get analytics data
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    
    // Get date range from query params
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    // Calculate date range based on period
    let dateFilter = '';
    let dateParams = [];
    
    if (startDate && endDate) {
      dateParams = [startDate, endDate];
    }
    
    // Build user filter and params
    let allParams = [];
    let userFilter = '';
    
    if (userId) {
      userFilter = 'WHERE t.user_id = $1';
      allParams.push(userId);
      if (dateParams.length > 0) {
        userFilter += ` AND t.planted_date >= $${allParams.length + 1} AND t.planted_date <= $${allParams.length + 2}`;
        allParams.push(...dateParams);
      }
    } else if (dateParams.length > 0) {
      userFilter = `WHERE t.planted_date >= $1 AND t.planted_date <= $2`;
      allParams = dateParams;
    }
    
    // Determine date format based on groupBy
    let dateFormat = 'YYYY-MM'; // default monthly
    if (groupBy === 'day') {
      dateFormat = 'YYYY-MM-DD';
    } else if (groupBy === 'week') {
      dateFormat = 'IYYY-IW'; // ISO week
    } else if (groupBy === 'month') {
      dateFormat = 'YYYY-MM';
    } else if (groupBy === 'year') {
      dateFormat = 'YYYY';
    }

    // Trees planted by period
    const treesByPeriodParams = [...allParams, dateFormat];
    const treesByPeriod = await pool.query(`
      SELECT 
        TO_CHAR(planted_date, $${treesByPeriodParams.length}) as period,
        COUNT(*) as count
      FROM trees t
      ${userFilter}
      GROUP BY TO_CHAR(planted_date, $${treesByPeriodParams.length})
      ORDER BY period DESC
      LIMIT 100
    `, treesByPeriodParams);

    // Trees by status
    const treesByStatus = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM trees t
      ${userFilter}
      GROUP BY status
    `, allParams);

    // Top tree planters
    let topPlantersFilter = '';
    let topPlantersParams = [];
    if (userId) {
      topPlantersFilter = 'WHERE u.id = $1';
      topPlantersParams = [userId];
      if (startDate && endDate) {
        topPlantersFilter += ` AND t.planted_date >= $2 AND t.planted_date <= $3`;
        topPlantersParams = [userId, startDate, endDate];
      }
    } else if (startDate && endDate) {
      topPlantersFilter = 'WHERE t.planted_date >= $1 AND t.planted_date <= $2';
      topPlantersParams = [startDate, endDate];
    }
    
    const topPlanters = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(t.id) as tree_count,
        COALESCE(SUM(t.tokens_allocated), 0) as total_tokens
      FROM users u
      JOIN trees t ON u.id = t.user_id
      ${topPlantersFilter}
      GROUP BY u.id, u.name, u.email
      ORDER BY tree_count DESC
      LIMIT 10
    `, topPlantersParams);

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
    `, allParams);

    // Trees by country (admin only)
    let countryFilter = '';
    let countryParams = [];
    if (userId) {
      countryFilter = 'WHERE t.user_id = $1';
      countryParams = [userId];
      if (startDate && endDate) {
        countryFilter += ` AND t.planted_date >= $2 AND t.planted_date <= $3`;
        countryParams = [userId, startDate, endDate];
      }
    } else if (startDate && endDate) {
      countryFilter = 'WHERE t.planted_date >= $1 AND t.planted_date <= $2';
      countryParams = [startDate, endDate];
    }
    
    const treesByCountry = await pool.query(`
      SELECT 
        COALESCE(u.country, 'Unknown') as country,
        COUNT(t.id) as tree_count,
        COUNT(DISTINCT t.user_id) as user_count,
        COALESCE(SUM(t.tokens_allocated), 0) as total_tokens
      FROM trees t
      JOIN users u ON t.user_id = u.id
      ${countryFilter}
      GROUP BY u.country
      ORDER BY tree_count DESC
      LIMIT 15
    `, countryParams);

    // User growth over time (admin only)
    let userGrowthFilter = '';
    let userGrowthParams = [];
    
    if (userId && !startDate) {
      userGrowthFilter = 'WHERE id = $1';
      userGrowthParams = [userId];
    } else if (startDate && endDate) {
      if (userId) {
        userGrowthFilter = 'WHERE id = $1 AND created_at >= $2 AND created_at <= $3';
        userGrowthParams = [userId, startDate, endDate];
      } else {
        userGrowthFilter = 'WHERE created_at >= $1 AND created_at <= $2';
        userGrowthParams = [startDate, endDate];
      }
    }
    
    const userGrowthQueryParams = [...userGrowthParams, dateFormat];
    const userGrowth = await pool.query(`
      SELECT 
        TO_CHAR(created_at, $${userGrowthQueryParams.length}) as period,
        COUNT(*) as count,
        COUNT(CASE WHEN role = 'member' THEN 1 END) as members,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
      FROM users
      ${userGrowthFilter}
      GROUP BY TO_CHAR(created_at, $${userGrowthQueryParams.length})
      ORDER BY period DESC
      LIMIT 100
    `, userGrowthQueryParams);

    // Trees by country and month (admin only)
    let countryPeriodFilter = '';
    let countryPeriodParams = [];
    
    if (userId) {
      countryPeriodFilter = 'WHERE t.user_id = $1';
      countryPeriodParams = [userId];
      if (startDate && endDate) {
        countryPeriodFilter += ` AND t.planted_date >= $2 AND t.planted_date <= $3`;
        countryPeriodParams = [userId, startDate, endDate];
      }
    } else if (startDate && endDate) {
      countryPeriodFilter = 'WHERE t.planted_date >= $1 AND t.planted_date <= $2';
      countryPeriodParams = [startDate, endDate];
    }
    
    const countryPeriodQueryParams = [...countryPeriodParams, dateFormat];
    const treesByCountryAndPeriod = await pool.query(`
      SELECT 
        COALESCE(u.country, 'Unknown') as country,
        TO_CHAR(t.planted_date, $${countryPeriodQueryParams.length}) as period,
        COUNT(t.id) as count
      FROM trees t
      JOIN users u ON t.user_id = u.id
      ${countryPeriodFilter}
      GROUP BY u.country, TO_CHAR(t.planted_date, $${countryPeriodQueryParams.length})
      ORDER BY period DESC, count DESC
      LIMIT 50
    `, countryPeriodQueryParams);

    // Top countries by tokens
    let countriesTokensFilter = 'WHERE u.role = \'member\'';
    let countriesTokensParams = [];
    if (userId) {
      countriesTokensFilter += ' AND u.id = $1';
      countriesTokensParams = [userId];
      if (startDate && endDate) {
        countriesTokensFilter += ` AND t.planted_date >= $2 AND t.planted_date <= $3`;
        countriesTokensParams = [userId, startDate, endDate];
      }
    } else if (startDate && endDate) {
      countriesTokensFilter += ` AND t.planted_date >= $1 AND t.planted_date <= $2`;
      countriesTokensParams = [startDate, endDate];
    }
    
    const countriesByTokens = await pool.query(`
      SELECT 
        COALESCE(u.country, 'Unknown') as country,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT t.id) as total_trees,
        COALESCE(SUM(t.tokens_allocated), 0) as total_tokens_earned
      FROM users u
      LEFT JOIN trees t ON u.id = t.user_id
      ${countriesTokensFilter}
      GROUP BY u.country
      HAVING COUNT(DISTINCT u.id) > 0
      ORDER BY total_tokens_earned DESC
      LIMIT 10
    `, countriesTokensParams);

    // User engagement stats (admin only)
    const userEngagement = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) FILTER (WHERE EXISTS (SELECT 1 FROM trees WHERE user_id = u.id)) as active_users,
        COUNT(DISTINCT u.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM trees WHERE user_id = u.id)) as inactive_users,
        AVG(tree_stats.tree_count) as avg_trees_per_user,
        MAX(tree_stats.tree_count) as max_trees_per_user
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as tree_count
        FROM trees
        GROUP BY user_id
      ) tree_stats ON u.id = tree_stats.user_id
      WHERE u.role = 'member'
      ${userId ? 'AND u.id = $1' : ''}
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
      treesByCountry: treesByCountry.rows,
      userGrowth: userGrowth.rows,
      treesByCountryAndPeriod: treesByCountryAndPeriod.rows,
      countriesByTokens: countriesByTokens.rows,
      userEngagement: userEngagement.rows[0] || {},
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



