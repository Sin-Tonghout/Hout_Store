const crypto = require('crypto');
const { pool } = require('../config/database');

function newToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 characters, not guessable
}

// One token per order item. Safe to call more than once (ON DUPLICATE does nothing).
async function createForOrder(connection, orderId, items, { maxDownloads, expiresAt }) {
  for (const item of items) {
    await connection.execute(
      `INSERT INTO downloads
        (order_id, order_item_id, product_id, download_token, max_downloads, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE order_id = order_id`,
      [orderId, item.id, item.product_id, newToken(), maxDownloads, expiresAt]
    );
  }
}

// Everything the download endpoint needs, in one query
async function findByToken(token) {
  const [rows] = await pool.execute(
    `SELECT d.id, d.order_id, d.download_token, d.download_count, d.max_downloads, d.expires_at,
            o.user_id, o.status AS order_status, o.payment_status,
            oi.product_name,
            p.file_name, p.id AS product_id
       FROM downloads d
       JOIN orders o ON o.id = d.order_id
       JOIN order_items oi ON oi.id = d.order_item_id
       LEFT JOIN products p ON p.id = d.product_id
      WHERE d.download_token = ?
      LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function incrementCount(id) {
  await pool.execute('UPDATE downloads SET download_count = download_count + 1 WHERE id = ?', [id]);
}

// Everything a logged-in customer can currently download, newest order first
async function listForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT d.download_token, d.download_count, d.max_downloads, d.expires_at,
            o.order_number, o.status AS order_status, o.payment_status, o.created_at,
            oi.product_name,
            p.slug AS product_slug, p.cover_image
       FROM downloads d
       JOIN orders o ON o.id = d.order_id
       JOIN order_items oi ON oi.id = d.order_item_id
       LEFT JOIN products p ON p.id = d.product_id
      WHERE o.user_id = ? AND o.payment_status = 'success'
      ORDER BY o.created_at DESC, d.id ASC`,
    [userId]
  );
  return rows;
}

module.exports = { createForOrder, findByToken, incrementCount, listForUser };