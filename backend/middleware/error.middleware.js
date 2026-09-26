const path = require('path');
const config = require('../config/env');

function notFound(req, res) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  return res
    .status(404)
    .sendFile(path.join(__dirname, '../../frontend/pages/404.html'));
}

// Express recognizes an error handler by its 4 parameters. Keep all 4.
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }

  if (err.name === 'MulterError') {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      message: tooLarge ? 'The file is too large' : err.message,
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This value is already in use' });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ success: false, message: 'This item is still in use' });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);

  const message =
    status >= 500 && config.nodeEnv === 'production' ? 'Server error' : err.message;

  const body = { success: false, message };
  if (err.errors) body.errors = err.errors;

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };