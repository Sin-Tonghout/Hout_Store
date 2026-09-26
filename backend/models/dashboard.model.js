const { pool } = require('../config/database');

const num = (value) => Number(value) || 0;

async function getStats() {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'success') AS total_sales,
       (SELECT COUNT(*) FROM orders) AS total_orders,
       (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders,
       (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
       (SELECT COUNT(*) FROM products) AS products,
       (SELECT COUNT(*) FROM products WHERE status = 'published') AS published_products,
       (SELECT COUNT(*) FROM products WHERE status = 'draft') AS draft_products,
       (SELECT COUNT(*) FROM products WHERE status = 'archived') AS archived_products`
  );
  const r = rows[0];
  return {
    total_sales: num(r.total_sales),
    total_orders: num(r.total_orders),
    pending_orders: num(r.pending_orders),
    customers: num(r.customers),
    products: num(r.products),
    published_products: num(r.published_products),
    draft_products: num(r.draft_products),
    archived_products: num(r.archived_products),
  };
}

// One row for each of the last 7 days (days without sales show 0)
async function getSalesByDay() {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(d.day, '%Y-%m-%d') AS day,
            COALESCE(SUM(o.total), 0) AS total
       FROM (
         SELECT CURDATE() - INTERVAL 6 DAY AS day
         UNION ALL SELECT CURDATE() - INTERVAL 5 DAY
         UNION ALL SELECT CURDATE() - INTERVAL 4 DAY
         UNION ALL SELECT CURDATE() - INTERVAL 3 DAY
         UNION ALL SELECT CURDATE() - INTERVAL 2 DAY
         UNION ALL SELECT CURDATE() - INTERVAL 1 DAY
         UNION ALL SELECT CURDATE()
       ) d
       LEFT JOIN orders o
              ON DATE(o.created_at) = d.day AND o.payment_status = 'success'
      GROUP BY d.day
      ORDER BY d.day ASC`
  );
  return rows.map((row) => ({ day: row.day, total: num(row.total) }));
}

async function getRecentOrders(limit = 5) {
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.created_at,
            u.name AS customer_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({ ...row, total: num(row.total) }));
}

async function getRecentCustomers(limit = 5) {
  const [rows] = await pool.query(
    `SELECT id, name, email, created_at
       FROM users
      WHERE role = 'customer'
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
}

async function getTopProducts(limit = 5) {
  const [rows] = await pool.query(
    `SELECT oi.product_name,
            SUM(oi.quantity) AS sold,
            SUM(oi.subtotal) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.payment_status = 'success'
      GROUP BY oi.product_name
      ORDER BY sold DESC, revenue DESC
      LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({
    product_name: row.product_name,
    sold: num(row.sold),
    revenue: num(row.revenue),
  }));
}

async function getRecentPayments(limit = 5) {
  const [rows] = await pool.query(
    `SELECT p.id, p.payment_method, p.amount, p.status, p.created_at, o.order_number
       FROM payments p
       JOIN orders o ON o.id = p.order_id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({ ...row, amount: num(row.amount) }));
}

async function getDashboard() {
  const [stats, salesByDay, recentOrders, recentCustomers, topProducts, recentPayments] =
    await Promise.all([
      getStats(),
      getSalesByDay(),
      getRecentOrders(),
      getRecentCustomers(),
      getTopProducts(),
      getRecentPayments(),
    ]);

  return { stats, salesByDay, recentOrders, recentCustomers, topProducts, recentPayments };
}

module.exports = { getDashboard };