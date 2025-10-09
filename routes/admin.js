const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController2');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Dashboard and Analytics
router.get('/dashboard', authMiddleware, adminMiddleware, adminController.getDashboardStats);
router.get('/test', (req, res) => {
  const responseHelper = require('../utils/responseHelper');
  return responseHelper.success(res, { test: 'data' }, 'Test endpoint working with responseHelper');
});
router.get('/analytics', authMiddleware, adminMiddleware, adminController.getAnalytics);

// Customer Management
router.get('/customers', authMiddleware, adminMiddleware, adminController.getCustomers);
router.get('/customers/:customerId/orders', authMiddleware, adminMiddleware, adminController.getCustomerOrders);
router.put('/users/:id/status', authMiddleware, adminMiddleware, adminController.updateUserStatus);

// Order Management
router.get('/orders', authMiddleware, adminMiddleware, adminController.getOrders);
router.put('/orders/:id/status', authMiddleware, adminMiddleware, adminController.updateOrderStatus);

// Product Management (Admin view)
router.get('/products', authMiddleware, adminMiddleware, adminController.getProducts);

module.exports = router;