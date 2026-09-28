const cartService = require('./cart.service');
const orderModel = require('../models/order.model');
const orderItemModel = require('../models/orderItem.model');
const paymentModel = require('../models/payment.model');
const AppError = require('../utils/appError');
const telegramService = require('./telegram.service');

// paymentMethod is optional: at checkout the customer has usually not paid yet,
// so the first Telegram message says "Not selected yet". The message is edited
// later with the real method once a payment attempt is made.
async function createFromCart(userId, session, paymentMethod = null) {
  const cart = await cartService.buildCart(session);

  if (!cart.items.length) {
    throw new AppError('Your cart is empty', 400);
  }
  if (cart.removed > 0) {
    throw new AppError(
      'Some items in your cart are no longer available. Please review your cart.',
      409
    );
  }

  const orderId = await orderModel.createWithItems({
    userId,
    subtotal: cart.summary.subtotal,
    discount: cart.summary.discount,
    total: cart.summary.total,
    currency: cart.summary.currency,
    items: cart.items,
  });

  session.cart = []; // the cart is empty after a successful order

  // A Telegram problem must never break checkout for the customer
  notifyOrderCreated(orderId, cart.items, paymentMethod).catch((err) =>
    console.error('[notifyOrderCreated]', err)
  );

  return orderId;
}

async function notifyOrderCreated(orderId, items, paymentMethod) {
  const order = await orderModel.findForTelegram(orderId);
  if (!order) return;

  const result = await telegramService.sendOrderCreated({
    order,
    items,
    paymentMethod, // 'demo' | 'aba_payway' | null
    paymentMethodLabel: paymentMethod ? undefined : 'Not selected yet',
  });
  if (result.ok) {
    await orderModel.setTelegramMessageId(orderId, result.messageId);
  }
}

async function getForUser(orderId, userId) {
  const order = await orderModel.findByIdForUser(orderId, userId);
  if (!order) return null;

  const items = await orderItemModel.listByOrderIdWithDownload(orderId);
  return { ...order, items };
}

// ---------- Admin ----------

async function getForAdmin(orderId) {
  const order = await orderModel.adminFindById(orderId);
  if (!order) return null;

  const [items, payments] = await Promise.all([
    orderItemModel.listByOrderId(orderId),
    paymentModel.listByOrderId(orderId),
  ]);
  return { ...order, items, payments };
}

// Only unpaid orders that are still open can be cancelled
async function cancelByAdmin(orderId) {
  const order = await orderModel.adminFindById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const isOpen = ['pending', 'processing'].includes(order.status);
  if (!isOpen || order.payment_status === 'success') {
    throw new AppError('Only unpaid, open orders can be cancelled', 409);
  }

  await orderModel.cancel(orderId);
}

// A paid order that is still open (for example stuck in "processing")
async function completeByAdmin(orderId) {
  const order = await orderModel.adminFindById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const isOpen = ['pending', 'processing'].includes(order.status);
  if (order.payment_status !== 'success' || !isOpen) {
    throw new AppError('Only paid orders that are not completed yet can be marked completed', 409);
  }

  await orderModel.markCompleted(orderId);
}

// Updates the store records. Sending money back is done in the payment provider.
async function refundByAdmin(orderId) {
  const order = await orderModel.adminFindById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  if (order.status !== 'completed' || order.payment_status !== 'success') {
    throw new AppError('Only paid, completed orders can be refunded', 409);
  }

  await orderModel.refund(orderId);
  notifyRefund(orderId).catch((err) => console.error('[notifyRefund]', err));
}

async function notifyRefund(orderId) {
  const order = await orderModel.findForTelegram(orderId);
  if (!order) return;

  const [items, payments] = await Promise.all([
    orderItemModel.listByOrderId(orderId),
    paymentModel.listByOrderId(orderId),
  ]);

  // The payment that was actually paid (listByOrderId is newest first)
  const paidPayment = payments.find((p) => p.status === 'success') || payments[0];

  const result = await telegramService.updateOrderStatus({
    messageId: order.telegram_message_id,
    order,
    items,
    paymentMethod: paidPayment ? paidPayment.payment_method : null,
    paymentMethodLabel: paidPayment ? undefined : 'Unknown',
    paymentStatus: 'refunded',
    transactionId: null,
    placedAt: order.created_at,
  });

  if (result.ok && result.messageId !== order.telegram_message_id) {
    await orderModel.setTelegramMessageId(orderId, result.messageId);
  }
}

module.exports = {
  createFromCart,
  getForUser,
  getForAdmin,
  cancelByAdmin,
  completeByAdmin,
  refundByAdmin,
};