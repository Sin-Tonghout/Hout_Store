const { pool } = require('../config/database');

async function create({ userId, tokenHash, expiresAt }) {
  await pool.execute(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );
}

// Only a token that hasn't been used and hasn't expired is returned.
async function findValidByTokenHash(tokenHash) {
  const [rows] = await pool.execute(
    `SELECT * FROM password_resets
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markUsed(id) {
  await pool.execute('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [id]);
}

module.exports = { create, findValidByTokenHash, markUsed };