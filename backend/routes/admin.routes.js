const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/admin.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const { success } = require('../utils/response');
const receiptController = require('../controllers/receipt.controller');
const { settingsRules } = require('../validators/settings.validator');

router.use(requireAdmin);

// Temporary test route from Phase 3
router.get('/ping', (req, res) => {
  success(res, { user: req.user }, 'Admin area OK');
});

router.get('/dashboard', adminController.dashboard);
router.get('/products', adminController.listProducts);
router.get('/products/:id', idParam, validate, adminController.getProduct);
router.get('/categories', adminController.listCategories);
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', idParam, validate, adminController.getOrder);
router.patch('/orders/:id/cancel', idParam, validate, adminController.cancelOrder);
router.patch('/orders/:id/complete', idParam, validate, adminController.completeOrder);
router.patch('/orders/:id/refund', idParam, validate, adminController.refundOrder);
router.get('/orders/:id/receipt', idParam, validate, receiptController.getForAdmin);
router.post('/telegram/test', adminController.testTelegram);

router.get('/settings', adminController.getSettings);
router.put('/settings', settingsRules, validate, adminController.updateSettings);
module.exports = router;