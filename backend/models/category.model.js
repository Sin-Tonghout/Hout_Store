const { pool } = require('../config/database');

async function listActive() {
  const [rows] = await pool.query(
    `SELECT c.id, c.parent_id, c.name, c.slug, c.description,
            COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p
              ON p.category_id = c.id AND p.status = 'published'
      WHERE c.status = 'active'
      GROUP BY c.id, c.parent_id, c.name, c.slug, c.description
      ORDER BY c.id ASC`
  );

  const all = rows.map((row) => ({
    ...row,
    product_count: Number(row.product_count),
    children: [],
  }));
  const byId = new Map(all.map((category) => [category.id, category]));
  const tree = [];

  for (const category of all) {
    if (category.parent_id === null) {
      tree.push(category);
    } else {
      const parent = byId.get(category.parent_id);
      if (parent) parent.children.push(category); // skipped if the parent is inactive
    }
  }

  for (const parent of tree) {
    parent.children.forEach((child) => delete child.children);
    // a parent counts its own products plus its sub-categories' products
    parent.product_count += parent.children.reduce((sum, child) => sum + child.product_count, 0);
  }

  return tree;
}

// ---------- Admin ----------

// Flat list of ALL categories, each sub-category right after its parent
async function adminList() {
  const [rows] = await pool.query(
    `SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.status,
            pc.name AS parent_name,
            (SELECT COUNT(*) FROM products x WHERE x.category_id = c.id) AS product_count
       FROM categories c
       LEFT JOIN categories pc ON pc.id = c.parent_id
      ORDER BY COALESCE(c.parent_id, c.id) ASC, (c.parent_id IS NOT NULL) ASC, c.name ASC`
  );
  return rows.map((row) => ({ ...row, product_count: Number(row.product_count) }));
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function slugTaken(slug, ignoreId = 0) {
  const [rows] = await pool.execute(
    'SELECT id FROM categories WHERE slug = ? AND id <> ? LIMIT 1',
    [slug, ignoreId]
  );
  return rows.length > 0;
}

async function countChildren(id) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM categories WHERE parent_id = ?',
    [id]
  );
  return Number(rows[0].total);
}

async function countProducts(id) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM products WHERE category_id = ?',
    [id]
  );
  return Number(rows[0].total);
}

async function insert({ parent_id, name, slug, description, status }) {
  const [result] = await pool.execute(
    'INSERT INTO categories (parent_id, name, slug, description, status) VALUES (?, ?, ?, ?, ?)',
    [parent_id, name, slug, description, status]
  );
  return result.insertId;
}

async function update(id, { parent_id, name, slug, description, status }) {
  await pool.execute(
    'UPDATE categories SET parent_id = ?, name = ?, slug = ?, description = ?, status = ? WHERE id = ?',
    [parent_id, name, slug, description, status, id]
  );
}

async function remove(id) {
  await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = {
  listActive,
  adminList,
  findById,
  slugTaken,
  countChildren,
  countProducts,
  insert,
  update,
  remove,
};