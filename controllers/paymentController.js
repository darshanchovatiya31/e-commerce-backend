const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { sendTemplateEmail } = require('../utils/email');

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

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
      
      // Verify payment signature FIRST
      const bodyString = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(bodyString)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error('Payment signature verification failed', {
          razorpay_order_id,
          expectedSignature,
          receivedSignature: razorpay_signature
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid signature - payment verification failed',
          timestamp: new Date().toISOString(),
        });
      }

      // Payment signature is valid - now create order
      if (!orderData) {
        return res.status(400).json({
          success: false,
          message: 'Order data is required',
          timestamp: new Date().toISOString(),
        });
      }

      // Get user's cart with populated products
      const cart = await Cart.findOne({ userId: req.user._id })
        .populate({
          path: 'items.productId',
          select: 'name price originalPrice images stock inStock isActive'
        });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty',
          timestamp: new Date().toISOString(),
        });
      }

      // Validate all products are available and in stock
      const unavailableItems = [];
      const orderItems = [];

      for (const cartItem of cart.items) {
        const product = cartItem.productId;
        
        if (!product || !product.isActive || !product.inStock) {
          unavailableItems.push({
            name: product?.name || 'Unknown Product',
            reason: 'Product is no longer available'
          });
          continue;
        }

        if (product.stock < cartItem.quantity) {
          unavailableItems.push({
            name: product.name,
            reason: `Only ${product.stock} items available, but ${cartItem.quantity} requested`
          });
          continue;
        }

        orderItems.push({
          productId: product._id,
          name: product.name,
          quantity: cartItem.quantity,
          price: product.price,
          originalPrice: product.originalPrice,
          selectedSize: cartItem.selectedSize,
          selectedColor: cartItem.selectedColor,
          image: product.images[0]
        });
      }

      if (unavailableItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some items are unavailable',
          data: { unavailableItems },
          timestamp: new Date().toISOString(),
        });
      }

      // Calculate order totals
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = 0; // Can be calculated from orderData if needed
      const tax = orderData.tax || Math.round(subtotal * 0.05);
      const shipping = orderData.shipping || (subtotal + tax > 5000 ? 0 : 120);
      const total = subtotal - discount + tax + shipping;

      // Generate unique short order ID (8 characters)
      let orderId;
      let isUnique = false;
      while (!isUnique) {
        orderId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const existingOrder = await Order.findOne({ orderId });
        if (!existingOrder) {
          isUnique = true;
        }
      }

      // Create order with payment details
      const order = new Order({
        orderId,
        userId: req.user._id,
        items: orderItems,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress || orderData.shippingAddress,
        paymentMethod: 'razorpay',
        paymentStatus: 'paid', // Payment is verified, so mark as paid
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        orderStatus: 'pending', // New orders start as pending
        subtotal,
        discount,
        tax,
        shipping,
        total,
        couponCode: orderData.couponCode || null,
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      await order.save();

      // Update product stock
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.quantity } }
        );
      }

      // Clear cart
      await Cart.findOneAndUpdate(
        { userId: req.user._id }, 
        { items: [] }
      );

      // Send order confirmation email
      try {
        await sendTemplateEmail('orderConfirmation', {
          orderId,
          customerName: req.user.firstName,
          customerEmail: req.user.email,
          items: orderItems,
          total,
          shippingAddress: orderData.shippingAddress,
          estimatedDelivery: order.estimatedDelivery
        });
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }

      console.log(`Payment verified and order created successfully: ${orderId}, paymentId: ${razorpay_payment_id}`);
      
      return res.status(200).json({
        success: true,
        message: 'Payment verified and order created',
        data: {
          orderId: order.orderId,
          paymentStatus: order.paymentStatus,
          order: order
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Payment verification/order creation error:', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Payment verification or order creation failed',
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
        ).populate('userId', 'firstName lastName email');
        
        if (order && order.userId) {
          try {
            await sendTemplateEmail('paymentConfirmation', {
              orderId: order.orderId,
              customerName: order.userId.firstName,
              amount: order.total,
              paymentMethod: order.paymentMethod || 'Online Payment'
            }, { to: order.userId.email });
          } catch (emailError) {
            console.error('Failed to send payment confirmation email:', emailError);
          }
        }
      }
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: 'Invalid webhook signature' });
    }
  } catch (error) {
    next(error);
  }
};