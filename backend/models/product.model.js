const path = require('path');
const { pool } = require('../config/database');
const { coverUrl } = require('../services/storage.service');
// Only these sort options are allowed (never put user text into ORDER BY)
const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price ASC, p.id DESC',
  price_desc: 'p.price DESC, p.id DESC',
  name: 'p.name ASC',
};

const LIST_FIELDS = `p.id, p.name, p.slug, p.short_description, p.price,
  p.compare_price, p.cover_image, p.featured,
  c.name AS category_name, c.slug AS category_slug,
  pc.name AS parent_category_name, pc.slug AS parent_category_slug`;

const FROM_JOIN = `FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories pc ON pc.id = c.parent_id`;

function mapProduct(row) {
  return {
    ...row,
    cover_image: coverUrl(row.cover_image),
    price: Number(row.price),
    compare_price: row.compare_price === null ? null : Number(row.compare_price),
    featured: Boolean(row.featured),
  };
}

// The real file name is never sent to the browser, only the file type
function mapDetail(row) {
  const { file_name, ...rest } = row;
  const ext = file_name ? path.extname(file_name).replace('.', '').toUpperCase() : '';
  return {
    ...mapProduct(rest),   // <- this already calls mapProduct, which now wraps cover_image, so mapDetail needs NO extra edit
    file_type: ext || null,
    file_size: row.file_size === null ? null : Number(row.file_size),
  };
}

async function list({ search, category, featured, sort, page, limit }) {
  const where = ["p.status = 'published'"];
  const params = [];

  if (search) {
    // escape % and _ so users cannot use them as wildcards
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    where.push('(p.name LIKE ? OR p.short_description LIKE ?)');
    params.push(like, like);
  }
  if (category) {
    // a parent category also matches products in its sub-categories
    where.push('(c.slug = ? OR pc.slug = ?)');
    params.push(category, category);
  }
  if (featured) {
    where.push('p.featured = 1');
  }

  const whereSql = where.join(' AND ');
  const orderSql = SORTS[sort] || SORTS.newest;
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total ${FROM_JOIN} WHERE ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT ${LIST_FIELDS} ${FROM_JOIN}
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { products: rows.map(mapProduct), total: Number(countRows[0].total) };
}

async function findPublishedBySlug(slug) {
  const [rows] = await pool.execute(
    `SELECT p.id, p.category_id, p.name, p.slug, p.description,
            p.short_description, p.price, p.compare_price, p.cover_image,
            p.file_name, p.file_size, p.version, p.featured, p.created_at,
            c.name AS category_name, c.slug AS category_slug,
            pc.name AS parent_category_name, pc.slug AS parent_category_slug
       ${FROM_JOIN}
      WHERE p.slug = ? AND p.status = 'published'
      LIMIT 1`,
    [slug]
  );
  return rows[0] ? mapDetail(rows[0]) : null;
}

// Same category first, then other products
async function findRelated(product, limit = 4) {
  const [rows] = await pool.query(
    `SELECT ${LIST_FIELDS} ${FROM_JOIN}
      WHERE p.status = 'published' AND p.id <> ?
      ORDER BY (p.category_id = ?) DESC, p.featured DESC, p.created_at DESC
      LIMIT ?`,
    [product.id, product.category_id, limit]
  );
  return rows.map(mapProduct);
}

// ---------- Admin ----------

// The stored file name is never sent to the browser
function mapAdmin(row) {
  const { file_name, ...rest } = row;
  return {
    ...rest,
    cover_image: coverUrl(row.cover_image),
    price: Number(row.price),
    compare_price: row.compare_price === null ? null : Number(row.compare_price),
    featured: Boolean(row.featured),
    has_file: Boolean(file_name),
    file_type: file_name ? path.extname(file_name).replace('.', '').toUpperCase() : null,
    file_size: row.file_size === null ? null : Number(row.file_size),
  };
}

async function adminList({ search, status, categoryId, page, limit }) {
  const where = ['1 = 1'];
  const params = [];

  if (search) {
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    where.push('(p.name LIKE ? OR p.slug LIKE ?)');
    params.push(like, like);
  }
  if (status) {
    where.push('p.status = ?');
    params.push(status);
  }
  if (categoryId) {
    where.push('(p.category_id = ? OR c.parent_id = ?)');
    params.push(categoryId, categoryId);
  }

  const whereSql = where.join(' AND ');
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT p.id, p.category_id, p.name, p.slug, p.price, p.compare_price,
            p.cover_image, p.file_name, p.file_size, p.version, p.status,
            p.featured, p.created_at, p.updated_at,
            c.name AS category_name,
            pc.name AS parent_category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
      WHERE ${whereSql}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { products: rows.map(mapAdmin), total: Number(countRows[0].total) };
}

// Raw row, used by the service (needs the real file name)
async function findRawById(id) {
  const [rows] = await pool.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findAdminById(id) {
  const [rows] = await pool.execute(
    `SELECT p.*, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapAdmin(rows[0]) : null;
}

async function slugTaken(slug, ignoreId = 0) {
  const [rows] = await pool.execute(
    'SELECT id FROM products WHERE slug = ? AND id <> ? LIMIT 1',
    [slug, ignoreId]
  );
  return rows.length > 0;
}

async function insert(d) {
  const [result] = await pool.execute(
    `INSERT INTO products
      (category_id, name, slug, description, short_description, price, compare_price,
       cover_image, file_name, file_size, version, status, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.category_id, d.name, d.slug, d.description, d.short_description, d.price,
      d.compare_price, d.cover_image, d.file_name, d.file_size, d.version,
      d.status, d.featured,
    ]
  );
  return result.insertId;
}

async function update(id, d) {
  await pool.execute(
    `UPDATE products SET
       category_id = ?, name = ?, slug = ?, description = ?, short_description = ?,
       price = ?, compare_price = ?, cover_image = ?, file_name = ?, file_size = ?,
       version = ?, status = ?, featured = ?
     WHERE id = ?`,
    [
      d.category_id, d.name, d.slug, d.description, d.short_description, d.price,
      d.compare_price, d.cover_image, d.file_name, d.file_size, d.version,
      d.status, d.featured, id,
    ]
  );
}

async function updateStatus(id, status) {
  await pool.execute('UPDATE products SET status = ? WHERE id = ?', [status, id]);
}

async function remove(id) {
  await pool.execute('DELETE FROM products WHERE id = ?', [id]);
}

async function countOrderItems(productId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM order_items WHERE product_id = ?',
    [productId]
  );
  return Number(rows[0].total);
}

// Used by the cart: current price and details of published products
async function findPublishedByIds(ids) {
  if (!ids.length) return [];
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug, p.price, p.cover_image, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'published' AND p.id IN (?)`,
    [ids]
  );
  return rows.map((row) => ({ ...row, price: Number(row.price) }));
}

module.exports = {
  list,
  findPublishedBySlug,
  findRelated,
  findPublishedByIds,
  adminList,
  findRawById,
  findAdminById,
  slugTaken,
  insert,
  update,
  updateStatus,
  remove,
  countOrderItems,
};