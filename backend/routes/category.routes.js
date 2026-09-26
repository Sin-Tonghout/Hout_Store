const router = require('express').Router();
const categoryController = require('../controllers/category.controller');
const { requireAdmin } = require('../middleware/admin.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const { categoryRules } = require('../validators/category.validator');

// Public
router.get('/', categoryController.list);

// Admin
router.post('/', requireAdmin, categoryRules, validate, categoryController.create);
router.put('/:id', requireAdmin, idParam, categoryRules, validate, categoryController.update);
router.delete('/:id', requireAdmin, idParam, validate, categoryController.remove);

module.exports = router;