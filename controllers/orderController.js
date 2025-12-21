const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendTemplateEmail } = require('../utils/email');
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

      const { shippingAddress, billingAddress, paymentMethod, couponCode, tax: providedTax, shipping: providedShipping, razorpayOrderId } = req.body;
      
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

      // Use provided tax and shipping from frontend, or calculate them
      // Frontend calculation: tax = 5% of subtotal, shipping = 120 if total < 5000
      let tax;
      let shipping;
      
      if (providedTax !== undefined && providedTax !== null) {
        // Use tax value from frontend
        tax = parseFloat(providedTax);
      } else {
        // Calculate tax: 5% of subtotal (matching frontend logic)
        tax = Math.round((subtotal - discount) * 0.05);
      }
      
      if (providedShipping !== undefined && providedShipping !== null) {
        // Use shipping value from frontend
        shipping = parseFloat(providedShipping);
      } else {
        // Calculate shipping: 120 if subtotal + tax <= 5000, else 0 (matching frontend logic)
        const totalBeforeShipping = subtotal - discount + tax;
        shipping = totalBeforeShipping > 5000 ? 0 : 120;
      }
      
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
        razorpayOrderId: razorpayOrderId || null, // Store Razorpay order ID if provided
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      await order.save();

      // If user has no addresses, save shipping address as default address
      // Reload user to get fresh data
      const user = await User.findById(req.user._id);
      if (user && user.addresses.length === 0) {
        user.addresses.push({
          fullName: shippingAddress.fullName,
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          country: shippingAddress.country || 'India',
          isDefault: true,
        });
        await user.save();
      }

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
          shippingAddress,
          estimatedDelivery: order.estimatedDelivery
        });
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }

      // Populate order for response
      const populatedOrder = await Order.findById(order._id)
        .populate('userId', 'firstName lastName email')
        .populate('items.productId', 'name images price');

      // Map to client-expected shape
      const mappedOrder = (() => {
        const o = populatedOrder.toObject();
        return {
          ...o,
          userId: (o.userId && (o.userId._id || o.userId).toString()) || undefined,
          items: o.items.map((it) => {
            const p = it.productId;
            const product = p && typeof p === 'object'
              ? {
                  _id: (p._id || p).toString(),
                  name: p.name,
                  images: p.images || [],
                  price: p.price ?? it.price,
                }
              : {
                  _id: (it.productId || '').toString(),
                  name: it.name,
                  images: it.image ? [it.image] : [],
                  price: it.price,
                };
            return {
              ...it,
              productId: product,
            };
          }),
        };
      })();

      responseHelper.success(res, mappedOrder, 'Order created successfully', 201);
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
        await sendTemplateEmail('orderStatusUpdate', {
          orderId: order.orderId,
          customerName: order.userId.firstName,
          status,
          trackingNumber,
          notes
        }, { to: order.userId.email });
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
        await sendTemplateEmail('orderCancellation', {
          orderId: order.orderId,
          customerName: order.userId.firstName,
          reason: req.body.reason
        }, { to: order.userId.email });
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

// Get invoice data for an order
exports.getInvoice = [
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findById(orderId)
        .populate('userId', 'firstName lastName email phone')
        .populate('items.productId', 'name images');

      if (!order) {
        return responseHelper.error(res, 'Order not found', 404);
      }

      // Check if user has access (either the order owner or admin)
      const isAdmin = req.user && req.user.role === 'admin';
      const isOrderOwner = req.user && order.userId && order.userId._id.toString() === req.user._id.toString();
      
      if (!isAdmin && !isOrderOwner) {
        return responseHelper.error(res, 'Unauthorized access', 403);
      }

      // Format invoice data
      const invoiceData = {
        invoiceNumber: order.orderId,
        orderDate: order.createdAt,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        customer: order.userId ? {
          name: `${order.userId.firstName} ${order.userId.lastName}`,
          email: order.userId.email,
          phone: order.userId.phone || order.shippingAddress.phone,
        } : {
          name: order.guest?.name || order.shippingAddress.fullName,
          email: order.guest?.email || '',
          phone: order.guest?.phone || order.shippingAddress.phone,
        },
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress || order.shippingAddress,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.originalPrice,
          total: item.price * item.quantity,
          size: item.selectedSize,
          color: item.selectedColor,
          image: item.image,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        couponCode: order.couponCode,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
      };

      responseHelper.success(res, invoiceData, 'Invoice data fetched successfully');
    } catch (error) {
      next(error);
    }
  }
];