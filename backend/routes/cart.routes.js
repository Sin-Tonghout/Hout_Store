const router = require('express').Router();
const cartController = require('../controllers/cart.controller');
const validate = require('../middleware/validate.middleware');
const { idParam } = require('../validators/common.validator');
const { addRules, updateRules } = require('../validators/cart.validator');

// The cart works for guests too, so there is no login check here
router.get('/', cartController.get);
router.post('/', addRules, validate, cartController.add);
router.put('/:id', idParam, updateRules, validate, cartController.update);
router.delete('/:id', idParam, validate, cartController.remove);

module.exports = router;