const paymentService = require('../services/payment.service');
const { success } = require('../utils/response');
const AppError = require('../utils/appError');

async function payDemo(req, res) {
  const result = await paymentService.payDemo(
    req.user.id,
    req.body.order_id,
    req.body.outcome
  );

  return success(
    res,
    {
      payment: {
        id: result.paymentId,
        transaction_id: result.transactionId,
        status: result.outcome,
      },
    },
    'Payment recorded'
  );
}

async function getOne(req, res) {
  const payment = await paymentService.getForUser(Number(req.params.id), req.user.id);
  if (!payment) throw new AppError('Payment not found', 404);
  return success(res, { payment });
}

async function abaCreate(req, res) {
  const payload = await paymentService.createAbaPurchase(req.user.id, req.body.order_id, req.user);
  return success(res, payload);
}

async function abaVerify(req, res) {
  const result = await paymentService.verifyAbaPayment(req.user.id, req.body.order_id);
  return success(res, result);
}

async function abaQr(req, res) {
  const payload = await paymentService.createAbaKhqrPurchase(req.user.id, req.body.order_id, req.user);
  return success(res, payload);
}

module.exports = { payDemo, getOne, abaCreate, abaVerify, abaQr, };