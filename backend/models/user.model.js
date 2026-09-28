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

async function findByGoogleId(googleId) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE google_id = ? LIMIT 1',
    [googleId]
  );
  return rows[0] || null;
}

async function findByTelegramId(telegramId) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE telegram_id = ? LIMIT 1',
    [telegramId]
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

// Used for brand-new accounts created via Google/Telegram, which may have
// no email (Telegram) and never have a password.
async function createSocialUser({ name, email = null, googleId = null, telegramId = null }) {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, google_id, telegram_id, role) VALUES (?, ?, NULL, ?, ?, ?)',
    [name, email, googleId, telegramId, 'customer']
  );
  return findById(result.insertId);
}

async function linkGoogleId(id, googleId) {
  await pool.execute('UPDATE users SET google_id = ? WHERE id = ?', [googleId, id]);
  return findById(id);
}

async function linkTelegramId(id, telegramId) {
  await pool.execute('UPDATE users SET telegram_id = ? WHERE id = ?', [telegramId, id]);
  return findById(id);
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
  findByGoogleId,
  findByTelegramId,
  findAuthById,
  create,
  createSocialUser,
  linkGoogleId,
  linkTelegramId,
  updateRole,
  updateName,
  updatePassword,
};