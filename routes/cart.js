const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, cartController.getCart);
router.post('/add', authMiddleware, cartController.addToCart);
router.put('/update', authMiddleware, cartController.updateCart);
router.delete('/remove', authMiddleware, cartController.removeFromCart);
router.delete('/clear', authMiddleware, cartController.clearCart);

module.exports = router;