const userModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/hash');
const AppError = require('../utils/appError');

async function updateName(userId, name) {
  await userModel.updateName(userId, name);
  return userModel.findById(userId);
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await userModel.findAuthById(userId);
  if (!user) throw new AppError('User not found', 404);

  const matches = await comparePassword(currentPassword, user.password_hash);
  if (!matches) throw new AppError('Current password is incorrect', 422);

  if (currentPassword === newPassword) {
    throw new AppError('The new password must be different from the current one', 422);
  }

  await userModel.updatePassword(userId, await hashPassword(newPassword));
}

module.exports = { updateName, changePassword };