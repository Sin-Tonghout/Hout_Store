const { body } = require('express-validator');

// ABA PayWay will be added to this list in Phase 13
const checkoutRules = [
  body('payment_method').isIn(['demo', 'aba_payway']).withMessage('Choose an available payment method'),
];

module.exports = { checkoutRules };