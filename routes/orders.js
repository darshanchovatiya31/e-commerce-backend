const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.post('/create', authMiddleware, orderController.createOrder);
router.get('/', authMiddleware, orderController.getOrders);
router.get('/:id', authMiddleware, orderController.getOrder);
router.put('/:id/status', authMiddleware, adminMiddleware, orderController.updateOrderStatus);
router.get('/admin/all', authMiddleware, adminMiddleware, orderController.getAllOrders);

module.exports = router;