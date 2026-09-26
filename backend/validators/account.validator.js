const { body } = require('express-validator');

const profileRules = [
  body('name')
    .isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
];

const passwordRules = [
  body('current_password')
    .isString().notEmpty().withMessage('Enter your current password'),
  body('new_password')
    .isString()
    .isLength({ min: 8, max: 72 }).withMessage('New password must be 8 to 72 characters')
    .matches(/[A-Za-z]/).withMessage('New password must contain a letter')
    .matches(/[0-9]/).withMessage('New password must contain a number'),
];

module.exports = { profileRules, passwordRules };