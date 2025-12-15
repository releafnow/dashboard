const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Render provides DATABASE_URL as a connection string
// Support both DATABASE_URL (production) and individual DB_* vars (local dev)
let poolConfig;

// Only use DATABASE_URL if NODE_ENV is production
// In local development, always use individual DB_* variables even if DATABASE_URL exists
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && process.env.DATABASE_URL) {
  // Use the connection string directly (Render, Heroku, etc.)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('amazonaws.com') 
      ? { rejectUnauthorized: false } 
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  console.log('✓ Using DATABASE_URL for production connection');
} else {
  // Use individual environment variables (local development)
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbName = process.env.DB_NAME || 'releafnow';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  
  poolConfig = {
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  
  console.log(`✓ Using local database: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
  
  // Test connection on startup
  const testPool = new Pool(poolConfig);
  testPool.query('SELECT NOW()')
    .then(() => {
      console.log('✓ Database connection successful');
      testPool.end();
    })
    .catch((err) => {
      console.error('✗ Database connection failed:', err.message);
      console.error('  Please check your .env file in the server directory');
      console.error('  Required variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
      testPool.end();
    });
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;


