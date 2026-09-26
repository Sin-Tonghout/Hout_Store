const authService = require('../services/auth.service');
const { success } = require('../utils/response');
const { SESSION_COOKIE_NAME } = require('../config/session');

// A new session id is created on login to prevent session fixation.
// The guest cart is kept so it is still there after logging in.
function startSession(req, user) {
  const cart = req.session.cart;

  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      if (cart) req.session.cart = cart;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

async function register(req, res) {
  const { name, email, password } = req.body;
  const user = await authService.register({ name, email, password });
  await startSession(req, user);
  return success(res, { user }, 'Registration successful', 201);
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await authService.login({ email, password });
  await startSession(req, user);
  return success(res, { user }, 'Login successful');
}

async function logout(req, res) {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME);
  return success(res, null, 'Logged out');
}

async function me(req, res) {
  return success(res, { user: req.user });
}

module.exports = { register, login, logout, me };