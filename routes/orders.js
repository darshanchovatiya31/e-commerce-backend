const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// User routes
router.post('/', authMiddleware, orderController.createOrder);
router.get('/', authMiddleware, orderController.getOrders);
router.get('/:orderId', authMiddleware, orderController.getOrder);
router.get('/:orderId/invoice', authMiddleware, orderController.getInvoice);
router.patch('/:orderId/cancel', authMiddleware, orderController.cancelOrder);

// Admin routes
router.get('/admin/all', authMiddleware, adminMiddleware, orderController.getAllOrders);
router.patch('/admin/:orderId/status', authMiddleware, adminMiddleware, orderController.updateOrderStatus);
router.patch('/admin/:orderId/payment', authMiddleware, adminMiddleware, orderController.updatePaymentStatus);

module.exports = router;