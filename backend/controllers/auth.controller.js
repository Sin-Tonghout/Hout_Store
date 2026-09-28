const authService = require("../services/auth.service");
const userModel = require("../models/user.model");
const { success } = require("../utils/response");
const { SESSION_COOKIE_NAME, THIRTY_DAYS } = require("../config/session");
const { getBotId } = require("../utils/telegramAuth");
const config = require("../config/env");

// A new session id is created on login to prevent session fixation.
// The guest cart is kept so it is still there after logging in.
// rememberMe=true -> 30-day persistent cookie. rememberMe=false -> a
// browser-session cookie (cleared when the browser closes).
function startSession(req, user, rememberMe = false) {
  const cart = req.session.cart;

  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      if (cart) req.session.cart = cart;

      if (rememberMe) {
        req.session.cookie.maxAge = THIRTY_DAYS;
      } else {
        req.session.cookie.expires = false; // session cookie, no maxAge
      }

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
  return success(res, { user }, "Registration successful", 201);
}

async function login(req, res) {
  const { email, password, rememberMe } = req.body;
  const user = await authService.login({ email, password });
  await startSession(req, user, rememberMe === true || rememberMe === "true");
  return success(res, { user }, "Login successful");
}

async function logout(req, res) {
  await destroySession(req);
  res.clearCookie(SESSION_COOKIE_NAME);
  return success(res, null, "Logged out");
}

async function me(req, res) {
  if (!req.session || !req.session.userId) {
    return success(res, { user: null }, "Not authenticated");
  }

  const user = await userModel.findById(req.session.userId);
  if (!user || user.status !== "active") {
    if (req.session) {
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });
    }
    return success(res, { user: null }, "Not authenticated");
  }

  return success(res, { user });
}

// Public config the frontend needs to initialize the sign-in buttons.
// None of this is secret: Google client IDs and Telegram bot IDs are
// embedded in the page/widget by design.
async function googleConfig(req, res) {
  return success(res, { clientId: config.google.clientId || null });
}

async function telegramConfig(req, res) {
  return success(res, { botId: getBotId() });
}

async function google(req, res) {
  const { accessToken } = req.body;
  const user = await authService.googleLogin({ accessToken });
  await startSession(req, user, true); // social logins get a persistent cookie
  return success(res, { user }, "Login successful");
}

async function telegram(req, res) {
  const user = await authService.telegramLogin(req.body);
  await startSession(req, user, true);
  return success(res, { user }, "Login successful");
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  await authService.requestPasswordReset(email);
  // Same response whether or not the email exists, so this can't be used
  // to check which emails are registered.
  return success(
    res,
    null,
    "If that email is registered, we've sent a reset link to our team to pass on to you.",
  );
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  const user = await authService.resetPassword({ token, password });
  await startSession(req, user, false);
  return success(res, { user }, "Password updated");
}

module.exports = {
  register,
  login,
  logout,
  me,
  googleConfig,
  telegramConfig,
  google,
  telegram,
  forgotPassword,
  resetPassword,
};
