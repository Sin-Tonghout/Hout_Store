const config = require('../config/env');
const paymentModel = require('../models/payment.model');
const orderModel = require('../models/order.model');
const paywayService = require('./payway.service');
const AppError = require('../utils/appError');
const QRCode = require('qrcode');

const DEMO_OUTCOMES = ['success', 'failed', 'cancelled'];

async function payDemo(userId, orderId, outcome) {
  if (config.paymentMode !== 'demo') {
    throw new AppError('Demo payment is turned off', 403);
  }
  if (!DEMO_OUTCOMES.includes(outcome)) {
    throw new AppError('Invalid payment result', 422);
  }

  const result = await paymentModel.recordAttempt({
    orderId,
    userId,
    method: 'demo',
    provider: 'demo',
    outcome,
  });

  if (result.error === 'not_found') throw new AppError('Order not found', 404);
  if (result.error === 'already_paid') throw new AppError('This order is already paid', 409);
  if (result.error === 'not_payable') throw new AppError('This order can no longer be paid', 409);

  return result;
}

function getForUser(paymentId, userId) {
  return paymentModel.getForUser
    ? paymentModel.getForUser(paymentId, userId)
    : paymentModel.findByIdForUser(paymentId, userId);
}

// ---------- ABA PayWay ----------

async function createAbaKhqrPurchase(userId, orderId, user) {
  const order = await orderModel.findByIdForUser(orderId, userId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment_status === 'success') throw new AppError('This order is already paid', 409);
  if (order.status !== 'pending') throw new AppError('This order can no longer be paid', 409);

  const priorPayments = await paymentModel.listByOrderId(orderId);
  const abaAttempts = priorPayments.filter((p) => p.payment_method === 'aba_payway').length;
  const tranId = paywayService.buildTranId(order.order_number, abaAttempts + 1);

  const [firstname, ...rest] = (user.name || '').split(' ');

  const result = await paywayService.generateQr({
    tranId,
    amount: order.total,
    customer: { firstname, lastname: rest.join(' '), email: user.email },
  });

  if (!result.ok || !result.raw || !result.raw.qrImage) {
    const message = (result.raw && result.raw.status && result.raw.status.message) || 'Could not get a QR code from ABA PayWay';
    throw new AppError(message, 502);
  }

  await paymentModel.createPending({
    orderId,
    method: 'aba_payway',
    provider: 'aba_payway',
    transactionId: tranId,
    amount: order.total,
    currency: order.currency,
  });

  return {
    qrImageDataUrl: result.raw.qrImage, // already a full "data:image/png;base64,..." string
    deeplink: result.raw.abapay_deeplink || null,
    tranId,
  };
}

async function createAbaPurchase(userId, orderId, user) {
  const order = await orderModel.findByIdForUser(orderId, userId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment_status === 'success') throw new AppError('This order is already paid', 409);
  if (order.status !== 'pending') throw new AppError('This order can no longer be paid', 409);

  // count previous ABA attempts on this order so a retry gets a fresh tran_id
  const priorPayments = await paymentModel.listByOrderId(orderId);
  const abaAttempts = priorPayments.filter((p) => p.payment_method === 'aba_payway').length;

  const tranId = paywayService.buildTranId(order.order_number, abaAttempts + 1);

  await paymentModel.createPending({
    orderId,
    method: 'aba_payway',
    provider: 'aba_payway',
    transactionId: tranId,
    amount: order.total,
    currency: order.currency,
  });

  const [firstname, ...rest] = (user.name || '').split(' ');

  return paywayService.buildPurchasePayload({
    tranId,
    amount: order.total,
    customer: { firstname, lastname: rest.join(' '), email: user.email },
    returnUrl: config.payway.notifyUrl || null,
    cancelUrl: `${config.appUrl}/orders/${orderId}`,
    continueSuccessUrl: `${config.appUrl}/orders/${orderId}/pay/aba/return`,
  });
}

async function verifyAbaPayment(userId, orderId) {
  const order = await orderModel.findByIdForUser(orderId, userId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment_status === 'success') return { outcome: 'success', order };

  const payments = await paymentModel.listByOrderId(orderId);
  const pending = payments.find((p) => p.payment_method === 'aba_payway' && p.status === 'pending');
  if (!pending) throw new AppError('No ABA payment attempt found for this order', 404);

  const check = await paywayService.checkTransaction(pending.transaction_id);
  if (!check.ok) throw new AppError('Could not verify the payment with ABA PayWay', 502);

  let outcome = 'pending';
  if (check.isSuccess) outcome = 'success';
  else if (check.isDeclined) outcome = 'failed';
  else if (check.isCancelled) outcome = 'cancelled';

  if (outcome === 'pending') {
    return { outcome: 'pending', order }; // caller can ask the customer to check again shortly
  }

  const result = await paymentModel.finalizePending({
    orderId,
    userId,
    transactionId: pending.transaction_id,
    outcome,
  });

  if (result.error === 'not_found') throw new AppError('Order not found', 404);
  return { outcome, order };
}

module.exports = { payDemo, getForUser, createAbaPurchase, verifyAbaPayment, createAbaKhqrPurchase, };