const { body, param, query } = require('express-validator');

const orderValidators = {
  createOrder: [
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),
    
    body('shippingAddress.fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    
    body('shippingAddress.phone')
      .isMobilePhone('en-IN')
      .withMessage('Please provide a valid Indian phone number'),
    
    body('shippingAddress.address')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Address must be between 10 and 200 characters'),
    
    body('shippingAddress.city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    
    body('shippingAddress.state')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('State must be between 2 and 50 characters'),
    
    body('shippingAddress.pincode')
      .isPostalCode('IN')
      .withMessage('Please provide a valid Indian pincode'),
    
    body('billingAddress')
      .optional()
      .isObject()
      .withMessage('Billing address must be an object'),
    
    body('paymentMethod')
      .isIn(['razorpay', 'cod'])
      .withMessage('Payment method must be either razorpay or cod'),
    
    body('couponCode')
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Coupon code must be between 3 and 20 characters'),
    
    body('tax')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Tax must be a non-negative number'),
    
    body('shipping')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Shipping must be a non-negative number'),
    
    body('razorpayOrderId')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Razorpay order ID must be between 1 and 100 characters')
  ],

  updateOrderStatus: [
    param('orderId')
      .isMongoId()
      .withMessage('Please provide a valid order ID'),
    
    body('status')
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
      .withMessage('Invalid order status'),
    
    body('trackingNumber')
      .optional()
      .trim()
      .isLength({ min: 5, max: 50 })
      .withMessage('Tracking number must be between 5 and 50 characters'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  updatePaymentStatus: [
    param('orderId')
      .isMongoId()
      .withMessage('Please provide a valid order ID'),
    
    body('paymentStatus')
      .isIn(['pending', 'paid', 'failed', 'refunded'])
      .withMessage('Invalid payment status'),
    
    body('paymentId')
      .optional()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Payment ID must be between 5 and 100 characters'),
    
    body('refundId')
      .optional()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Refund ID must be between 5 and 100 characters')
  ],

  getOrders: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('status')
      .optional()
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
      .withMessage('Invalid order status filter'),
    
    query('paymentStatus')
      .optional()
      .isIn(['pending', 'paid', 'failed', 'refunded'])
      .withMessage('Invalid payment status filter'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date')
  ],

  getOrderById: [
    param('orderId')
      .isMongoId()
      .withMessage('Please provide a valid order ID')
  ],

  cancelOrder: [
    param('orderId')
      .isMongoId()
      .withMessage('Please provide a valid order ID'),
    
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason cannot exceed 500 characters')
  ]
};

module.exports = orderValidators;