const { body, validationResult } = require('express-validator');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('products');
    if (!wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    res.json(wishlist);
  } catch (error) {
    next(error);
  }
};

exports.addToWishlist = [
  body('productId').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId } = req.body;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      let wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        wishlist = new Wishlist({ userId: req.user._id, products: [] });
      }

      if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
        wishlist.updatedAt = Date.now();
        await wishlist.save();
      }

      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }
];

exports.removeFromWishlist = [
  body('productId').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId } = req.body;
      const wishlist = await Wishlist.findOne({ userId: req.user._id });
      if (!wishlist) {
        return res.status(404).json({ error: 'Wishlist not found' });
      }

      wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
      wishlist.updatedAt = Date.now();
      await wishlist.save();
      res.json(wishlist);
    } catch (error) {
      next(error);
    }
  }
];