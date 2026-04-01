const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../db');
const { v4: uuidv4 } = require('uuid');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const signup = async ({ email, password, full_name, company_name, default_currency = 'USD' }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check email uniqueness
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_EXISTS', status: 409 });
    }

    // Create company
    const companyResult = await client.query(
      'INSERT INTO companies (id, name, default_currency) VALUES ($1, $2, $3) RETURNING *',
      [uuidv4(), company_name, default_currency]
    );
    const company = companyResult.rows[0];

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (id, company_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5, 'ADMIN') RETURNING id, email, full_name, role, company_id`,
      [uuidv4(), company.id, email, password_hash, full_name]
    );
    const user = userResult.rows[0];

    // Create default categories
    const defaultCategories = ['Travel', 'Meals', 'Equipment', 'Software', 'Training', 'Other'];
    for (const cat of defaultCategories) {
      await client.query(
        'INSERT INTO categories (id, company_id, name) VALUES ($1, $2, $3)',
        [uuidv4(), company.id, cat]
      );
    }

    await client.query('COMMIT');

    const token = generateToken(user);
    return { user, company, token };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const login = async ({ email, password }) => {
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.company_id, u.password_hash, c.name as company_name, c.default_currency as company_currency
     FROM users u
     JOIN companies c ON c.id = u.company_id
     WHERE u.email = $1 AND u.deleted_at IS NULL`,
    [email]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Invalid email or password'), { code: 'INVALID_CREDENTIALS', status: 401 });
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw Object.assign(new Error('Invalid email or password'), { code: 'INVALID_CREDENTIALS', status: 401 });
  }

  const { password_hash, ...safeUser } = user;
  const token = generateToken(safeUser);
  return { user: safeUser, token };
};

module.exports = { signup, login };
