const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const { pool } = require('./config/database');
const { sessionMiddleware } = require('./config/session');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { requireAdminPage } = require('./middleware/admin.middleware');
const { requireLoginPage } = require('./middleware/auth.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const downloadRoutes = require('./routes/download.routes');

const app = express();

const frontendDir = path.join(__dirname, '../frontend');
const pagesDir = path.join(frontendDir, 'pages');
const adminDir = path.join(frontendDir, 'admin');

// Needed so secure cookies and rate limiting work correctly behind a proxy
// — Koyeb in production, and ngrok when testing locally through a tunnel.
if (config.nodeEnv === 'production' || process.env.BEHIND_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security headers. "upgrade-insecure-requests" is only enabled in production
// so plain http://localhost keeps working in every browser.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'upgrade-insecure-requests': config.nodeEnv === 'production' ? [] : null,
        'form-action': [
          "'self'",
          'https://checkout-sandbox.payway.com.kh',
          'https://checkout.payway.com.kh',
        ],
       'img-src': ["'self'", 'data:', 'https://*.r2.dev', 'https://*.r2.cloudflarestorage.com'],
      },
    },
  })
);
app.use(cors({ origin: config.appUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(sessionMiddleware);

// Health checks
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Digital Store API Running' });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    const tables = rows.map((row) => Object.values(row)[0]);
    res.json({ success: true, database: config.db.name, tables });
  } catch (err) {
    console.error('DB health check failed:', err.message);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/account', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/download', downloadRoutes);

// Static assets (only these folders are public)
app.use('/css', express.static(path.join(frontendDir, 'css')));
app.use('/js', express.static(path.join(frontendDir, 'js')));
app.use('/images', express.static(path.join(frontendDir, 'images')));
// Cover images are public. Digital product files (storage/products) are NOT.
app.use('/uploads/covers', express.static(path.join(__dirname, '../storage/covers')));

// Store pages
const sendPage = (file) => (req, res) => res.sendFile(path.join(pagesDir, file));

app.get('/', sendPage('home.html'));
app.get('/shop', sendPage('shop.html'));
app.get('/product/:slug', sendPage('product.html'));
app.get('/login', sendPage('login.html'));
app.get('/register', sendPage('register.html'));
app.get('/cart', sendPage('cart.html'));

// Pages that need a login
app.get('/checkout', requireLoginPage, sendPage('checkout.html'));
app.get('/orders', requireLoginPage, sendPage('orders.html'));
app.get('/orders/:id', requireLoginPage, sendPage('order-detail.html'));
app.get('/orders/:id/pay', requireLoginPage, sendPage('pay.html'));
app.get('/orders/:id/pay/aba', requireLoginPage, sendPage('pay-aba.html'));
app.get('/orders/:id/pay/aba/return', requireLoginPage, sendPage('pay-aba-return.html'));
app.get('/orders/:id/receipt', requireLoginPage, sendPage('receipt.html'));
app.get('/downloads', requireLoginPage, sendPage('downloads.html'));

// Admin pages (admins only)
const sendAdminPage = (file) => [
  requireAdminPage,
  (req, res) => res.sendFile(path.join(adminDir, file)),
];

app.get('/admin', requireAdminPage, (req, res) => res.redirect('/admin/dashboard'));
app.get('/admin/dashboard', sendAdminPage('dashboard.html'));
app.get('/admin/products', sendAdminPage('products.html'));
app.get('/admin/products/new', sendAdminPage('product-form.html'));
app.get('/admin/products/:id/edit', sendAdminPage('product-form.html'));
app.get('/admin/categories', sendAdminPage('categories.html'));
app.get('/admin/orders', sendAdminPage('orders.html'));
app.get('/admin/orders/:id', sendAdminPage('order-detail.html'));
app.get('/admin/orders/:id/receipt', sendAdminPage('receipt.html'));
app.get('/admin/profile', sendAdminPage('profile.html'));
app.get('/admin/telegram', sendAdminPage('telegram.html'));
app.get('/admin/settings', sendAdminPage('settings.html'));

// 404 + error handling (must stay last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;