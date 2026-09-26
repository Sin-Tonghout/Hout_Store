const productModel = require('../models/product.model');
const productService = require('../services/product.service');
const { removeUploadedFiles } = require('../middleware/upload.middleware');
const { success } = require('../utils/response');
const AppError = require('../utils/appError');
const { toInt, toText } = require('../utils/query');

// ---------- Public ----------

async function list(req, res) {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(48, Math.max(1, toInt(req.query.limit, 12)));

  const { products, total } = await productModel.list({
    search: toText(req.query.search, 100),
    category: toText(req.query.category, 120),
    featured: req.query.featured === '1',
    sort: toText(req.query.sort, 20) || 'newest',
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

async function getBySlug(req, res) {
  const product = await productModel.findPublishedBySlug(req.params.slug);
  if (!product) throw new AppError('Product not found', 404);

  const related = await productModel.findRelated(product, 4);
  return success(res, { product, related });
}

// ---------- Admin ----------

async function create(req, res) {
  try {
    const id = await productService.create(req.body, req.files || {});
    const product = await productModel.findAdminById(id);
    return success(res, { product }, 'Product created', 201);
  } finally {
    await removeUploadedFiles(req); // removes leftover temp files (if any)
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  try {
    await productService.update(id, req.body, req.files || {});
    const product = await productModel.findAdminById(id);
    return success(res, { product }, 'Product updated');
  } finally {
    await removeUploadedFiles(req);
  }
}

async function setStatus(req, res) {
  await productService.setStatus(Number(req.params.id), req.body.status);
  return success(res, null, 'Status updated');
}

async function remove(req, res) {
  await productService.remove(Number(req.params.id));
  return success(res, null, 'Product deleted');
}

module.exports = { list, getBySlug, create, update, setStatus, remove };