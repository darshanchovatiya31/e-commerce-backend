const mongoose = require('mongoose');

const customerReviewSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
customerReviewSchema.index({ isActive: 1, displayOrder: 1 });
customerReviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CustomerReview', customerReviewSchema);

