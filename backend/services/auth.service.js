const userModel = require('../models/user.model');
const { hashPassword, comparePassword, DUMMY_HASH } = require('../utils/hash');
const AppError = require('../utils/appError');

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
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user || !passwordOk) {
    throw new AppError('Invalid email or password', 401);
  }
  if (user.status !== 'active') {
    throw new AppError('This account is suspended', 403);
  }

  return userModel.findById(user.id);
}

module.exports = { register, login };