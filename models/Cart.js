const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1,
    max: 100
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
  addedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total items count
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for total amount (requires populated products)
cartSchema.virtual('totalAmount').get(function() {
  return this.items.reduce((sum, item) => {
    if (item.productId && item.productId.price) {
      return sum + (item.productId.price * item.quantity);
    }
    return sum;
  }, 0);
});

// Index for faster queries
cartSchema.index({ userId: 1 });
cartSchema.index({ 'items.productId': 1 });
cartSchema.index({ updatedAt: -1 });

// Pre-save middleware to clean up invalid items
cartSchema.pre('save', function(next) {
  // Remove items with quantity <= 0
  this.items = this.items.filter(item => item.quantity > 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);