const router = require('express').Router();
const downloadController = require('../controllers/download.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { sensitiveLimiter } = require('../middleware/rateLimit.middleware');

router.use(requireAuth);
router.use(sensitiveLimiter);

router.get('/', downloadController.list); // the account "Downloads" page
router.get('/:token', downloadController.download); // the actual file

module.exports = router;