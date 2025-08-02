const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

exports.addToCart = [
  body('productId').isMongoId(),
  body('quantity').isInt({ min: 1 }),
  body('selectedSize').optional().trim(),
  body('selectedColor').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, quantity, selectedSize, selectedColor } = req.body;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        cart = new Cart({ userId: req.user._id, items: [] });
      }

      const itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId &&
        item.selectedSize === selectedSize &&
        item.selectedColor === selectedColor
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity, selectedSize, selectedColor });
      }

      cart.updatedAt = Date.now();
      await cart.save();
      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
];

exports.updateCart = [
  body('productId').isMongoId(),
  body('quantity').isInt({ min: 1 }),
  body('selectedSize').optional().trim(),
  body('selectedColor').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, quantity, selectedSize, selectedColor } = req.body;
      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      const itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId &&
        item.selectedSize === selectedSize &&
        item.selectedColor === selectedColor
      );

      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found in cart' });
      }

      cart.items[itemIndex].quantity = quantity;
      cart.updatedAt = Date.now();
      await cart.save();
      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
];

exports.removeFromCart = [
  body('productId').isMongoId(),
  body('selectedSize').optional().trim(),
  body('selectedColor').optional().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, selectedSize, selectedColor } = req.body;
      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      cart.items = cart.items.filter(item => 
        !(item.productId.toString() === productId &&
          item.selectedSize === selectedSize &&
          item.selectedColor === selectedColor)
      );

      cart.updatedAt = Date.now();
      await cart.save();
      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
];

exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = [];
    cart.updatedAt = Date.now();
    await cart.save();
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};