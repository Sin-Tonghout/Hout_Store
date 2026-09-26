const productModel = require("../models/product.model");
const categoryModel = require("../models/category.model");
// const { success } = require('../utils/response');
const AppError = require("../utils/appError");
const { toInt, toText } = require("../utils/query");
const dashboardModel = require("../models/dashboard.model");
const orderModel = require("../models/order.model");
const orderService = require("../services/order.service");
const telegramService = require("../services/telegram.service");
const { success, fail } = require("../utils/response");
const settingsModel = require("../models/settings.model");

async function listProducts(req, res) {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(50, Math.max(1, toInt(req.query.limit, 10)));
  const status = ["draft", "published", "archived"].includes(req.query.status)
    ? req.query.status
    : "";

  const { products, total } = await productModel.adminList({
    search: toText(req.query.search, 100),
    status,
    categoryId: toInt(req.query.category_id, 0),
    page,
    limit,
  });

  return success(res, {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

async function getProduct(req, res) {
  const product = await productModel.findAdminById(Number(req.params.id));
  if (!product) throw new AppError("Product not found", 404);
  return success(res, { product });
}

async function listCategories(req, res) {
  const categories = await categoryModel.adminList();
  return success(res, { categories });
}

async function dashboard(req, res) {
  const data = await dashboardModel.getDashboard();
  return success(res, { admin: { name: req.user.name }, ...data });
}

const ORDER_STATUSES = [
  "pending",
  "processing",
  "completed",
  "cancelled",
  "refunded",
];
const PAYMENT_STATUSES = [
  "pending",
  "success",
  "failed",
  "cancelled",
  "refunded",
];

async function listOrders(req, res) {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(50, Math.max(1, toInt(req.query.limit, 10)));

  const { orders, total } = await orderModel.adminList({
    search: toText(req.query.search, 100),
    status: ORDER_STATUSES.includes(req.query.status) ? req.query.status : "",
    paymentStatus: PAYMENT_STATUSES.includes(req.query.payment_status)
      ? req.query.payment_status
      : "",
    page,
    limit,
  });

  return success(res, {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

async function getOrder(req, res) {
  const order = await orderService.getForAdmin(Number(req.params.id));
  if (!order) throw new AppError("Order not found", 404);
  return success(res, { order });
}

async function cancelOrder(req, res) {
  await orderService.cancelByAdmin(Number(req.params.id));
  return success(res, null, "Order cancelled");
}

async function completeOrder(req, res) {
  await orderService.completeByAdmin(Number(req.params.id));
  return success(res, null, "Order marked as completed");
}

async function refundOrder(req, res) {
  await orderService.refundByAdmin(Number(req.params.id));
  return success(res, null, "Order refunded");
}

async function testTelegram(req, res) {
  if (!telegramService.isConfigured()) {
    return fail(
      res,
      "Telegram is not configured. Fill TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID and set TELEGRAM_ENABLED=true.",
      422,
    );
  }
  const result = await telegramService.sendAdminTest(req.user.name);
  if (!result.ok)
    return fail(
      res,
      "Could not send the test message. Check the server logs.",
      502,
    );
  return success(res, null, "Test message sent");
}

async function getSettings(req, res) {
  const settings = await settingsModel.getAllEditable();
  return success(res, { settings });
}

async function updateSettings(req, res) {
  await settingsModel.updateMany(req.body);
  const settings = await settingsModel.getAllEditable();
  return success(res, { settings }, "Settings saved");
}

module.exports = {
  listProducts,
  getProduct,
  listCategories,
  dashboard,
  listOrders,
  getOrder,
  cancelOrder,
  completeOrder,
  refundOrder,
  testTelegram,
  getSettings,
  updateSettings,
};
