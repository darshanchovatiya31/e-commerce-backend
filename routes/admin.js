const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, adminMiddleware, adminController.getDashboardStats);
router.get('/analytics', authMiddleware, adminMiddleware, adminController.getAnalytics);
router.get('/customers', authMiddleware, adminMiddleware, adminController.getCustomers);
router.put('/users/:id/status', authMiddleware, adminMiddleware, adminController.updateUserStatus);

module.exports = router;