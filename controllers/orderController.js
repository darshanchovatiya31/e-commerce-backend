const { body, param, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { sendEmail } = require('../utils/email');
const crypto = require('crypto');

exports.createOrder = [
  body('shippingAddress').isObject(),
  body('billingAddress').isObject(),
  body('paymentMethod').isIn(['card', 'upi', 'netbanking']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { shippingAddress, billingAddress, paymentMethod } = req.body;
      const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }

      const items = cart.items.map(item => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productId.price,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      }));

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = subtotal * 0.1; // 10% tax
      const shipping = 50; // Flat shipping rate
      const total = subtotal + tax + shipping;

      const order = new Order({
        orderId: `ORDER_${crypto.randomBytes(8).toString('hex')}`,
        userId: req.user._id,
        items,
        shippingAddress,
        billingAddress,
        paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'pending',
        total,
        subtotal,
        tax,
        shipping,
        discount: 0
      });

      await order.save();
      await Cart.findOneAndUpdate({ userId: req.user._id }, { items: [], updatedAt: Date.now() });

      await sendEmail({
        to: req.user.email,
        subject: 'Order Placed Successfully',
        text: `Your order ${order.orderId} has been placed successfully. Total: ₹${total}`
      });

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
];

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).populate('items.productId');
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

exports.getOrder = [
  param('id').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const order = await Order.findById(req.params.id).populate('items.productId');
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (order.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      res.json(order);
    } catch (error) {
      next(error);
    }
  }
];

exports.updateOrderStatus = [
  param('id').isMongoId(),
  body('orderStatus').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  body('trackingNumber').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { orderStatus, trackingNumber } = req.body;
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      order.orderStatus = orderStatus;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      await order.save();

      await sendEmail({
        to: req.user.email,
        subject: 'Order Status Updated',
        text: `Your order ${order.orderId} has been updated to ${orderStatus}.`
      });

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
];

exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('userId').populate('items.productId');
    res.json(orders);
  } catch (error) {
    next(error);
  }
};