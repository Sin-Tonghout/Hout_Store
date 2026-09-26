const { body } = require('express-validator');

const categoryRules = [
  body('name')
    .isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
  body('slug')
    .optional({ values: 'falsy' })
    .isString().trim().toLowerCase()
    .isLength({ max: 120 }).withMessage('Slug is too long')
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Slug can only use lowercase letters, numbers and hyphens'),
  body('description')
    .optional({ values: 'falsy' })
    .isString().trim()
    .isLength({ max: 2000 }).withMessage('Description is too long'),
  body('parent_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('Choose a valid parent category').toInt(),
  body('status')
    .isIn(['active', 'inactive']).withMessage('Choose a valid status'),
];

module.exports = { categoryRules };