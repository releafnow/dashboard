const { Pool } = require('pg');
require('dotenv').config();

// Render provides DATABASE_URL as a connection string
// Support both DATABASE_URL (production) and individual DB_* vars (local dev)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Use the connection string directly (Render, Heroku, etc.)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('amazonaws.com') 
      ? { rejectUnauthorized: false } 
      : false,
  };
} else {
  // Use individual environment variables (local development)
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'releafnow',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

const pool = new Pool(poolConfig);

async function migrate() {
  try {
    console.log('Starting database migration...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        country VARCHAR(100),
        address TEXT,
        phone VARCHAR(50),
        photo VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        withdrawal_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add withdrawal_address column if it doesn't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='withdrawal_address'
        ) THEN
          ALTER TABLE users ADD COLUMN withdrawal_address VARCHAR(255);
        END IF;
      END $$;
    `);

    // Create trees table (photo column removed - use tree_photos table instead)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        planted_date DATE NOT NULL,
        location VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        tree_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
        tokens_allocated DECIMAL(18, 2) DEFAULT 0,
        verified_by INTEGER REFERENCES users(id),
        verified_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create token_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tree_id INTEGER REFERENCES trees(id) ON DELETE SET NULL,
        amount DECIMAL(18, 2) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('reward', 'deduction', 'transfer')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
        processed_by INTEGER REFERENCES users(id),
        processed_at TIMESTAMP,
        transaction_hash VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add transaction_hash column if it doesn't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='token_transactions' AND column_name='transaction_hash'
        ) THEN
          ALTER TABLE token_transactions ADD COLUMN transaction_hash VARCHAR(255);
        END IF;
      END $$;
    `);

    // Create withdrawal_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(18, 2) NOT NULL CHECK (amount > 0),
        withdrawal_address VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
        processed_by INTEGER REFERENCES users(id),
        processed_at TIMESTAMP,
        notes TEXT,
        transaction_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tree_photos table for multiple images per tree
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tree_photos (
        id SERIAL PRIMARY KEY,
        tree_id INTEGER REFERENCES trees(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing photos from trees table to tree_photos table (if not already done)
    // Check if photo column exists before migrating
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='trees' AND column_name='photo'
        ) THEN
          INSERT INTO tree_photos (tree_id, filename, is_primary, created_at)
          SELECT id, photo, true, created_at
          FROM trees
          WHERE photo IS NOT NULL 
            AND photo != ''
            AND NOT EXISTS (
              SELECT 1 FROM tree_photos WHERE tree_photos.tree_id = trees.id
            );
        END IF;
      END $$;
    `);

    // Drop the photo column from trees table (no longer needed)
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='trees' AND column_name='photo'
        ) THEN
          ALTER TABLE trees DROP COLUMN photo;
        END IF;
      END $$;
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trees_user_id ON trees(user_id);
      CREATE INDEX IF NOT EXISTS idx_trees_status ON trees(status);
      CREATE INDEX IF NOT EXISTS idx_trees_planted_date ON trees(planted_date);
      CREATE INDEX IF NOT EXISTS idx_tree_photos_tree_id ON tree_photos(tree_id);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_token_transactions_status ON token_transactions(status);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
    `);

    // Create function to update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_trees_updated_at ON trees;
      CREATE TRIGGER update_trees_updated_at
        BEFORE UPDATE ON trees
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
      CREATE TRIGGER update_withdrawal_requests_updated_at
        BEFORE UPDATE ON withdrawal_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
