const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed', 'bounced'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['website', 'admin', 'import'],
    default: 'website'
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  },
  lastEmailSent: {
    type: Date
  },
  emailCount: {
    type: Number,
    default: 0
  },
  preferences: {
    promotions: {
      type: Boolean,
      default: true
    },
    newProducts: {
      type: Boolean,
      default: true
    },
    styleTips: {
      type: Boolean,
      default: true
    },
    orderUpdates: {
      type: Boolean,
      default: true
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    ipAddress: {
      type: String,
      required: false
    },
    userAgent: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ subscribedAt: -1 });
newsletterSchema.index({ isActive: 1 });
newsletterSchema.index({ tags: 1 });

// Virtual for full name
newsletterSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || '';
});

// Static methods
newsletterSchema.statics.findActiveSubscribers = function() {
  return this.find({ status: 'active', isActive: true });
};

newsletterSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

newsletterSchema.statics.getSubscriberStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
newsletterSchema.methods.unsubscribe = function() {
  this.status = 'unsubscribed';
  this.unsubscribedAt = new Date();
  return this.save();
};

newsletterSchema.methods.resubscribe = function() {
  this.status = 'active';
  this.unsubscribedAt = undefined;
  return this.save();
};

newsletterSchema.methods.updateEmailCount = function() {
  this.emailCount += 1;
  this.lastEmailSent = new Date();
  return this.save();
};

newsletterSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

newsletterSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// Pre-save middleware
newsletterSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  // Update timestamps based on status changes
  if (this.isModified('status')) {
    if (this.status === 'unsubscribed' && !this.unsubscribedAt) {
      this.unsubscribedAt = new Date();
    } else if (this.status === 'active' && this.unsubscribedAt) {
      this.unsubscribedAt = undefined;
    }
  }
  
  next();
});

module.exports = mongoose.model('Newsletter', newsletterSchema);
