USE digital_store;

-- Remove old test orders first (safe to run again)
DELETE FROM orders WHERE order_number LIKE 'DR-2026-9%';

INSERT INTO orders (order_number, user_id, subtotal, discount, total, currency, status, payment_status, created_at)
SELECT 'DR-2026-900001', id, 37.00, 0, 37.00, 'USD', 'completed', 'success', NOW()
  FROM users WHERE role = 'customer' ORDER BY id LIMIT 1;

INSERT INTO orders (order_number, user_id, subtotal, discount, total, currency, status, payment_status, created_at)
SELECT 'DR-2026-900002', id, 29.00, 0, 29.00, 'USD', 'completed', 'success', NOW() - INTERVAL 1 DAY
  FROM users WHERE role = 'customer' ORDER BY id LIMIT 1;

INSERT INTO orders (order_number, user_id, subtotal, discount, total, currency, status, payment_status, created_at)
SELECT 'DR-2026-900003', id, 9.00, 0, 9.00, 'USD', 'pending', 'pending', NOW() - INTERVAL 3 DAY
  FROM users WHERE role = 'customer' ORDER BY id LIMIT 1;

INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, 1, p.price
  FROM orders o
  JOIN products p ON p.slug IN ('modern-portfolio-template', 'admin-dashboard-ui-kit')
 WHERE o.order_number = 'DR-2026-900001';

INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, 1, p.price
  FROM orders o
  JOIN products p ON p.slug = 'nodejs-store-starter'
 WHERE o.order_number = 'DR-2026-900002';

INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
SELECT o.id, p.id, p.name, p.price, 1, p.price
  FROM orders o
  JOIN products p ON p.slug = 'freelance-business-guide'
 WHERE o.order_number = 'DR-2026-900003';

INSERT INTO payments (order_id, payment_method, provider, transaction_id, amount, currency, status, paid_at)
SELECT id, 'demo', 'demo', CONCAT('TXN-', order_number), total, currency, payment_status,
       IF(payment_status = 'success', created_at, NULL)
  FROM orders WHERE order_number LIKE 'DR-2026-9%';


DELETE FROM orders WHERE order_number LIKE 'DR-2026-9%';