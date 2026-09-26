const receiptService = require('../services/receipt.service');
const { success } = require('../utils/response');

async function getForUser(req, res) {
  const receipt = await receiptService.getReceiptForUser(Number(req.params.id), req.user.id);
  return success(res, { receipt });
}

async function getForAdmin(req, res) {
  const receipt = await receiptService.getReceiptForAdmin(Number(req.params.id));
  return success(res, { receipt });
}

module.exports = { getForUser, getForAdmin };