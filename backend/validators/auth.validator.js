const { body } = require('express-validator');

const registerRules = [
  body('name')
    .isString().trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2 to 100 characters'),
  body('email')
    .isString().trim().toLowerCase()
    .isEmail().withMessage('Enter a valid email')
    .isLength({ max: 191 }).withMessage('Email is too long'),
  body('password')
    .isString()
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8 to 72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

const loginRules = [
  body('email')
    .isString().trim().toLowerCase()
    .isEmail().withMessage('Enter a valid email'),
  body('password')
    .isString().notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };