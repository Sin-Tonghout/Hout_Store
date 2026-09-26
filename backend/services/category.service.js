const categoryModel = require('../models/category.model');
const AppError = require('../utils/appError');
const { buildSlug } = require('../utils/slug');

// Only two levels: a parent must be a top-level category
async function checkParent(parentId, selfId = null) {
  if (!parentId) return null;

  if (selfId && parentId === selfId) {
    throw new AppError('A category cannot be its own parent', 422);
  }

  const parent = await categoryModel.findById(parentId);
  if (!parent) throw new AppError('Parent category not found', 422);

  if (parent.parent_id !== null) {
    throw new AppError('Only a top-level category can be a parent', 422);
  }

  if (selfId && (await categoryModel.countChildren(selfId)) > 0) {
    throw new AppError(
      'This category has sub-categories, so it cannot become a sub-category',
      422
    );
  }

  return parent.id;
}

async function create(data) {
  const parentId = await checkParent(data.parent_id ? Number(data.parent_id) : null);

  const slug = await buildSlug({
    name: data.name,
    slug: data.slug,
    exists: (s) => categoryModel.slugTaken(s),
  });

  return categoryModel.insert({
    parent_id: parentId,
    name: data.name,
    slug,
    description: data.description || null,
    status: data.status,
  });
}

async function update(id, data) {
  const existing = await categoryModel.findById(id);
  if (!existing) throw new AppError('Category not found', 404);

  const parentId = await checkParent(data.parent_id ? Number(data.parent_id) : null, id);

  let slug = existing.slug;
  if (data.slug && data.slug !== existing.slug) {
    slug = await buildSlug({
      name: data.name,
      slug: data.slug,
      exists: (s) => categoryModel.slugTaken(s, id),
    });
  }

  await categoryModel.update(id, {
    parent_id: parentId,
    name: data.name,
    slug,
    description: data.description || null,
    status: data.status,
  });
}

async function remove(id) {
  const existing = await categoryModel.findById(id);
  if (!existing) throw new AppError('Category not found', 404);

  if ((await categoryModel.countChildren(id)) > 0) {
    throw new AppError('Delete or move its sub-categories first', 409);
  }
  if ((await categoryModel.countProducts(id)) > 0) {
    throw new AppError('Move or delete the products in this category first', 409);
  }

  await categoryModel.remove(id);
}

module.exports = { create, update, remove };