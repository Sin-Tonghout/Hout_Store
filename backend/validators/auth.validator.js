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
  body('rememberMe')
    .optional()
    .isBoolean().withMessage('rememberMe must be true or false')
    .toBoolean(),
];

const googleLoginRules = [
  body('accessToken')
    .isString().notEmpty().withMessage('Missing Google access token'),
];

const telegramLoginRules = [
  body('id').notEmpty().withMessage('Missing Telegram id'),
  body('auth_date').notEmpty().withMessage('Missing Telegram auth_date'),
  body('hash').isString().notEmpty().withMessage('Missing Telegram hash'),
];

const forgotPasswordRules = [
  body('email')
    .isString().trim().toLowerCase()
    .isEmail().withMessage('Enter a valid email'),
];

const resetPasswordRules = [
  body('token')
    .isString().isLength({ min: 32 }).withMessage('Invalid reset token'),
  body('password')
    .isString()
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8 to 72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

module.exports = {
  registerRules,
  loginRules,
  googleLoginRules,
  telegramLoginRules,
  forgotPasswordRules,
  resetPasswordRules,
};