const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { type: String, trim: true, maxlength: 20 },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['new', 'read', 'responded', 'closed'], default: 'new' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: {
    ip: { type: String },
    userAgent: { type: String },
  },
}, { timestamps: true });

contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('Contact', contactSchema);
