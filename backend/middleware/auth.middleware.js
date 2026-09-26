const userModel = require('../models/user.model');
const { fail } = require('../utils/response');

// Any logged-in, active user (customer pages)
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return fail(res, 'Please log in first', 401);
  }

  // Load from the database on every request so suspended users
  // and role changes take effect immediately.
  const user = await userModel.findById(req.session.userId);

  if (!user || user.status !== 'active') {
    req.session.destroy(() => {});
    return fail(res, 'Please log in first', 401);
  }

  req.user = user;
  next();
}

// For HTML pages that need a login (checkout, orders)
async function requireLoginPage(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }

  const user = await userModel.findById(req.session.userId);
  if (!user || user.status !== 'active') return res.redirect('/login');

  req.user = user;
  next();
}

module.exports = { requireAuth, requireLoginPage };