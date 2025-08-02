const { validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const responseHelper = require('../utils/responseHelper');
const RESPONSE_MESSAGES = require('../constants/responseMessages');
const cartValidators = require('../validators/cartValidators');

// Get user's cart
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: 'items.productId',
        select: 'name price originalPrice images category inStock stock isActive',
        populate: {
          path: 'category',
          select: 'name slug'
        }
      });

    // Create empty cart if doesn't exist
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
      await cart.save();
    }

    // Filter out inactive products and calculate totals
    const activeItems = cart.items.filter(item => 
      item.productId && 
      item.productId.isActive && 
      item.productId.inStock
    );

    // Update cart if items were filtered out
    if (activeItems.length !== cart.items.length) {
      cart.items = activeItems;
      await cart.save();
    }

    // Calculate cart totals
    const cartData = {
      ...cart.toObject(),
      totalItems: activeItems.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: activeItems.reduce((sum, item) => 
        sum + (item.productId.price * item.quantity), 0
      ),
      originalAmount: activeItems.reduce((sum, item) => 
        sum + (item.productId.originalPrice * item.quantity), 0
      )
    };

    responseHelper.success(res, cartData, 'Cart fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Add item to cart
exports.addToCart = [
  ...cartValidators.addToCart,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { productId, quantity, selectedSize, selectedColor } = req.body;
      
      // Check if product exists and is available
      const product = await Product.findOne({ 
        _id: productId, 
        isActive: true, 
        inStock: true 
      });
      
      if (!product) {
        return responseHelper.error(res, 'Product not found or unavailable', 404);
      }

      // Check stock availability
      if (product.stock < quantity) {
        return responseHelper.error(res, `Only ${product.stock} items available in stock`, 400);
      }

      // Find or create cart
      let cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        cart = new Cart({ userId: req.user._id, items: [] });
      }

      // Check if item already exists in cart
      const itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId &&
        item.selectedSize === selectedSize &&
        item.selectedColor === selectedColor
      );

      if (itemIndex > -1) {
        // Update existing item
        const newQuantity = cart.items[itemIndex].quantity + quantity;
        
        // Check total stock availability
        if (product.stock < newQuantity) {
          return responseHelper.error(res, `Only ${product.stock} items available in stock`, 400);
        }
        
        cart.items[itemIndex].quantity = newQuantity;
      } else {
        // Add new item
        cart.items.push({ 
          productId, 
          quantity, 
          selectedSize, 
          selectedColor,
          addedAt: new Date()
        });
      }

      await cart.save();
      
      // Populate and return updated cart
      const updatedCart = await Cart.findById(cart._id)
        .populate({
          path: 'items.productId',
          select: 'name price originalPrice images category inStock stock isActive',
          populate: {
            path: 'category',
            select: 'name slug'
          }
        });

      responseHelper.success(res, updatedCart, RESPONSE_MESSAGES.CART.ITEM_ADDED);
    } catch (error) {
      next(error);
    }
  }
];

// Update cart item quantity
exports.updateCart = [
  ...cartValidators.updateCart,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { productId, quantity, selectedSize, selectedColor } = req.body;
      
      // Find cart
      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        return responseHelper.error(res, 'Cart not found', 404);
      }

      // Find item in cart
      const itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId &&
        item.selectedSize === selectedSize &&
        item.selectedColor === selectedColor
      );

      if (itemIndex === -1) {
        return responseHelper.error(res, RESPONSE_MESSAGES.CART.NOT_FOUND, 404);
      }

      // Check product availability and stock
      const product = await Product.findOne({ 
        _id: productId, 
        isActive: true, 
        inStock: true 
      });
      
      if (!product) {
        return responseHelper.error(res, 'Product not found or unavailable', 404);
      }

      if (product.stock < quantity) {
        return responseHelper.error(res, `Only ${product.stock} items available in stock`, 400);
      }

      // Update quantity
      cart.items[itemIndex].quantity = quantity;
      await cart.save();

      // Populate and return updated cart
      const updatedCart = await Cart.findById(cart._id)
        .populate({
          path: 'items.productId',
          select: 'name price originalPrice images category inStock stock isActive',
          populate: {
            path: 'category',
            select: 'name slug'
          }
        });

      responseHelper.success(res, updatedCart, RESPONSE_MESSAGES.CART.ITEM_UPDATED);
    } catch (error) {
      next(error);
    }
  }
];

// Remove item from cart
exports.removeFromCart = [
  ...cartValidators.removeFromCart,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { productId, selectedSize, selectedColor } = req.body;
      
      const cart = await Cart.findOne({ userId: req.user._id });
      if (!cart) {
        return responseHelper.error(res, 'Cart not found', 404);
      }

      // Remove item from cart
      const initialLength = cart.items.length;
      cart.items = cart.items.filter(item => 
        !(item.productId.toString() === productId &&
          item.selectedSize === selectedSize &&
          item.selectedColor === selectedColor)
      );

      if (cart.items.length === initialLength) {
        return responseHelper.error(res, RESPONSE_MESSAGES.CART.NOT_FOUND, 404);
      }

      await cart.save();

      // Populate and return updated cart
      const updatedCart = await Cart.findById(cart._id)
        .populate({
          path: 'items.productId',
          select: 'name price originalPrice images category inStock stock isActive',
          populate: {
            path: 'category',
            select: 'name slug'
          }
        });

      responseHelper.success(res, updatedCart, RESPONSE_MESSAGES.CART.ITEM_REMOVED);
    } catch (error) {
      next(error);
    }
  }
];

// Clear entire cart
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return responseHelper.error(res, 'Cart not found', 404);
    }

    cart.items = [];
    await cart.save();

    responseHelper.success(res, cart, RESPONSE_MESSAGES.CART.CLEARED);
  } catch (error) {
    next(error);
  }
};

// Get cart item count
exports.getCartCount = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    const count = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    
    responseHelper.success(res, { count }, 'Cart count fetched successfully');
  } catch (error) {
    next(error);
  }
};