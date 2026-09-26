const userModel = require('../models/user.model');
const { requireAuth } = require('./auth.middleware');
const { fail } = require('../utils/response');

function requireRole(...roles) {
  return [
    requireAuth,
    (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return fail(res, 'You do not have permission to do this', 403);
      }
      next();
    },
  ];
}

const requireAdmin = requireRole('admin', 'super_admin');
const requireSuperAdmin = requireRole('super_admin');

// For admin HTML pages: send the visitor to the right place
async function requireAdminPage(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }

  const user = await userModel.findById(req.session.userId);
  if (!user || user.status !== 'active') return res.redirect('/login');
  if (!['admin', 'super_admin'].includes(user.role)) return res.redirect('/');

  req.user = user;
  next();
}

module.exports = { requireAdmin, requireSuperAdmin, requireAdminPage };