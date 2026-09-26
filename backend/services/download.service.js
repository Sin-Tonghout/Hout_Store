const path = require('path');
const downloadModel = require('../models/download.model');
// const storage = require('./storage.service');
const AppError = require('../utils/appError');

// Every reason maps to a clear, safe message. Nothing here reveals whether a
// token belongs to someone else, only whether it works for THIS request.
async function resolve(token, userId) {
  const record = await downloadModel.findByToken(token);
  if (!record) throw new AppError('This download link is invalid', 404);

  if (record.user_id !== userId) {
    throw new AppError('This download link does not belong to your account', 403);
  }
  if (record.payment_status !== 'success' || record.order_status === 'refunded') {
    throw new AppError('This order is not in a downloadable state', 403);
  }
  if (record.order_status === 'cancelled') {
    throw new AppError('This order was cancelled', 403);
  }
  if (new Date(record.expires_at) < new Date()) {
    throw new AppError('This download link has expired', 410);
  }
  if (record.download_count >= record.max_downloads) {
    throw new AppError('You have reached the download limit for this file', 403);
  }
  if (!record.file_name) {
    throw new AppError('This file is no longer available', 404);
  }

  return record;
}

async function serve(token, userId) {
  const record = await resolve(token, userId);

  await downloadModel.incrementCount(record.id);

  return {
    area: 'products',
    storedName: record.file_name,
    downloadName: `${record.product_name}${path.extname(record.file_name)}`,
  };
}

module.exports = { serve };