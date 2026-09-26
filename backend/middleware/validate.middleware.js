const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result
    .array({ onlyFirstError: true })
    .map((e) => ({ field: e.path, message: e.msg }));

  return res.status(422).json({
    success: false,
    message: errors[0].message,
    errors,
  });
}

module.exports = validate;