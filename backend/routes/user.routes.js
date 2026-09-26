const router = require('express').Router();
const accountController = require('../controllers/account.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const { profileRules, passwordRules } = require('../validators/account.validator');
const { success } = require('../utils/response');

router.use(requireAuth);

// Temporary test route
router.get('/ping', (req, res) => {
  success(res, { user: req.user }, 'Customer area OK');
});

router.put('/profile', profileRules, validate, accountController.updateProfile);
router.put('/password', authLimiter, passwordRules, validate, accountController.changePassword);

module.exports = router;