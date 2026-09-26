const { pool } = require('../config/database');

const PUBLIC_FIELDS = 'id, name, email, role, status, created_at';

async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, email, passwordHash, role = 'customer' }) {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, role]
  );
  return findById(result.insertId);
}

async function updateRole(id, role) {
  await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  return findById(id);
}

// Includes password_hash. Only use this to check a password.
async function findAuthById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function updateName(id, name) {
  await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name, id]);
}

async function updatePassword(id, passwordHash) {
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

module.exports = {
  findByEmail,
  findById,
  findAuthById,
  create,
  updateRole,
  updateName,
  updatePassword,
};