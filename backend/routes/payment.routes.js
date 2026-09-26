const router = require('express').Router();
const paymentController = require('../controllers/payment.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
// const { demoRules } = require('../validators/payment.validator');
const { demoRules, abaRules } = require('../validators/payment.validator');
const { sensitiveLimiter } = require('../middleware/rateLimit.middleware');

router.use(requireAuth);
router.use(sensitiveLimiter);

router.post('/demo', demoRules, validate, paymentController.payDemo);
router.get('/:id', idParam, validate, paymentController.getOne);

router.post('/aba/create', abaRules, validate, paymentController.abaCreate);
router.post('/aba/verify', abaRules, validate, paymentController.abaVerify);
router.post('/aba/qr', abaRules, validate, paymentController.abaQr);

module.exports = router;