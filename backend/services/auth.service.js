const userModel = require('../models/user.model');
const passwordResetModel = require('../models/passwordReset.model');
const { hashPassword, comparePassword, DUMMY_HASH, generateResetToken, hashResetToken } = require('../utils/hash');
const { verifyTelegramAuth } = require('../utils/telegramAuth');
const AppError = require('../utils/appError');
const config = require('../config/env');
const telegramService = require('./telegram.service');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

async function register({ name, email, password }) {
  const existing = await userModel.findByEmail(email);
  if (existing) throw new AppError('This email is already registered', 409);

  const passwordHash = await hashPassword(password);

  try {
    // Role is always "customer" here. It is never taken from the request.
    return await userModel.create({ name, email, passwordHash, role: 'customer' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError('This email is already registered', 409);
    }
    throw err;
  }
}

async function login({ email, password }) {
  const user = await userModel.findByEmail(email);

  const passwordOk = await comparePassword(
    password,
    user && user.password_hash ? user.password_hash : DUMMY_HASH
  );

  if (!user || !user.password_hash || !passwordOk) {
    throw new AppError('Invalid email or password', 401);
  }
  if (user.status !== 'active') {
    throw new AppError('This account is suspended', 403);
  }

  return userModel.findById(user.id);
}

// Verifies a Google OAuth access token against Google's own servers (never
// trust the profile data the browser hands us directly), then finds or
// creates the matching local account.
async function googleLogin({ accessToken }) {
  if (!config.google.clientId) {
    throw new AppError('Google sign-in is not configured', 501);
  }
  if (!accessToken) {
    throw new AppError('Missing Google access token', 400);
  }

  const tokenInfoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  const tokenInfo = await tokenInfoRes.json().catch(() => null);

  if (!tokenInfoRes.ok || !tokenInfo || tokenInfo.aud !== config.google.clientId) {
    throw new AppError('Invalid Google sign-in', 401);
  }

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await userInfoRes.json().catch(() => null);

  if (!userInfoRes.ok || !profile || !profile.sub) {
    throw new AppError('Could not read Google profile', 401);
  }
  if (!profile.email || profile.email_verified !== true) {
    throw new AppError('Your Google email is not verified', 401);
  }

  let user = await userModel.findByGoogleId(profile.sub);

  if (!user) {
    const existingByEmail = await userModel.findByEmail(profile.email);
    if (existingByEmail) {
      user = await userModel.linkGoogleId(existingByEmail.id, profile.sub);
    } else {
      user = await userModel.createSocialUser({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        googleId: profile.sub,
      });
    }
  }

  if (user.status !== 'active') {
    throw new AppError('This account is suspended', 403);
  }

  return userModel.findById(user.id);
}

// Verifies the signed payload from the Telegram Login Widget, then finds or
// creates the matching local account.
async function telegramLogin(payload) {
  if (!verifyTelegramAuth(payload)) {
    throw new AppError('Invalid Telegram sign-in', 401);
  }

  const telegramId = Number(payload.id);
  let user = await userModel.findByTelegramId(telegramId);

  if (!user) {
    const name = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || 'Telegram user';
    user = await userModel.createSocialUser({ name, telegramId });
  }

  if (user.status !== 'active') {
    throw new AppError('This account is suspended', 403);
  }

  return userModel.findById(user.id);
}

// Always resolves the same way whether or not the email exists, so the
// response can't be used to check which emails are registered.
async function requestPasswordReset(email) {
  const user = await userModel.findByEmail(email);
  if (!user) return;

  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await passwordResetModel.create({ userId: user.id, tokenHash, expiresAt });

  const resetUrl = `${config.appUrl}/reset-password?token=${rawToken}`;
  await telegramService.sendPasswordResetRequest({ name: user.name, email: user.email, resetUrl });
}

async function resetPassword({ token, password }) {
  if (!token) throw new AppError('Missing reset token', 400);

  const tokenHash = hashResetToken(token);
  const record = await passwordResetModel.findValidByTokenHash(tokenHash);
  if (!record) throw new AppError('This reset link is invalid or has expired', 400);

  const passwordHash = await hashPassword(password);
  await userModel.updatePassword(record.user_id, passwordHash);
  await passwordResetModel.markUsed(record.id);

  return userModel.findById(record.user_id);
}

module.exports = { register, login, googleLogin, telegramLogin, requestPasswordReset, resetPassword };