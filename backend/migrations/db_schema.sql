CREATE DATABASE IF NOT EXISTS digital_store
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE digital_store;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin', 'super_admin') NOT NULL DEFAULT 'customer',
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (name, slug, description) VALUES
  ('Templates', 'templates', 'Website, document and design templates'),
  ('E-books', 'e-books', 'Downloadable books and guides'),
  ('Design Assets', 'design-assets', 'Graphics, mockups and design resources'),
  ('Source Code', 'source-code', 'Ready-to-use code and projects'),
  ('Courses', 'courses', 'Video and text courses'),
  ('Icons', 'icons', 'Icon packs and sets'),
  ('Presets', 'presets', 'Photo and video presets'),
  ('Documents', 'documents', 'Spreadsheets, forms and other documents');

  CREATE TABLE products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  description TEXT NULL,
  short_description VARCHAR(500) NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  compare_price DECIMAL(10,2) NULL,
  cover_image VARCHAR(255) NULL,
  file_name VARCHAR(255) NULL,
  file_size BIGINT UNSIGNED NULL,
  version VARCHAR(30) NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category (category_id),
  KEY idx_products_status (status),
  KEY idx_products_featured (featured),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(30) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status ENUM('pending', 'processing', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  payment_status ENUM('pending', 'success', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status),
  KEY idx_orders_payment_status (payment_status),
  KEY idx_orders_created (created_at),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  product_name VARCHAR(200) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  subtotal DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  provider VARCHAR(50) NULL,
  transaction_id VARCHAR(100) NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status ENUM('pending', 'success', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  provider_response LONGTEXT NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_order (order_id),
  KEY idx_payments_status (status),
  KEY idx_payments_transaction (transaction_id),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE downloads (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  order_item_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  download_token VARCHAR(64) NOT NULL,
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  max_downloads INT UNSIGNED NOT NULL DEFAULT 5,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_downloads_token (download_token),
  KEY idx_downloads_order (order_id),
  KEY idx_downloads_order_item (order_item_id),
  KEY idx_downloads_product (product_id),
  CONSTRAINT fk_downloads_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_downloads_order_item
    FOREIGN KEY (order_item_id) REFERENCES order_items (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_downloads_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO settings (setting_key, setting_value) VALUES
  ('store_name', 'Hout Store'),
  ('store_tagline', 'Digital Products'),
  ('currency', 'USD'),
  ('receipt_footer', 'Thank you for your purchase.'),
  ('download_max_count', '5'),
  ('download_expiry_days', '7');

  ALTER TABLE categories
  ADD COLUMN parent_id INT UNSIGNED NULL AFTER id,
  ADD KEY idx_categories_parent (parent_id),
  ADD CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

    CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id INT UNSIGNED NULL,

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT NULL,

    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_categories_slug (slug),
    KEY idx_categories_status (status),
    KEY idx_categories_parent (parent_id),

    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id)
        REFERENCES categories (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

USE digital_store;

INSERT IGNORE INTO categories (parent_id, name, slug, description)
SELECT id, 'Website Templates', 'website-templates', 'Templates for websites and dashboards'
  FROM categories WHERE slug = 'templates';

INSERT IGNORE INTO categories (parent_id, name, slug, description)
SELECT id, 'Presentation Templates', 'presentation-templates', 'Slide deck templates'
  FROM categories WHERE slug = 'templates';

INSERT IGNORE INTO categories (parent_id, name, slug, description)
SELECT id, 'Business E-books', 'business-ebooks', 'Guides for running a business'
  FROM categories WHERE slug = 'e-books';

INSERT IGNORE INTO categories (parent_id, name, slug, description)
SELECT id, 'Design E-books', 'design-ebooks', 'Guides about design'
  FROM categories WHERE slug = 'e-books';

INSERT IGNORE INTO categories (parent_id, name, slug, description)
SELECT id, 'Mockups', 'mockups', 'Editable mockups'
  FROM categories WHERE slug = 'design-assets';

INSERT IGNORE INTO categories (parent_id, name, slug, description)
SELECT id, 'Web Apps', 'web-apps', 'Source code for web applications'
  FROM categories WHERE slug = 'source-code';

INSERT IGNORE INTO categories (parent_id, name, slug, description)
SELECT id, 'Mobile Apps', 'mobile-apps', 'Source code for mobile applications'
  FROM categories WHERE slug = 'source-code';

-- Move some sample products into sub-categories
UPDATE products
   SET category_id = (SELECT id FROM categories WHERE slug = 'website-templates')
 WHERE slug IN ('modern-portfolio-template', 'admin-dashboard-ui-kit');

UPDATE products
   SET category_id = (SELECT id FROM categories WHERE slug = 'business-ebooks')
 WHERE slug = 'freelance-business-guide';

UPDATE products
   SET category_id = (SELECT id FROM categories WHERE slug = 'design-ebooks')
 WHERE slug = 'complete-web-design-handbook';

UPDATE products
   SET category_id = (SELECT id FROM categories WHERE slug = 'mockups')
 WHERE slug = 'social-media-mockup-pack';

UPDATE products
   SET category_id = (SELECT id FROM categories WHERE slug = 'web-apps')
 WHERE slug = 'nodejs-store-starter';

 USE digital_store;

INSERT IGNORE INTO products
  (category_id, name, slug, short_description, description, price, compare_price, file_name, file_size, version, status, featured)
VALUES
  ((SELECT id FROM categories WHERE slug = 'templates'),
   'Modern Portfolio Template', 'modern-portfolio-template',
   'A clean, responsive portfolio website template for designers and developers.',
   'A ready-to-use portfolio template with a home page, project gallery, about page and contact section.\n\nFully responsive, fast, and easy to edit with plain HTML and CSS.',
   12.00, 20.00, 'modern-portfolio-template.zip', 18874368, '1.2.0', 'published', 1),

  ((SELECT id FROM categories WHERE slug = 'templates'),
   'Admin Dashboard UI Kit', 'admin-dashboard-ui-kit',
   'A complete admin dashboard interface with charts, tables and forms.',
   'A full dashboard UI kit with sidebar navigation, statistic cards, data tables, forms and chart layouts.\n\nBuilt to be dropped into any web project.',
   25.00, 39.00, 'admin-dashboard-ui-kit.zip', 44040192, '2.0.1', 'published', 1),

  ((SELECT id FROM categories WHERE slug = 'e-books'),
   'Freelance Business Guide', 'freelance-business-guide',
   'Find clients, set your prices and manage your freelance business.',
   'A practical guide for new freelancers covering pricing, contracts, finding clients and staying organized.\n\nWritten in simple language with checklists you can use right away.',
   9.00, NULL, 'freelance-business-guide.pdf', 6291456, '1.0', 'published', 0),

  ((SELECT id FROM categories WHERE slug = 'e-books'),
   'Complete Web Design Handbook', 'complete-web-design-handbook',
   'Layout, color, typography and UX explained step by step.',
   'A handbook covering the core principles of web design: layout, spacing, color, typography and user experience.\n\nIncludes examples and exercises for each chapter.',
   15.00, 22.00, 'web-design-handbook.pdf', 9437184, '1.1', 'published', 0),

  ((SELECT id FROM categories WHERE slug = 'design-assets'),
   'Social Media Mockup Pack', 'social-media-mockup-pack',
   'Editable mockups for posts, stories and profile banners.',
   'A pack of editable social media mockups for posts, stories and profile banners.\n\nPerfect for presenting designs to clients.',
   14.00, NULL, 'social-media-mockups.zip', 52428800, '1.0', 'published', 1),

  ((SELECT id FROM categories WHERE slug = 'source-code'),
   'Node.js Store Starter', 'nodejs-store-starter',
   'A starter project for building an online store with Node.js and Express.',
   'A well-organized Node.js and Express starter project with authentication, product management and order handling.\n\nA solid base for your next web application.',
   29.00, 49.00, 'nodejs-store-starter.zip', 31457280, '3.1.0', 'published', 1),

  ((SELECT id FROM categories WHERE slug = 'courses'),
   'Learn JavaScript From Zero', 'learn-javascript-from-zero',
   'A beginner-friendly video course that takes you from zero to building real projects.',
   'Learn JavaScript step by step with short lessons and hands-on projects.\n\nNo experience needed.',
   19.00, NULL, 'learn-javascript-course.zip', 734003200, '1.0', 'published', 0),

  ((SELECT id FROM categories WHERE slug = 'icons'),
   'Line Icon Pack (500 icons)', 'line-icon-pack-500',
   '500 consistent line icons in SVG and PNG formats.',
   'A pack of 500 consistent line icons for websites and apps.\n\nIncludes SVG and PNG files in multiple sizes.',
   8.00, NULL, 'line-icon-pack.zip', 4194304, '1.3', 'published', 0),

  ((SELECT id FROM categories WHERE slug = 'presets'),
   'Travel Photo Presets', 'travel-photo-presets',
   'Ten warm, natural presets for travel and landscape photos.',
   'A set of ten photo presets designed for travel and landscape photography.\n\nOne click for a warm, natural look.',
   7.00, 10.00, 'travel-presets.zip', 12582912, '1.0', 'published', 0),

  ((SELECT id FROM categories WHERE slug = 'documents'),
   'Invoice and Budget Spreadsheets', 'invoice-and-budget-spreadsheets',
   'Ready-made spreadsheets for invoices, budgets and expense tracking.',
   'A collection of spreadsheets for invoicing clients, planning a budget and tracking expenses.\n\nWorks with Excel and Google Sheets.',
   6.00, NULL, 'invoice-budget-spreadsheets.xlsx', 2097152, '1.0', 'published', 0),

  ((SELECT id FROM categories WHERE slug = 'templates'),
   'Draft Product (hidden)', 'draft-product-hidden',
   'This product is a draft and must not appear in the store.',
   'Used only to test that draft products stay hidden.',
   1.00, NULL, 'draft.zip', 1024, '0.1', 'draft', 0);

   ALTER TABLE categories
  ADD COLUMN parent_id INT UNSIGNED NULL AFTER id,
  ADD KEY idx_categories_parent (parent_id),
  ADD CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
    
    UPDATE users
SET role = 'admin'
WHERE id = 4;

ALTER TABLE orders
  ADD COLUMN telegram_message_id INT NULL AFTER payment_status;


  CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) unsigned NOT NULL,
  `data` mediumtext COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB;