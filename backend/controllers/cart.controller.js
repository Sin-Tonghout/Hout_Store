const cartService = require('../services/cart.service');
const { success } = require('../utils/response');

async function get(req, res) {
  const cart = await cartService.buildCart(req.session);
  return success(res, { cart });
}

async function add(req, res) {
  await cartService.addItem(req.session, req.body.product_id, req.body.quantity || 1);
  const cart = await cartService.buildCart(req.session);
  return success(res, { cart }, 'Added to cart');
}

async function update(req, res) {
  cartService.updateQuantity(req.session, Number(req.params.id), req.body.quantity);
  const cart = await cartService.buildCart(req.session);
  return success(res, { cart }, 'Cart updated');
}

async function remove(req, res) {
  cartService.removeItem(req.session, Number(req.params.id));
  const cart = await cartService.buildCart(req.session);
  return success(res, { cart }, 'Removed from cart');
}

module.exports = { get, add, update, remove };