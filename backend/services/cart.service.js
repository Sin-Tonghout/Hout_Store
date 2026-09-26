const productModel = require('../models/product.model');
const AppError = require('../utils/appError');

const MAX_QUANTITY = 10;
const MAX_LINES = 50;
const CURRENCY = 'USD';

const round2 = (n) => Math.round(n * 100) / 100;

// The session only stores product ids and quantities. Never prices.
function readCart(session) {
  return Array.isArray(session.cart) ? session.cart : [];
}

function summarize(items) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
  const discount = 0; // discounts are not part of this phase
  return {
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    discount,
    total: round2(subtotal - discount),
    currency: CURRENCY,
  };
}

// Builds the full cart from the database (current prices, published products only)
async function buildCart(session) {
  const stored = readCart(session);
  if (!stored.length) return { items: [], summary: summarize([]), removed: 0 };

  const products = await productModel.findPublishedByIds(stored.map((entry) => entry.product_id));
  const byId = new Map(products.map((product) => [product.id, product]));

  const items = [];
  const kept = [];

  for (const entry of stored) {
    const product = byId.get(entry.product_id);
    if (!product) continue; // deleted or unpublished: drop it

    kept.push(entry);
    items.push({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      cover_image: product.cover_image,
      category_name: product.category_name,
      price: product.price,
      quantity: entry.quantity,
      subtotal: round2(product.price * entry.quantity),
    });
  }

  session.cart = kept;
  return { items, summary: summarize(items), removed: stored.length - kept.length };
}

async function addItem(session, productId, quantity) {
  const [product] = await productModel.findPublishedByIds([productId]);
  if (!product) throw new AppError('This product is not available', 404);

  const cart = [...readCart(session)];
  const existing = cart.find((entry) => entry.product_id === productId);

  if (existing) {
    existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
  } else {
    if (cart.length >= MAX_LINES) throw new AppError('Your cart is full', 422);
    cart.push({ product_id: productId, quantity: Math.min(MAX_QUANTITY, quantity) });
  }

  session.cart = cart;
}

function updateQuantity(session, productId, quantity) {
  const cart = [...readCart(session)];
  const existing = cart.find((entry) => entry.product_id === productId);
  if (!existing) throw new AppError('This product is not in your cart', 404);

  existing.quantity = Math.min(MAX_QUANTITY, quantity);
  session.cart = cart;
}

function removeItem(session, productId) {
  session.cart = readCart(session).filter((entry) => entry.product_id !== productId);
}

module.exports = { buildCart, addItem, updateQuantity, removeItem };