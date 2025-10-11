const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const newsletterValidators = require('../validators/newsletterValidators');

// Public routes
router.post('/subscribe', newsletterValidators.subscribe, newsletterController.subscribe);
router.post('/unsubscribe', newsletterValidators.unsubscribe, newsletterController.unsubscribe);

// Admin routes
router.get('/subscribers', 
  authMiddleware, 
  adminMiddleware, 
  newsletterValidators.list, 
  newsletterController.getSubscribers
);

router.get('/stats', 
  authMiddleware, 
  adminMiddleware, 
  newsletterValidators.stats, 
  newsletterController.getStats
);

router.put('/subscribers/:id', 
  authMiddleware, 
  adminMiddleware, 
  newsletterValidators.update, 
  newsletterController.updateSubscriber
);

router.delete('/subscribers/:id', 
  authMiddleware, 
  adminMiddleware, 
  newsletterController.deleteSubscriber
);

router.get('/export', 
  authMiddleware, 
  adminMiddleware, 
  newsletterValidators.exportData, 
  newsletterController.exportSubscribers
);

router.post('/bulk-action', 
  authMiddleware, 
  adminMiddleware, 
  newsletterController.bulkAction
);

module.exports = router;
