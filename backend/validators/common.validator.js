const { param } = require('express-validator');

const idParam = param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt();

module.exports = { idParam };