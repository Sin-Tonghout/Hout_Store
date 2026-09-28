const crypto = require("crypto");
const { pool } = require("../config/database");
const settingsModel = require("./settings.model");
const downloadModel = require("./download.model");
const telegramService = require("../services/telegram.service");
const orderModel = require("./order.model");

async function listByOrderId(orderId) {
  const [rows] = await pool.execute(
    `SELECT id, payment_method, provider, transaction_id, amount, currency,
            status, paid_at, created_at
       FROM payments
      WHERE order_id = ?
      ORDER BY created_at DESC, id DESC`,
    [orderId],
  );
  return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

// Customers can only read payments of their own orders
async function findByIdForUser(id, userId) {
  const [rows] = await pool.execute(
    `SELECT p.id, p.order_id, p.payment_method, p.provider, p.transaction_id,
            p.amount, p.currency, p.status, p.paid_at, p.created_at
       FROM payments p
       JOIN orders o ON o.id = p.order_id
      WHERE p.id = ? AND o.user_id = ?
      LIMIT 1`,
    [id, userId],
  );
  return rows[0] ? { ...rows[0], amount: Number(rows[0].amount) } : null;
}

// Saves one payment attempt AND updates the order in one transaction.
// The order row is locked, so two clicks at the same time cannot both succeed.
async function recordAttempt({ orderId, userId, method, provider, outcome }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `SELECT id, status, payment_status, total, currency
         FROM orders
        WHERE id = ? AND user_id = ?
        FOR UPDATE`,
      [orderId, userId],
    );
    const order = orders[0];

    if (!order) {
      await connection.rollback();
      return { error: "not_found" };
    }
    if (order.payment_status === "success") {
      await connection.rollback();
      return { error: "already_paid" };
    }
    if (order.status !== "pending") {
      await connection.rollback();
      return { error: "not_payable" };
    }

    const transactionId = `TXN-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const isSuccess = outcome === "success";

    const [result] = await connection.execute(
      `INSERT INTO payments
        (order_id, payment_method, provider, transaction_id, amount, currency,
         status, provider_response, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        method,
        provider,
        transactionId,
        order.total,
        order.currency,
        outcome,
        JSON.stringify({ simulated: true, outcome }),
        isSuccess ? new Date() : null,
      ],
    );

    if (isSuccess) {
      await connection.execute(
        `UPDATE orders SET status = 'completed', payment_status = 'success' WHERE id = ?`,
        [orderId],
      );

      const [items] = await connection.execute(
        "SELECT id, product_id FROM order_items WHERE order_id = ?",
        [orderId],
      );
      const settings = await settingsModel.getMany([
        "download_max_count",
        "download_expiry_days",
      ]);
      const maxDownloads = Number(settings.download_max_count) || 5;
      const expiryDays = Number(settings.download_expiry_days) || 7;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

      await downloadModel.createForOrder(connection, orderId, items, {
        maxDownloads,
        expiresAt,
      });
    } else {
      // failed or cancelled: the order stays open so the customer can try again
      await connection.execute(
        "UPDATE orders SET payment_status = ? WHERE id = ?",
        [outcome, orderId],
      );
    }

    await connection.commit();

    // Sent after commit, so a Telegram problem never affects the payment result
    if (outcome === "success" || outcome === "failed") {
      notifyPaymentResult(orderId, outcome, transactionId).catch((err) =>
        console.error("[notifyPaymentResult]", err),
      );
    }

    return { paymentId: result.insertId, transactionId, outcome };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function notifyPaymentResult(orderId, outcome, transactionId) {
  const order = await orderModel.findForTelegram(orderId);
  if (!order) return;

  const items = await pool
    .execute("SELECT product_name FROM order_items WHERE order_id = ?", [
      orderId,
    ])
    .then(([rows]) => rows);

  // Which method was actually used for this payment attempt
  const [paymentRows] = await pool.execute(
    `SELECT payment_method FROM payments
      WHERE order_id = ? AND transaction_id = ?
      LIMIT 1`,
    [orderId, transactionId],
  );
  const paymentMethod = paymentRows[0] ? paymentRows[0].payment_method : null;

  const result = await telegramService.updateOrderStatus({
    messageId: order.telegram_message_id,
    order,
    items,
    paymentMethod,
    paymentMethodLabel: paymentMethod ? undefined : "Unknown",
    paymentStatus: outcome,
    transactionId: outcome === "success" ? transactionId : null,
    placedAt: order.created_at,
  });

  // editMessageText can return a NEW message id if it had to fall back to
  // sending a fresh message, so keep the stored id in sync
  if (result.ok && result.messageId !== order.telegram_message_id) {
    await orderModel.setTelegramMessageId(orderId, result.messageId);
  }
}

// Creates a pending payment row before redirecting the customer to a
// hosted checkout page. Used by ABA PayWay.
async function createPending({
  orderId,
  method,
  provider,
  transactionId,
  amount,
  currency,
}) {
  const [result] = await pool.execute(
    `INSERT INTO payments
      (order_id, payment_method, provider, transaction_id, amount, currency, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [orderId, method, provider, transactionId, amount, currency],
  );
  return result.insertId;
}

// Confirms or rejects a pending external payment (e.g. after ABA's Check
// Transaction API responds), locking the order row exactly like the demo flow.
async function finalizePending({ orderId, userId, transactionId, outcome }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `SELECT id, status, payment_status, total, currency FROM orders
        WHERE id = ? AND user_id = ? FOR UPDATE`,
      [orderId, userId],
    );
    const order = orders[0];
    if (!order) {
      await connection.rollback();
      return { error: "not_found" };
    }
    if (order.payment_status === "success") {
      await connection.rollback();
      return { error: "already_paid" };
    }

    const isSuccess = outcome === "success";

    await connection.execute(
      `UPDATE payments SET status = ?, paid_at = ? WHERE order_id = ? AND transaction_id = ?`,
      [outcome, isSuccess ? new Date() : null, orderId, transactionId],
    );

    if (isSuccess) {
      await connection.execute(
        `UPDATE orders SET status = 'completed', payment_status = 'success' WHERE id = ?`,
        [orderId],
      );

      const [items] = await connection.execute(
        "SELECT id, product_id FROM order_items WHERE order_id = ?",
        [orderId],
      );
      const settings = await settingsModel.getMany([
        "download_max_count",
        "download_expiry_days",
      ]);
      const maxDownloads = Number(settings.download_max_count) || 5;
      const expiryDays = Number(settings.download_expiry_days) || 7;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
      await downloadModel.createForOrder(connection, orderId, items, {
        maxDownloads,
        expiresAt,
      });
    } else if (order.status === "pending") {
      await connection.execute(
        "UPDATE orders SET payment_status = ? WHERE id = ?",
        [outcome, orderId],
      );
    }

    await connection.commit();

    if (outcome === "success" || outcome === "failed") {
      notifyPaymentResult(orderId, outcome, transactionId).catch((err) =>
        console.error("[notifyPaymentResult]", err),
      );
    }

    return { ok: true, outcome };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  listByOrderId,
  findByIdForUser,
  recordAttempt,
  createPending,
  finalizePending,
};