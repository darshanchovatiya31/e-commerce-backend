const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  phone: { 
    type: String, 
    required: true,
    trim: true,
    match: /^[6-9]\d{9}$/ // Indian phone number pattern
  },
  address: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  city: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  state: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  pincode: { 
    type: String, 
    required: true,
    trim: true,
    match: /^[1-9][0-9]{5}$/ // Indian pincode pattern
  },
  country: { 
    type: String, 
    default: 'India',
    trim: true
  }
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1,
    max: 100
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  originalPrice: { 
    type: Number,
    min: 0
  },
  selectedSize: { 
    type: String,
    trim: true,
    maxlength: 20
  },
  selectedColor: { 
    type: String,
    trim: true,
    maxlength: 30
  },
  image: { 
    type: String,
    trim: true
  }
}, { _id: true });

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: addressSchema,
    required: true
  },
  billingAddress: {
    type: addressSchema,
    required: true
  },
  paymentMethod: { 
    type: String, 
    required: true,
    enum: ['razorpay', 'cod'],
    trim: true
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentId: {
    type: String,
    trim: true
  },
  orderStatus: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'], 
    default: 'pending' 
  },
  statusHistory: [statusHistorySchema],
  trackingNumber: { 
    type: String,
    trim: true,
    maxlength: 50
  },
  subtotal: { 
    type: Number, 
    required: true,
    min: 0
  },
  discount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  tax: { 
    type: Number, 
    required: true,
    min: 0
  },
  shipping: { 
    type: Number, 
    required: true,
    min: 0
  },
  total: { 
    type: Number, 
    required: true,
    min: 0
  },
  couponCode: {
    type: String,
    trim: true,
    maxlength: 20
  },
  estimatedDelivery: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for order total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for order savings
orderSchema.virtual('totalSavings').get(function() {
  return this.items.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + ((item.originalPrice - item.price) * item.quantity);
    }
    return sum;
  }, 0);
});

// Indexes for better query performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.productId': 1 });

// Pre-save middleware to add status history
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus') && !this.isNew) {
    this.statusHistory.push({
      status: this.orderStatus,
      updatedAt: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);