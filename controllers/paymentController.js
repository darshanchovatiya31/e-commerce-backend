const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('../utils/email');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = [
  body('amount').isFloat({ min: 1 }),
  body('currency').isIn(['INR']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment request',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
      }

      // Ensure Razorpay credentials are configured
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'Razorpay credentials are not configured',
          timestamp: new Date().toISOString(),
        });
      }

      const amountRupees = Number(req.body.amount);
      if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount',
          timestamp: new Date().toISOString(),
        });
      }

      const options = {
        amount: Math.round(amountRupees * 100), // Convert to paise and ensure integer
        currency: req.body.currency,
        receipt: `order_${Date.now()}`
      };

      const order = await razorpay.orders.create(options);

      return res.status(200).json({
        success: true,
        message: 'Razorpay order created',
        data: order,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Log full error for debugging
      console.error('Razorpay create order failed:', error);
      const msg = (error && error.error && (error.error.description || error.error.reason))
        || error?.message
        || 'Failed to create payment order ';
      return res.status(500).json({
        success: false,
        message: msg,
        timestamp: new Date().toISOString(),
      });
    }
  }
];

exports.verifyPayment = [
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment verification payload',
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature === razorpay_signature) {
        await Order.findOneAndUpdate(
          { orderId: razorpay_order_id },
          { paymentStatus: 'paid' }
        );
        return res.status(200).json({
          success: true,
          message: 'Payment verified',
          timestamp: new Date().toISOString(),
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid signature',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error?.message || 'Payment verification failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
];

exports.webhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest === req.headers['x-razorpay-signature']) {
      const { order_id, payment_id, status } = req.body.payload.payment.entity;
      if (status === 'captured') {
        const order = await Order.findOneAndUpdate(
          { orderId: order_id },
          { paymentStatus: 'completed', orderStatus: 'processing' },
          { new: true }
        );
        await sendEmail({
          to: order.userId.email,
          subject: 'Order Confirmation',
          text: `Your order ${order_id} has been confirmed!`
        });
      }
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: 'Invalid webhook signature' });
    }
  } catch (error) {
    next(error);
  }
};