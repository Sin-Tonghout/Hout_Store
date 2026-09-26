const orderModel = require('../models/order.model');
const orderItemModel = require('../models/orderItem.model');
const paymentModel = require('../models/payment.model');
const settingsModel = require('../models/settings.model');
const AppError = require('../utils/appError');

const METHOD_LABELS = { demo: 'Demo Payment', aba_payway: 'ABA PayWay' };

async function getReceiptForUser(orderId, userId) {
  const order = await orderModel.findByIdForUser(orderId, userId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment_status !== 'success') {
    throw new AppError('A receipt is only available once an order is paid', 409);
  }

  return buildReceipt(order, orderId);
}

async function getReceiptForAdmin(orderId) {
  const order = await orderModel.adminFindById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment_status !== 'success') {
    throw new AppError('A receipt is only available once an order is paid', 409);
  }

  return buildReceipt(order, orderId, true);
}

async function buildReceipt(order, orderId, includeEmail = false) {
  const [items, payments, settings] = await Promise.all([
    orderItemModel.listByOrderId(orderId),
    paymentModel.listByOrderId(orderId),
    settingsModel.getMany(['store_name', 'store_tagline', 'receipt_footer']),
  ]);

  // The most recent successful payment is the one the receipt is for
  const payment = payments.find((p) => p.status === 'success') || null;

  return {
    store: {
      name: settings.store_name || 'Store',
      tagline: settings.store_tagline || '',
      footer: settings.receipt_footer || 'Thank you for your purchase.',
    },
    order: {
      order_number: order.order_number,
      created_at: order.created_at,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      currency: order.currency,
      status: order.status,
      payment_status: order.payment_status,
      customer_name: order.customer_name,
      customer_email: includeEmail ? order.customer_email : undefined,
    },
    items,
    payment: payment && {
      method_label: METHOD_LABELS[payment.payment_method] || payment.payment_method,
      transaction_id: payment.transaction_id,
      paid_at: payment.paid_at,
    },
  };
}

module.exports = { getReceiptForUser, getReceiptForAdmin };