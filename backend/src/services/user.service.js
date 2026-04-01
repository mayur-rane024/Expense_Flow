const bcrypt = require('bcryptjs');
const { query, getClient } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new user within a company (Admin only)
 */
const createUser = async ({ email, password, full_name, role, manager_id }, company_id) => {
  // Validate manager belongs to same company
  if (manager_id) {
    const mgr = await query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [manager_id, company_id]
    );
    if (mgr.rows.length === 0) {
      throw Object.assign(new Error('Manager not found in this company'), { code: 'NOT_FOUND', status: 404 });
    }
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_EXISTS', status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (id, company_id, email, password_hash, full_name, role, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, full_name, role, company_id, manager_id, created_at`,
    [uuidv4(), company_id, email, password_hash, full_name, role, manager_id || null]
  );

  return result.rows[0];
};

/**
 * Get all users in a company
 */
const getUsers = async (company_id, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const totalResult = await query(
    'SELECT COUNT(*) FROM users WHERE company_id = $1 AND deleted_at IS NULL',
    [company_id]
  );
  const total = parseInt(totalResult.rows[0].count);

  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.manager_id, u.created_at,
       m.full_name as manager_name
     FROM users u
     LEFT JOIN users m ON m.id = u.manager_id
     WHERE u.company_id = $1 AND u.deleted_at IS NULL
     ORDER BY u.created_at ASC
     LIMIT $2 OFFSET $3`,
    [company_id, limit, offset]
  );

  return { users: result.rows, total };
};

/**
 * Update user's role or manager
 */
const updateUser = async (userId, updates, company_id) => {
  const allowed = ['role', 'manager_id', 'full_name'];
  const setClauses = [];
  const params = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      setClauses.push(`${key} = $${idx++}`);
      params.push(updates[key]);
    }
  }

  if (setClauses.length === 0) {
    throw Object.assign(new Error('No valid fields to update'), { code: 'INVALID_INPUT', status: 400 });
  }

  params.push(userId, company_id);
  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} 
     WHERE id = $${idx++} AND company_id = $${idx}
     RETURNING id, email, full_name, role, manager_id`,
    params
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND', status: 404 });
  }

  return result.rows[0];
};

/**
 * Get categories for a company
 */
const getCategories = async (company_id) => {
  const result = await query(
    'SELECT * FROM categories WHERE company_id = $1 ORDER BY name ASC',
    [company_id]
  );
  return result.rows;
};

/**
 * Create a category
 */
const createCategory = async (name, company_id) => {
  const result = await query(
    'INSERT INTO categories (id, company_id, name) VALUES ($1, $2, $3) RETURNING *',
    [uuidv4(), company_id, name]
  );
  return result.rows[0];
};

module.exports = { createUser, getUsers, updateUser, getCategories, createCategory };
