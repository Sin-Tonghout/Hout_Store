const { body } = require('express-validator');

const addRules = [
  body('product_id').isInt({ min: 1 }).withMessage('Invalid product').toInt(),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1 to 10')
    .toInt(),
];

const updateRules = [
  body('quantity')
    .isInt({ min: 1, max: 10 }).withMessage('Quantity must be 1 to 10')
    .toInt(),
];

module.exports = { addRules, updateRules };