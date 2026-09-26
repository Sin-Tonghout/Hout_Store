const path = require('path');
const productModel = require('../models/product.model');
const categoryModel = require('../models/category.model');
const storage = require('./storage.service');
const AppError = require('../utils/appError');
const { buildSlug } = require('../utils/slug');

const round2 = (n) => Math.round(n * 100) / 100;
const isTrue = (value) => [1, '1', true, 'true'].includes(value);

function normalize(data) {
  const price = round2(data.price);
  const compare = data.compare_price ? round2(data.compare_price) : null;

  if (compare !== null && compare <= price) {
    throw new AppError('Compare price must be higher than the price', 422);
  }

  return {
    category_id: data.category_id || null,
    name: data.name,
    description: data.description || null,
    short_description: data.short_description || null,
    price,
    compare_price: compare,
    version: data.version || null,
    status: data.status,
    featured: isTrue(data.featured) ? 1 : 0,
  };
}

async function assertCategory(categoryId) {
  if (categoryId && !(await categoryModel.findById(categoryId))) {
    throw new AppError('Category not found', 422);
  }
}

async function create(data, files) {
  const fields = normalize(data);
  await assertCategory(fields.category_id);

  const slug = await buildSlug({
    name: fields.name,
    slug: data.slug,
    exists: (s) => productModel.slugTaken(s),
  });

  const coverFile = files.cover_image && files.cover_image[0];
  const digitalFile = files.digital_file && files.digital_file[0];

  if (fields.status === 'published' && !digitalFile) {
    throw new AppError('Upload a digital file before publishing', 422);
  }

  let coverName = null;
  let fileName = null;

  try {
    if (coverFile) {
      coverName = await storage.saveFile('covers', coverFile.path, coverFile.originalname);
    }
    if (digitalFile) {
      fileName = await storage.saveFile('products', digitalFile.path, digitalFile.originalname);
    }

    return await productModel.insert({
      ...fields,
      slug,
      cover_image: coverName ? `/uploads/covers/${coverName}` : null,
      file_name: fileName,
      file_size: digitalFile ? digitalFile.size : null,
    });
  } catch (err) {
    await storage.deleteFile('covers', coverName);
    await storage.deleteFile('products', fileName);
    throw err;
  }
}

async function update(id, data, files) {
  const existing = await productModel.findRawById(id);
  if (!existing) throw new AppError('Product not found', 404);

  const fields = normalize(data);
  await assertCategory(fields.category_id);

  let slug = existing.slug;
  if (data.slug && data.slug !== existing.slug) {
    slug = await buildSlug({
      name: fields.name,
      slug: data.slug,
      exists: (s) => productModel.slugTaken(s, id),
    });
  }

  const coverFile = files.cover_image && files.cover_image[0];
  const digitalFile = files.digital_file && files.digital_file[0];
  const removeCover = data.remove_cover === '1';

  if (fields.status === 'published' && !digitalFile && !existing.file_name) {
    throw new AppError('Upload a digital file before publishing', 422);
  }

  let newCoverName = null;
  let newFileName = null;

  try {
    let coverUrl = existing.cover_image;
    if (coverFile) {
      newCoverName = await storage.saveFile('covers', coverFile.path, coverFile.originalname);
      coverUrl = `/uploads/covers/${newCoverName}`;
    } else if (removeCover) {
      coverUrl = null;
    }

    let fileName = existing.file_name;
    let fileSize = existing.file_size;
    if (digitalFile) {
      newFileName = await storage.saveFile('products', digitalFile.path, digitalFile.originalname);
      fileName = newFileName;
      fileSize = digitalFile.size;
    }

    await productModel.update(id, {
      ...fields,
      slug,
      cover_image: coverUrl,
      file_name: fileName,
      file_size: fileSize,
    });

    // The database is updated, so the replaced old files can go now
    if ((coverFile || removeCover) && existing.cover_image) {
      await storage.deleteFile('covers', path.basename(existing.cover_image));
    }
    if (digitalFile && existing.file_name) {
      await storage.deleteFile('products', existing.file_name);
    }
  } catch (err) {
    await storage.deleteFile('covers', newCoverName);
    await storage.deleteFile('products', newFileName);
    throw err;
  }
}

async function setStatus(id, status) {
  const existing = await productModel.findRawById(id);
  if (!existing) throw new AppError('Product not found', 404);

  if (status === 'published' && !existing.file_name) {
    throw new AppError('Upload a digital file before publishing', 422);
  }

  await productModel.updateStatus(id, status);
}

async function remove(id) {
  const existing = await productModel.findRawById(id);
  if (!existing) throw new AppError('Product not found', 404);

  if ((await productModel.countOrderItems(id)) > 0) {
    throw new AppError(
      'This product has orders, so it cannot be deleted. Archive it instead.',
      409
    );
  }

  await productModel.remove(id);

  if (existing.cover_image) {
    await storage.deleteFile('covers', path.basename(existing.cover_image));
  }
  if (existing.file_name) {
    await storage.deleteFile('products', existing.file_name);
  }
}

module.exports = { create, update, setStatus, remove };