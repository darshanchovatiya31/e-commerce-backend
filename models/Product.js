const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 2000
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  originalPrice: { 
    type: Number, 
    required: true,
    min: 0
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true 
  },
  subcategory: { 
    type: String,
    trim: true
  },
  material: { 
    type: String,
    trim: true
  },
  colors: [{ 
    type: String,
    trim: true
  }],
  sizes: [{ 
    type: String,
    trim: true
  }],
  images: [{ 
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Image must be a valid URL'
    }
  }],
  tags: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],
  stock: { 
    type: Number, 
    default: 0,
    min: 0
  },
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  inStock: { 
    type: Boolean, 
    default: true 
  },
  isFeatured: { 
    type: Boolean, 
    default: false 
  },
  isNew: { 
    type: Boolean, 
    default: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // Audit fields
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  deletedAt: { 
    type: Date 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Virtual for availability status
productSchema.virtual('isAvailable').get(function() {
  return this.isActive && this.inStock && this.stock > 0;
});

// Text search index
productSchema.index({ 
  name: 'text', 
  description: 'text',
  tags: 'text'
});

// Compound indexes for better query performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });

// Pre-save middleware to update stock status
productSchema.pre('save', function(next) {
  this.inStock = this.stock > 0;
  next();
});

module.exports = mongoose.model('Product', productSchema);