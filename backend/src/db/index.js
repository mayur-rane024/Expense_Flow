require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Important for serverless DB wakeups
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Helper to get a client from pool (for transactions)
const getClient = () => pool.connect();

// Helper for simple queries
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query, getClient };
