const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');

// All cart routes require authentication
router.use(authMiddleware);

router.get('/', cartController.getCart);
router.get('/count', cartController.getCartCount);
router.post('/add', cartController.addToCart);
router.put('/update', cartController.updateCart);
router.delete('/remove', cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

module.exports = router;