const { body } = require('express-validator');
const demoRules = [
  body('order_id').isInt({ min: 1 }).withMessage('Invalid order').toInt(),
  body('outcome')
  .isIn(['success', 'failed', 'cancelled'])
  .withMessage('Invalid payment result'),
];
const abaRules = [body('order_id').isInt({ min: 1 }).withMessage('Invalid order').toInt()];

module.exports = { demoRules, abaRules };