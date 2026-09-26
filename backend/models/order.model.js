const crypto = require('crypto');
const { pool } = require('../config/database');
const { formatOrderNumber } = require('../utils/orderNumber');
const orderItemModel = require('./orderItem.model');

function mapOrder(row) {
  return {
    ...row,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
  };
}

// The order and all its items are saved together, or not at all
async function createWithItems({ userId, subtotal, discount, total, currency, items }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // temporary number, replaced as soon as we know the order id
    const [result] = await connection.execute(
      `INSERT INTO orders
        (order_number, user_id, subtotal, discount, total, currency, status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [`TMP${crypto.randomBytes(8).toString('hex')}`, userId, subtotal, discount, total, currency]
    );
    const orderId = result.insertId;

    await connection.execute('UPDATE orders SET order_number = ? WHERE id = ?', [
      formatOrderNumber(orderId),
      orderId,
    ]);

    await orderItemModel.insertMany(connection, orderId, items);

    await connection.commit();
    return orderId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function listByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.order_number, o.subtotal, o.discount, o.total, o.currency,
            o.status, o.payment_status, o.created_at,
            (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, o.id DESC`,
    [userId]
  );
  return rows.map((row) => ({ ...mapOrder(row), item_count: Number(row.item_count) }));
}

// Customers can only read their own orders
async function findByIdForUser(id, userId) {
  const [rows] = await pool.execute(
    `SELECT id, order_number, subtotal, discount, total, currency,
            status, payment_status, created_at
       FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1`,
    [id, userId]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

// ---------- Admin ----------

async function adminList({ search, status, paymentStatus, page, limit }) {
  const where = ['1 = 1'];
  const params = [];

  if (search) {
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    where.push('(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like);
  }
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (paymentStatus) {
    where.push('o.payment_status = ?');
    params.push(paymentStatus);
  }

  const whereSql = where.join(' AND ');
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.total, o.currency, o.status, o.payment_status,
            o.created_at, u.name AS customer_name, u.email AS customer_email,
            (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       JOIN users u ON u.id = o.user_id
      WHERE ${whereSql}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    orders: rows.map((row) => ({
      ...row,
      total: Number(row.total),
      item_count: Number(row.item_count),
    })),
    total: Number(countRows[0].total),
  };
}

async function adminFindById(id) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.order_number, o.subtotal, o.discount, o.total, o.currency,
            o.status, o.payment_status, o.created_at,
            u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] ? mapOrder(rows[0]) : null;
}

// Cancels an unpaid order (and its waiting payments) in one step
async function cancel(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE orders SET status = 'cancelled', payment_status = 'cancelled' WHERE id = ?`,
      [id]
    );
    await connection.execute(
      `UPDATE payments SET status = 'cancelled' WHERE order_id = ? AND status = 'pending'`,
      [id]
    );
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Admin: confirm a paid order that is still open
// Admin: confirm a paid order that is still open, and make sure download tokens exist
async function markCompleted(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(`UPDATE orders SET status = 'completed' WHERE id = ?`, [id]);

    const [items] = await connection.execute(
      'SELECT id, product_id FROM order_items WHERE order_id = ?',
      [id]
    );
    const settingsModel = require('./settings.model');
    const downloadModel = require('./download.model');
    const settings = await settingsModel.getMany(['download_max_count', 'download_expiry_days']);
    const maxDownloads = Number(settings.download_max_count) || 5;
    const expiryDays = Number(settings.download_expiry_days) || 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await downloadModel.createForOrder(connection, id, items, { maxDownloads, expiresAt });

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Admin: record a refund on the order and its successful payments
async function refund(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE orders SET status = 'refunded', payment_status = 'refunded' WHERE id = ?`,
      [id]
    );
    await connection.execute(
      `UPDATE payments SET status = 'refunded' WHERE order_id = ? AND status = 'success'`,
      [id]
    );
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function findBasicById(id) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.order_number, o.total, o.user_id, u.name AS customer_name
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// Everything needed to build/update the Telegram message for one order
async function findForTelegram(id) {
  const [rows] = await pool.execute(
    `SELECT o.id, o.order_number, o.total, o.payment_status, o.telegram_message_id,
            o.created_at, u.name AS customer_name
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function setTelegramMessageId(id, messageId) {
  await pool.execute('UPDATE orders SET telegram_message_id = ? WHERE id = ?', [messageId, id]);
}

module.exports = {
  createWithItems,
  listByUser,
  findByIdForUser,
  adminList,
  adminFindById,
  cancel,
  markCompleted,
  refund,
  findBasicById,
  findForTelegram,
  setTelegramMessageId,
};