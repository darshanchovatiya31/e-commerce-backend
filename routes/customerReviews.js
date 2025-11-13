const express = require('express');
const router = express.Router();
const customerReviewController = require('../controllers/customerReviewController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const customerReviewValidators = require('../validators/customerReviewValidators');

// Public route - Get active reviews for home page
router.get('/active', 
  customerReviewValidators.getActive, 
  customerReviewController.getActiveReviews
);

// Admin routes
router.get('/', 
  authMiddleware, 
  adminMiddleware, 
  customerReviewValidators.list, 
  customerReviewController.getAllReviews
);

router.get('/:id', 
  authMiddleware, 
  adminMiddleware, 
  customerReviewValidators.getById, 
  customerReviewController.getReviewById
);

router.post('/', 
  authMiddleware, 
  adminMiddleware, 
  customerReviewValidators.create, 
  customerReviewController.createReview
);

router.put('/:id', 
  authMiddleware, 
  adminMiddleware, 
  customerReviewValidators.update, 
  customerReviewController.updateReview
);

router.delete('/:id', 
  authMiddleware, 
  adminMiddleware, 
  customerReviewValidators.deleteReview, 
  customerReviewController.deleteReview
);

router.patch('/:id/toggle-status', 
  authMiddleware, 
  adminMiddleware, 
  customerReviewValidators.toggleStatus, 
  customerReviewController.toggleReviewStatus
);

module.exports = router;

