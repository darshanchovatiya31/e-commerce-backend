const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('../utils/email');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

exports.createOrder = [
  body('amount').isFloat({ min: 1 }),
  body('currency').isIn(['INR']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const options = {
        amount: req.body.amount * 100, // Convert to paise
        currency: req.body.currency,
        receipt: `order_${Date.now()}`
      };

      // const order = await razorpay.orders.create(options);
      // res.json(order);
    } catch (error) {
      next(error);
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
        return res.status(400).json({ errors: errors.array() });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature === razorpay_signature) {
        // Update order payment status
        await Order.findOneAndUpdate(
          { orderId: razorpay_order_id },
          { paymentStatus: 'completed' }
        );
        res.json({ status: 'success' });
      } else {
        res.status(400).json({ error: 'Invalid signature' });
      }
    } catch (error) {
      next(error);
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