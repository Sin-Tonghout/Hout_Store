const accountService = require('../services/account.service');
const { success } = require('../utils/response');

async function updateProfile(req, res) {
  const user = await accountService.updateName(req.user.id, req.body.name);
  return success(res, { user }, 'Profile updated');
}

async function changePassword(req, res) {
  await accountService.changePassword(
    req.user.id,
    req.body.current_password,
    req.body.new_password
  );
  return success(res, null, 'Password changed');
}

module.exports = { updateProfile, changePassword };