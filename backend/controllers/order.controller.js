const orderService = require('../services/order.service');
const orderModel = require('../models/order.model');
const { success } = require('../utils/response');
const AppError = require('../utils/appError');

async function create(req, res) {
  const orderId = await orderService.createFromCart(req.user.id, req.session);
  const order = await orderService.getForUser(orderId, req.user.id);
  return success(res, { order }, 'Order created', 201);
}

async function list(req, res) {
  const orders = await orderModel.listByUser(req.user.id);
  return success(res, { orders });
}

async function getOne(req, res) {
  const order = await orderService.getForUser(Number(req.params.id), req.user.id);
  // someone else's order looks the same as an order that does not exist
  if (!order) throw new AppError('Order not found', 404);
  return success(res, { order });
}

module.exports = { create, list, getOne };