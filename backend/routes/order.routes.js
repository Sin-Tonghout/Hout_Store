const router = require('express').Router();
const orderController = require('../controllers/order.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const { checkoutRules } = require('../validators/checkout.validator');
const receiptController = require('../controllers/receipt.controller');

router.use(requireAuth);

router.post('/', checkoutRules, validate, orderController.create);
router.get('/', orderController.list);
router.get('/:id', idParam, validate, orderController.getOne);
router.get('/:id/receipt', idParam, validate, receiptController.getForUser);

module.exports = router;