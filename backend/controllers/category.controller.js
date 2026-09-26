const categoryModel = require('../models/category.model');
const categoryService = require('../services/category.service');
const { success } = require('../utils/response');

async function list(req, res) {
  const categories = await categoryModel.listActive();
  return success(res, { categories });
}

async function create(req, res) {
  const id = await categoryService.create(req.body);
  const category = await categoryModel.findById(id);
  return success(res, { category }, 'Category created', 201);
}

async function update(req, res) {
  const id = Number(req.params.id);
  await categoryService.update(id, req.body);
  const category = await categoryModel.findById(id);
  return success(res, { category }, 'Category updated');
}

async function remove(req, res) {
  await categoryService.remove(Number(req.params.id));
  return success(res, null, 'Category deleted');
}

module.exports = { list, create, update, remove };