const { body } = require("express-validator");

const STATUSES = ["draft", "published", "archived"];

const productRules = [
  body("name")
    .isString()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Name must be 2 to 200 characters"),
  body("slug")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .toLowerCase()
    .isLength({ max: 220 })
    .withMessage("Slug is too long")
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage("Slug can only use lowercase letters, numbers and hyphens"),
  body("category_id")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("Choose a valid category")
    .toInt(),
  body("short_description")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Short description must be 500 characters or fewer"),
  body("description")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 20000 })
    .withMessage("Description is too long"),
  body("price")
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage("Price must be a number, 0 or more")
    .toFloat(),
  body("compare_price")
    .optional({ values: "falsy" })
    .isFloat({ min: 0, max: 99999999.99 })
    .withMessage("Compare price must be a number")
    .toFloat(),
  body("version")
    .optional({ values: "falsy" })
    .isString()
    .trim()
    .isLength({ max: 30 })
    .withMessage("Version must be 30 characters or fewer"),
  body("status").isIn(STATUSES).withMessage("Choose a valid status"),
];

const statusRules = [
  body("status").isIn(STATUSES).withMessage("Choose a valid status"),
];

module.exports = { productRules, statusRules };
