const { pool } = require("../config/database");

// Runs inside the order transaction. Product name and price are copied here
// so old orders never change when a product is edited later.
async function insertMany(connection, orderId, items) {
  for (const item of items) {
    await connection.execute(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        item.product_id,
        item.name,
        item.price,
        item.quantity,
        item.subtotal,
      ],
    );
  }
}

async function listByOrderId(orderId) {
  const [rows] = await pool.execute(
    `SELECT id, product_id, product_name, price, quantity, subtotal
       FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC`,
    [orderId],
  );
  return rows.map((row) => ({
    ...row,
    price: Number(row.price),
    subtotal: Number(row.subtotal),
  }));
}

// Order items together with their download token (null if not paid yet)
async function listByOrderIdWithDownload(orderId) {
  const [rows] = await pool.execute(
    `SELECT oi.id, oi.product_id, oi.product_name, oi.price, oi.quantity, oi.subtotal,
            d.download_token, d.download_count, d.max_downloads, d.expires_at
       FROM order_items oi
       LEFT JOIN downloads d ON d.order_item_id = oi.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC`,
    [orderId],
  );
  return rows.map((row) => ({
    ...row,
    price: Number(row.price),
    subtotal: Number(row.subtotal),
    download: row.download_token
      ? {
          token: row.download_token,
          downloads_used: row.download_count,
          downloads_max: row.max_downloads,
          expires_at: row.expires_at,
          expired: new Date(row.expires_at) < new Date(),
          limit_reached: row.download_count >= row.max_downloads,
        }
      : null,
  }));
}

async function listNamesByOrderId(orderId) {
  const [rows] = await pool.execute(
    'SELECT product_name FROM order_items WHERE order_id = ?',
    [orderId]
  );
  return rows;
}

module.exports = { insertMany, listByOrderId, listByOrderIdWithDownload,listNamesByOrderId };
