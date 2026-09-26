const { body } = require('express-validator');

const settingsRules = [
  body('store_name').isString().trim().isLength({ min: 1, max: 150 }).withMessage('Store name is required'),
  body('store_tagline').optional({ values: 'falsy' }).isString().trim().isLength({ max: 200 }),
  body('receipt_footer').optional({ values: 'falsy' }).isString().trim().isLength({ max: 300 }),
  body('download_max_count').isInt({ min: 1, max: 100 }).withMessage('Must be 1 to 100').toInt(),
  body('download_expiry_days').isInt({ min: 1, max: 365 }).withMessage('Must be 1 to 365 days').toInt(),
];

module.exports = { settingsRules };