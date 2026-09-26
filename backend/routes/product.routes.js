const router = require('express').Router();
const productController = require('../controllers/product.controller');
const { requireAdmin } = require('../middleware/admin.middleware');
const { uploadProductFiles } = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const { productRules, statusRules } = require('../validators/product.validator');

// Public
router.get('/', productController.list);
router.get('/:slug', productController.getBySlug);

// Admin (the admin check runs BEFORE any file is accepted)
router.post('/', requireAdmin, uploadProductFiles, productRules, validate, productController.create);
router.put('/:id', requireAdmin, idParam, validate, uploadProductFiles, productRules, validate, productController.update);
router.patch('/:id/status', requireAdmin, idParam, statusRules, validate, productController.setStatus);
router.delete('/:id', requireAdmin, idParam, validate, productController.remove);

module.exports = router;