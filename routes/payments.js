const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/auth');

router.post('/create-order', authMiddleware, paymentController.createOrder);
router.post('/verify', authMiddleware, paymentController.verifyPayment);
router.post('/webhook', paymentController.webhook);

module.exports = router;