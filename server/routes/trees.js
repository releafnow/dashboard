const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { auth, requireAdmin } = require('../middleware/auth');
const pool = require('../config/db');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/trees/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tree-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Get all trees (admin: all, member: own)
router.get('/', auth, async (req, res) => {
  try {
    let query = 'SELECT t.*, u.name as user_name, u.email as user_email FROM trees t JOIN users u ON t.user_id = u.id';
    let params = [];

    if (req.user.role === 'member') {
      query += ' WHERE t.user_id = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get trees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single tree
router.get('/:id', auth, async (req, res) => {
  try {
    let query = 'SELECT t.*, u.name as user_name, u.email as user_email FROM trees t JOIN users u ON t.user_id = u.id WHERE t.id = $1';
    let params = [req.params.id];

    if (req.user.role === 'member') {
      query += ' AND t.user_id = $2';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tree not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get tree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create tree
router.post('/', auth, upload.single('photo'), [
  body('planted_date').notEmpty(),
  body('location').trim().notEmpty(),
  body('tree_type').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required' });
    }

    const { planted_date, location, latitude, longitude, tree_type, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO trees (user_id, planted_date, location, latitude, longitude, tree_type, photo, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, planted_date, location, latitude || null, longitude || null, tree_type, req.file.filename, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create tree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update tree (member can update own pending trees, admin can update any)
router.put('/:id', auth, upload.single('photo'), [
  body('planted_date').optional().notEmpty(),
  body('location').optional().trim().notEmpty(),
  body('tree_type').optional().trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if tree exists and user has permission
    let treeQuery = 'SELECT * FROM trees WHERE id = $1';
    let treeParams = [req.params.id];

    if (req.user.role === 'member') {
      treeQuery += ' AND user_id = $2';
      treeParams.push(req.user.id);
    }

    const treeResult = await pool.query(treeQuery, treeParams);

    if (treeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tree not found' });
    }

    const tree = treeResult.rows[0];

    // Members can only update pending trees
    if (req.user.role === 'member' && tree.status !== 'pending') {
      return res.status(403).json({ message: 'Can only update pending trees' });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (req.body.planted_date) {
      updateFields.push(`planted_date = $${paramCount++}`);
      values.push(req.body.planted_date);
    }
    if (req.body.location) {
      updateFields.push(`location = $${paramCount++}`);
      values.push(req.body.location);
    }
    if (req.body.tree_type) {
      updateFields.push(`tree_type = $${paramCount++}`);
      values.push(req.body.tree_type);
    }
    if (req.body.latitude !== undefined) {
      updateFields.push(`latitude = $${paramCount++}`);
      values.push(req.body.latitude || null);
    }
    if (req.body.longitude !== undefined) {
      updateFields.push(`longitude = $${paramCount++}`);
      values.push(req.body.longitude || null);
    }
    if (req.body.notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      values.push(req.body.notes || null);
    }
    if (req.file) {
      updateFields.push(`photo = $${paramCount++}`);
      values.push(req.file.filename);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE trees SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update tree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update tree status (admin only)
router.patch('/:id/status', auth, requireAdmin, [
  body('status').isIn(['pending', 'verified', 'rejected']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, notes } = req.body;

    let query = 'UPDATE trees SET status = $1, notes = $2';
    let params = [status, notes || null];
    let paramIndex = 3;

    if (status === 'verified') {
      query += `, verified_by = $${paramIndex}, verified_at = CURRENT_TIMESTAMP`;
      params.push(req.user.id);
      paramIndex++;
    }

    // Add tree ID parameter
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(req.params.id);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tree not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update tree status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete tree
router.delete('/:id', auth, async (req, res) => {
  try {
    let query = 'DELETE FROM trees WHERE id = $1';
    let params = [req.params.id];

    if (req.user.role === 'member') {
      query += ' AND user_id = $2';
      params.push(req.user.id);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tree not found' });
    }

    res.json({ message: 'Tree deleted successfully' });
  } catch (error) {
    console.error('Delete tree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



