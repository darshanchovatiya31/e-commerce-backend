const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/auth');

router.get('/product/:productId', reviewController.getProductReviews);
router.post('/product/:productId', authMiddleware, reviewController.addReview);
router.put('/:id', authMiddleware, reviewController.updateReview);
router.delete('/:id', authMiddleware, reviewController.deleteReview);

module.exports = router;