const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendEmail } = require('../utils/email');
const responseHelper = require('../utils/responseHelper');
const RESPONSE_MESSAGES = require('../constants/responseMessages');
const orderValidators = require('../validators/orderValidators');
const crypto = require('crypto');

// Create new order
exports.createOrder = [
  ...orderValidators.createOrder,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { shippingAddress, billingAddress, paymentMethod, couponCode } = req.body;
      
      // Get user's cart with populated products
      const cart = await Cart.findOne({ userId: req.user._id })
        .populate({
          path: 'items.productId',
          select: 'name price originalPrice images stock inStock isActive'
        });

      if (!cart || cart.items.length === 0) {
        return responseHelper.error(res, 'Cart is empty', 400);
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
        return responseHelper.error(res, 'Some items are unavailable', 400, { unavailableItems });
      }

      // Calculate order totals
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      let discount = 0;
      
      // Apply coupon if provided (simplified logic)
      if (couponCode) {
        // You can implement coupon validation logic here
        // For now, just a simple example
        if (couponCode === 'WELCOME10') {
          discount = subtotal * 0.1; // 10% discount
        }
      }

      const tax = (subtotal - discount) * 0.18; // 18% GST
      const shipping = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
      const total = subtotal - discount + tax + shipping;

      // Generate unique order ID
      const orderId = `ORD${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Create order
      const order = new Order({
        orderId,
        userId: req.user._id,
        items: orderItems,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
        orderStatus: 'pending',
        subtotal,
        discount,
        tax,
        shipping,
        total,
        couponCode: couponCode || null,
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
        await sendEmail({
          to: req.user.email,
          subject: `Order Confirmation - ${orderId}`,
          html: `
            <h2>Order Placed Successfully!</h2>
            <p>Dear ${req.user.firstName},</p>
            <p>Thank you for your order. Your order <strong>${orderId}</strong> has been placed successfully.</p>
            <h3>Order Summary:</h3>
            <ul>
              ${orderItems.map(item => `
                <li>${item.name} - Qty: ${item.quantity} - ₹${item.price}</li>
              `).join('')}
            </ul>
            <p><strong>Total: ₹${total}</strong></p>
            <p>Estimated delivery: ${order.estimatedDelivery.toDateString()}</p>
            <p>We'll send you updates about your order status.</p>
            <p>Thank you for shopping with Samjubaa Creation!</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }

      // Populate order for response
      const populatedOrder = await Order.findById(order._id)
        .populate('userId', 'firstName lastName email')
        .populate('items.productId', 'name images');

      responseHelper.success(res, populatedOrder, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
];

// Get user's orders with pagination
exports.getOrders = [
  ...orderValidators.getOrders,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = { userId: req.user._id };
      
      if (req.query.status) {
        filter.orderStatus = req.query.status;
      }
      
      if (req.query.paymentStatus) {
        filter.paymentStatus = req.query.paymentStatus;
      }

      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) {
          filter.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          filter.createdAt.$lte = new Date(req.query.endDate);
        }
      }

      // Get orders with pagination
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('items.productId', 'name images price')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter)
      ]);

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      responseHelper.success(res, { orders, pagination }, 'Orders fetched successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Get single order by ID
exports.getOrder = [
  ...orderValidators.getOrderById,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const order = await Order.findById(req.params.orderId)
        .populate('items.productId', 'name images price originalPrice')
        .populate('userId', 'firstName lastName email phone');

      if (!order) {
        return responseHelper.error(res, 'Order not found', 404);
      }

      // Check if user owns this order (unless admin)
      if (req.user.role !== 'admin' && order.userId._id.toString() !== req.user._id.toString()) {
        return responseHelper.error(res, 'Unauthorized to view this order', 403);
      }

      responseHelper.success(res, order, 'Order fetched successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Update order status (Admin only)
exports.updateOrderStatus = [
  ...orderValidators.updateOrderStatus,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { status, trackingNumber, notes } = req.body;
      
      const order = await Order.findById(req.params.orderId)
        .populate('userId', 'firstName lastName email');

      if (!order) {
        return responseHelper.error(res, 'Order not found', 404);
      }

      // Update order status
      const oldStatus = order.orderStatus;
      order.orderStatus = status;
      
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }

      if (notes) {
        order.statusHistory.push({
          status,
          notes,
          updatedBy: req.user._id,
          updatedAt: new Date()
        });
      }

      // Set delivery date if delivered
      if (status === 'delivered' && oldStatus !== 'delivered') {
        order.deliveredAt = new Date();
      }

      await order.save();

      // Send status update email
      try {
        const statusMessages = {
          confirmed: 'Your order has been confirmed and is being prepared.',
          processing: 'Your order is being processed.',
          shipped: `Your order has been shipped${trackingNumber ? ` with tracking number: ${trackingNumber}` : ''}.`,
          delivered: 'Your order has been delivered successfully!',
          cancelled: 'Your order has been cancelled.'
        };

        await sendEmail({
          to: order.userId.email,
          subject: `Order ${order.orderId} - Status Update`,
          html: `
            <h2>Order Status Update</h2>
            <p>Dear ${order.userId.firstName},</p>
            <p>Your order <strong>${order.orderId}</strong> status has been updated to: <strong>${status.toUpperCase()}</strong></p>
            <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
            ${trackingNumber ? `<p>Tracking Number: <strong>${trackingNumber}</strong></p>` : ''}
            ${notes ? `<p>Additional Notes: ${notes}</p>` : ''}
            <p>Thank you for shopping with Samjubaa Creation!</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }

      responseHelper.success(res, order, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Cancel order (User can cancel pending orders)
exports.cancelOrder = [
  ...orderValidators.cancelOrder,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const order = await Order.findById(req.params.orderId)
        .populate('userId', 'firstName lastName email');

      if (!order) {
        return responseHelper.error(res, 'Order not found', 404);
      }

      // Check if user owns this order (unless admin)
      if (req.user.role !== 'admin' && order.userId._id.toString() !== req.user._id.toString()) {
        return responseHelper.error(res, 'Unauthorized to cancel this order', 403);
      }

      // Check if order can be cancelled
      if (!['pending', 'confirmed'].includes(order.orderStatus)) {
        return responseHelper.error(res, 'Order cannot be cancelled at this stage', 400);
      }

      // Update order status
      order.orderStatus = 'cancelled';
      order.cancelledAt = new Date();
      
      if (req.body.reason) {
        order.cancellationReason = req.body.reason;
      }

      await order.save();

      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }

      // Send cancellation email
      try {
        await sendEmail({
          to: order.userId.email,
          subject: `Order ${order.orderId} - Cancelled`,
          html: `
            <h2>Order Cancelled</h2>
            <p>Dear ${order.userId.firstName},</p>
            <p>Your order <strong>${order.orderId}</strong> has been cancelled successfully.</p>
            ${req.body.reason ? `<p>Reason: ${req.body.reason}</p>` : ''}
            <p>If payment was made, refund will be processed within 5-7 business days.</p>
            <p>Thank you for shopping with Samjubaa Creation!</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
      }

      responseHelper.success(res, order, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Get all orders (Admin only)
exports.getAllOrders = [
  ...orderValidators.getOrders,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      
      if (req.query.status) {
        filter.orderStatus = req.query.status;
      }
      
      if (req.query.paymentStatus) {
        filter.paymentStatus = req.query.paymentStatus;
      }

      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) {
          filter.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          filter.createdAt.$lte = new Date(req.query.endDate);
        }
      }

      // Get orders with pagination
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('userId', 'firstName lastName email phone')
          .populate('items.productId', 'name images price')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Order.countDocuments(filter)
      ]);

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      };

      responseHelper.success(res, { orders, pagination }, 'Orders fetched successfully');
    } catch (error) {
      next(error);
    }
  }
];
// Update payment status (Admin only)
exports.updatePaymentStatus = [
  ...orderValidators.updatePaymentStatus,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { paymentStatus, paymentId, refundId } = req.body;
      
      const order = await Order.findById(req.params.orderId)
        .populate('userId', 'firstName lastName email');

      if (!order) {
        return responseHelper.error(res, 'Order not found', 404);
      }

      order.paymentStatus = paymentStatus;
      if (paymentId) order.paymentId = paymentId;
      if (refundId) order.refundId = refundId;

      await order.save();
      responseHelper.success(res, order, 'Payment status updated successfully');
    } catch (error) {
      next(error);
    }
  }
];