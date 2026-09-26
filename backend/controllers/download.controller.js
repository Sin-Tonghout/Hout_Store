const path = require('path');
const downloadService = require('../services/download.service');
const downloadModel = require('../models/download.model');
const { success } = require('../utils/response');

// Only letters, numbers, spaces, dashes, underscores and dots survive in the
// downloaded file name, so the browser never sees anything unexpected.
function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9 ._-]/g, '').trim() || 'download';
}

async function download(req, res) {
  const { filePath, downloadName, area, storedName } = await downloadService.serve(req.params.token, req.user.id);

  const storage = require('../services/storage.service');
  const result = await storage.getDownloadUrl(area, storedName);

  if (result.type === 'redirect') {
    return res.redirect(result.url); // R2: hand off to a short-lived signed URL
  }
  res.download(result.path, safeFileName(downloadName)); // local: stream directly
}

async function list(req, res) {
  const rows = await downloadModel.listForUser(req.user.id);

  const downloads = rows.map((row) => ({
    token: row.download_token,
    product_name: row.product_name,
    product_slug: row.product_slug,
    cover_image: row.cover_image,
    order_number: row.order_number,
    downloads_used: row.download_count,
    downloads_max: row.max_downloads,
    expires_at: row.expires_at,
    expired: new Date(row.expires_at) < new Date(),
    limit_reached: row.download_count >= row.max_downloads,
  }));

  return success(res, { downloads });
}

module.exports = { download, list };