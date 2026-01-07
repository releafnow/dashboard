const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
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

// Max 10 photos per tree
const MAX_PHOTOS_PER_TREE = 10;

// Helper function to get photos for trees
async function getTreePhotos(treeIds) {
  if (!treeIds || treeIds.length === 0) return {};
  
  const result = await pool.query(
    `SELECT * FROM tree_photos WHERE tree_id = ANY($1) ORDER BY is_primary DESC, created_at ASC`,
    [treeIds]
  );
  
  // Group photos by tree_id
  const photosByTree = {};
  result.rows.forEach(photo => {
    if (!photosByTree[photo.tree_id]) {
      photosByTree[photo.tree_id] = [];
    }
    photosByTree[photo.tree_id].push(photo);
  });
  
  return photosByTree;
}

// Get all trees (admin: all, member: own)
router.get('/', auth, async (req, res) => {
  try {
    // For admin, include user's wallet address for token sending
    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email
      ${req.user.role === 'admin' ? ', u.withdrawal_address as user_wallet_address' : ''}
      FROM trees t 
      JOIN users u ON t.user_id = u.id
    `;
    let params = [];

    if (req.user.role === 'member') {
      query += ' WHERE t.user_id = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    
    // Get photos for all trees
    const treeIds = result.rows.map(t => t.id);
    const photosByTree = await getTreePhotos(treeIds);
    
    // Get token transactions for these trees (to show rewards)
    let tokensByTree = {};
    if (treeIds.length > 0) {
      const tokenResult = await pool.query(
        `SELECT tree_id, amount, transaction_hash, status 
         FROM token_transactions 
         WHERE tree_id = ANY($1) AND type = 'reward' AND status = 'completed'`,
        [treeIds]
      );
      tokenResult.rows.forEach(token => {
        if (!tokensByTree[token.tree_id]) {
          tokensByTree[token.tree_id] = [];
        }
        tokensByTree[token.tree_id].push(token);
      });
    }
    
    // Attach photos and token info to each tree
    const treesWithPhotos = result.rows.map(tree => ({
      ...tree,
      photos: photosByTree[tree.id] || [],
      token_rewards: tokensByTree[tree.id] || []
    }));
    
    res.json(treesWithPhotos);
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

    // Get photos for this tree
    const photosByTree = await getTreePhotos([result.rows[0].id]);
    const treeWithPhotos = {
      ...result.rows[0],
      photos: photosByTree[result.rows[0].id] || []
    };

    res.json(treeWithPhotos);
  } catch (error) {
    console.error('Get tree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create tree with multiple photos
router.post('/', auth, upload.array('photos', MAX_PHOTOS_PER_TREE), [
  body('planted_date').notEmpty(),
  body('location').trim().notEmpty(),
  body('tree_type').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one photo is required' });
    }

    if (req.files.length > MAX_PHOTOS_PER_TREE) {
      return res.status(400).json({ message: `Maximum ${MAX_PHOTOS_PER_TREE} photos allowed` });
    }

    const { planted_date, location, latitude, longitude, tree_type, notes, primaryNewPhotoIndex } = req.body;
    
    // Determine which photo should be primary (default to first photo)
    const primaryIndex = primaryNewPhotoIndex !== undefined ? parseInt(primaryNewPhotoIndex) : 0;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert tree
      const treeResult = await client.query(
        `INSERT INTO trees (user_id, planted_date, location, latitude, longitude, tree_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.id, planted_date, location, latitude || null, longitude || null, tree_type, notes || null]
      );
      
      const tree = treeResult.rows[0];
      
      // Insert all photos into tree_photos table
      const photoInsertPromises = req.files.map((file, index) => {
        return client.query(
          `INSERT INTO tree_photos (tree_id, filename, is_primary)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [tree.id, file.filename, index === primaryIndex]
        );
      });
      
      const photoResults = await Promise.all(photoInsertPromises);
      const photos = photoResults.map(r => r.rows[0]);
      
      await client.query('COMMIT');
      
      res.status(201).json({ ...tree, photos });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create tree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update tree (member can update own pending trees, admin can update any)
router.put('/:id', auth, upload.array('photos', MAX_PHOTOS_PER_TREE), [
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

    // Parse keepPhotos from form data (IDs of existing photos to keep)
    let keepPhotoIds = [];
    if (req.body.keepPhotos) {
      try {
        keepPhotoIds = JSON.parse(req.body.keepPhotos);
      } catch (e) {
        keepPhotoIds = [];
      }
    }

    // Get current photos count
    const currentPhotosResult = await pool.query(
      'SELECT * FROM tree_photos WHERE tree_id = $1',
      [req.params.id]
    );
    const currentPhotos = currentPhotosResult.rows;
    
    // Calculate how many photos we'll have after update
    const keptPhotosCount = currentPhotos.filter(p => keepPhotoIds.includes(p.id)).length;
    const newPhotosCount = req.files ? req.files.length : 0;
    const totalPhotosCount = keptPhotosCount + newPhotosCount;
    
    if (totalPhotosCount > MAX_PHOTOS_PER_TREE) {
      return res.status(400).json({ message: `Maximum ${MAX_PHOTOS_PER_TREE} photos allowed. You have ${keptPhotosCount} existing + ${newPhotosCount} new = ${totalPhotosCount}` });
    }
    
    if (totalPhotosCount === 0) {
      return res.status(400).json({ message: 'At least one photo is required' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete photos that are not in keepPhotoIds
      const photosToDelete = currentPhotos.filter(p => !keepPhotoIds.includes(p.id));
      for (const photo of photosToDelete) {
        // Delete from database
        await client.query('DELETE FROM tree_photos WHERE id = $1', [photo.id]);
        // Delete file from disk
        const filePath = path.join('uploads/trees/', photo.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Get primaryPhotoId and primaryNewPhotoIndex from request
      const { primaryPhotoId, primaryNewPhotoIndex } = req.body;
      
      // Track new photo IDs for primary assignment
      const newPhotoIds = [];
      
      // Insert new photos
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const result = await client.query(
            `INSERT INTO tree_photos (tree_id, filename, is_primary)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [req.params.id, file.filename, false]
          );
          newPhotoIds.push(result.rows[0].id);
        }
      }
      
      // Get all photos for this tree
      const updatedPhotosResult = await client.query(
        'SELECT * FROM tree_photos WHERE tree_id = $1 ORDER BY created_at ASC',
        [req.params.id]
      );
      let updatedPhotos = updatedPhotosResult.rows;
      
      // Set primary photo based on user selection
      let primaryId = null;
      
      if (primaryPhotoId) {
        // User selected an existing photo as primary
        primaryId = parseInt(primaryPhotoId);
      } else if (primaryNewPhotoIndex !== undefined && newPhotoIds.length > 0) {
        // User selected a new photo as primary
        const newIndex = parseInt(primaryNewPhotoIndex);
        if (newIndex >= 0 && newIndex < newPhotoIds.length) {
          primaryId = newPhotoIds[newIndex];
        }
      }
      
      // If no primary selected, check if any existing photo is primary
      if (!primaryId) {
        const existingPrimary = updatedPhotos.find(p => p.is_primary);
        if (existingPrimary) {
          primaryId = existingPrimary.id;
        } else if (updatedPhotos.length > 0) {
          // Default to first photo
          primaryId = updatedPhotos[0].id;
        }
      }
      
      // Update primary status in database
      if (primaryId) {
        await client.query('UPDATE tree_photos SET is_primary = false WHERE tree_id = $1', [req.params.id]);
        await client.query('UPDATE tree_photos SET is_primary = true WHERE id = $1', [primaryId]);
        
        // Update the local array
        updatedPhotos = updatedPhotos.map(p => ({
          ...p,
          is_primary: p.id === primaryId
        }));
      }
      
      // Re-sort photos with primary first
      updatedPhotos.sort((a, b) => {
        if (a.is_primary) return -1;
        if (b.is_primary) return 1;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      // Build update query for tree fields
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

      let updatedTree;
      if (updateFields.length > 0) {
        values.push(req.params.id);
        const result = await client.query(
          `UPDATE trees SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
          values
        );
        updatedTree = result.rows[0];
      } else {
        // No tree fields to update, just fetch the current tree
        const result = await client.query('SELECT * FROM trees WHERE id = $1', [req.params.id]);
        updatedTree = result.rows[0];
      }
      
      await client.query('COMMIT');
      
      res.json({ ...updatedTree, photos: updatedPhotos });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

// Delete individual photo from tree
router.delete('/:id/photos/:photoId', auth, async (req, res) => {
  try {
    const { id: treeId, photoId } = req.params;
    
    // Check if tree exists and user has permission
    let treeQuery = 'SELECT * FROM trees WHERE id = $1';
    let treeParams = [treeId];

    if (req.user.role === 'member') {
      treeQuery += ' AND user_id = $2';
      treeParams.push(req.user.id);
    }

    const treeResult = await pool.query(treeQuery, treeParams);

    if (treeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tree not found' });
    }

    const tree = treeResult.rows[0];

    // Members can only delete photos from pending trees
    if (req.user.role === 'member' && tree.status !== 'pending') {
      return res.status(403).json({ message: 'Can only modify pending trees' });
    }

    // Check if this is the only photo
    const photosCountResult = await pool.query(
      'SELECT COUNT(*) FROM tree_photos WHERE tree_id = $1',
      [treeId]
    );
    
    if (parseInt(photosCountResult.rows[0].count) <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last photo. Each tree must have at least one photo.' });
    }

    // Get the photo to delete
    const photoResult = await pool.query(
      'SELECT * FROM tree_photos WHERE id = $1 AND tree_id = $2',
      [photoId, treeId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const photo = photoResult.rows[0];
    const wasPrimary = photo.is_primary;

    // Delete from database
    await pool.query('DELETE FROM tree_photos WHERE id = $1', [photoId]);

    // Delete file from disk
    const filePath = path.join('uploads/trees/', photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // If deleted photo was primary, set another one as primary
    if (wasPrimary) {
      await pool.query(
        `UPDATE tree_photos SET is_primary = true 
         WHERE id = (SELECT id FROM tree_photos WHERE tree_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [treeId]
      );
    }

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set photo as primary
router.patch('/:id/photos/:photoId/primary', auth, async (req, res) => {
  try {
    const { id: treeId, photoId } = req.params;
    
    // Check if tree exists and user has permission
    let treeQuery = 'SELECT * FROM trees WHERE id = $1';
    let treeParams = [treeId];

    if (req.user.role === 'member') {
      treeQuery += ' AND user_id = $2';
      treeParams.push(req.user.id);
    }

    const treeResult = await pool.query(treeQuery, treeParams);

    if (treeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tree not found' });
    }

    const tree = treeResult.rows[0];

    // Members can only modify pending trees
    if (req.user.role === 'member' && tree.status !== 'pending') {
      return res.status(403).json({ message: 'Can only modify pending trees' });
    }

    // Get the photo
    const photoResult = await pool.query(
      'SELECT * FROM tree_photos WHERE id = $1 AND tree_id = $2',
      [photoId, treeId]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Update primary status
    await pool.query('UPDATE tree_photos SET is_primary = false WHERE tree_id = $1', [treeId]);
    await pool.query('UPDATE tree_photos SET is_primary = true WHERE id = $1', [photoId]);

    res.json({ message: 'Primary photo updated successfully' });
  } catch (error) {
    console.error('Set primary photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete tree
router.delete('/:id', auth, async (req, res) => {
  try {
    // First get the tree and its photos
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

    // Get all photos for this tree
    const photosResult = await pool.query(
      'SELECT * FROM tree_photos WHERE tree_id = $1',
      [req.params.id]
    );

    // Delete all photo files from disk
    for (const photo of photosResult.rows) {
      const filePath = path.join('uploads/trees/', photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete tree (cascade will delete tree_photos entries)
    await pool.query('DELETE FROM trees WHERE id = $1', [req.params.id]);

    res.json({ message: 'Tree deleted successfully' });
  } catch (error) {
    console.error('Delete tree error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
