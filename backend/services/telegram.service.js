const config = require('../config/env');

const API_BASE = 'https://api.telegram.org';

function isConfigured() {
  return config.telegram.enabled && config.telegram.botToken && config.telegram.chatId;
}

// Telegram's MarkdownV2 requires these characters to be escaped wherever
// they appear in normal text, or the whole message is rejected.
const MARKDOWN_ESCAPE = /[_*[\]()~`>#+\-=|{}.!]/g;
function esc(value) {
  return String(value ?? '').replace(MARKDOWN_ESCAPE, '\\$&');
}

// Maps the payment_method value stored in the payments table to the text
// shown in Telegram. Unknown methods are shown as-is instead of silently
// falling back to "Demo Payment".
const METHOD_LABELS = {
  demo: 'Demo Payment',
  aba_payway: 'ABA PayWay',
};

function methodLabel(method) {
  return METHOD_LABELS[method] || method || 'Unknown';
}

// Callers may pass either a ready label (paymentMethodLabel) or the raw
// payment_method code (paymentMethod). The code is preferred.
function resolveLabel({ paymentMethod, paymentMethodLabel }) {
  if (paymentMethod) return methodLabel(paymentMethod);
  return paymentMethodLabel || 'Unknown';
}

async function call(method, body) {
  if (!isConfigured()) {
    console.log(`[telegram] disabled or not configured, skipping ${method}`);
    return { skipped: true };
  }

  try {
    const res = await fetch(`${API_BASE}/bot${config.telegram.botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      console.error(`[telegram] ${method} failed:`, data && data.description);
      return { ok: false };
    }
    return { ok: true, result: data.result };
  } catch (err) {
    console.error(`[telegram] ${method} error:`, err.message);
    return { ok: false };
  }
}

// Sends a brand-new message. Used only when the order is first placed.
async function sendMessage(text) {
  const res = await call('sendMessage', {
    chat_id: config.telegram.chatId,
    text,
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
  });
  return res.ok ? { ok: true, messageId: res.result.message_id } : { ok: false };
}

// Edits a message sent earlier. If the edit fails (for example the message
// was deleted, or is too old to edit), it falls back to sending a new one so
// the update is never silently lost.
async function editOrSend(messageId, text) {
  if (messageId) {
    const edited = await call('editMessageText', {
      chat_id: config.telegram.chatId,
      message_id: messageId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
    if (edited.ok) return { ok: true, messageId };
  }
  return sendMessage(text);
}

const currency = (amount) => `$${Number(amount).toFixed(2)}`;
// Times are always shown in the store's timezone, not the server's. Cloud
// hosts (Render, Koyeb) and TiDB run in UTC, which is why the time was wrong.
// Override with STORE_TIMEZONE in .env if needed.
const TIMEZONE = process.env.STORE_TIMEZONE || 'Asia/Phnom_Penh';

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return date.toLocaleString('en-GB', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const now = () => formatTime(new Date());

const STATUS_LINES = {
  pending: 'Pending',
  success: 'PAID ✅',
  failed: 'FAILED ❌',
  cancelled: 'CANCELLED',
  refunded: 'REFUNDED ↩️',
};

// One template for the whole life of the order. Only the fields that are
// known so far are shown, so a pending order has no Transaction line yet.
function buildOrderText({ order, items, paymentMethodLabel, paymentStatus, transactionId, placedAt }) {
  const productLines = items.map((item) => `• ${esc(item.product_name)}`).join('\n');

  const lines = [
    `🛒 *ORDER ${esc(order.order_number)}*`,
    '',
    `Customer:\n${esc(order.customer_name)}`,
    '',
    `Products:\n${productLines}`,
    '',
    `Total:\n${esc(currency(order.total))}`,
    '',
    `Payment:\n${esc(paymentMethodLabel)}`,
    '',
    `Status:\n${esc(STATUS_LINES[paymentStatus] || paymentStatus)}`,
  ];

  if (transactionId) {
    lines.push('', `Transaction:\n${esc(transactionId)}`);
  }

  lines.push('', `Placed:\n${esc(placedAt)}`);

  return lines.join('\n');
}

// Sends the first message for a new order (status: Pending). Returns the
// Telegram message id so it can be edited later.
// Pass paymentMethod ('demo' | 'aba_payway') or a ready paymentMethodLabel.
async function sendOrderCreated({ order, items, paymentMethod, paymentMethodLabel }) {
  const text = buildOrderText({
    order,
    items,
    paymentMethodLabel: resolveLabel({ paymentMethod, paymentMethodLabel }),
    paymentStatus: 'pending',
    transactionId: null,
    placedAt: now(),
  });
  return sendMessage(text);
}

// Edits the existing order message to show the new payment result.
// Pass paymentMethod ('demo' | 'aba_payway') or a ready paymentMethodLabel.
async function updateOrderStatus({
  messageId,
  order,
  items,
  paymentMethod,
  paymentMethodLabel,
  paymentStatus,
  transactionId,
  placedAt,
}) {
  const text = buildOrderText({
    order,
    items,
    paymentMethodLabel: resolveLabel({ paymentMethod, paymentMethodLabel }),
    paymentStatus,
    transactionId,
    placedAt: formatTime(placedAt),
  });
  return editOrSend(messageId, text);
}

async function sendAdminTest(adminName) {
  const text = `🔔 *Test notification*\n\nSent by ${esc(adminName)} at ${esc(now())}\\.\nIf you see this, Telegram notifications are working\\.`;
  return sendMessage(text);
}

// Password resets are admin-mediated: there's no email service configured,
// so the reset link is sent to the admin chat and the admin passes it on to
// the customer through whatever channel they normally use.
async function sendPasswordResetRequest({ name, email, resetUrl }) {
  const text = [
    `🔑 *PASSWORD RESET REQUESTED*`,
    '',
    `Customer:\n${esc(name)}`,
    `Email:\n${esc(email)}`,
    '',
    `Reset link \\(valid 1 hour\\):\n${esc(resetUrl)}`,
    '',
    `Send this link to the customer to let them set a new password\\.`,
  ].join('\n');
  return sendMessage(text);
}

module.exports = {
  isConfigured,
  methodLabel,
  sendOrderCreated,
  updateOrderStatus,
  sendAdminTest,
  sendPasswordResetRequest,
};