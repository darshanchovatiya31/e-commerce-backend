const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategory: { type: String },
  material: { type: String },
  colors: [{ type: String }],
  sizes: [{ type: String }],
  images: [{ type: String }],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  isNew: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);