const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');
const validate = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');

router.post('/register', authLimiter, registerRules, validate, authController.register);
router.post('/login', authLimiter, loginRules, validate, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;