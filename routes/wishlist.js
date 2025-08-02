const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, wishlistController.getWishlist);
router.post('/add', authMiddleware, wishlistController.addToWishlist);
router.delete('/remove', authMiddleware, wishlistController.removeFromWishlist);

module.exports = router;