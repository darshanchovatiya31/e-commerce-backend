const { body, query, param, validationResult } = require('express-validator');
const Product = require('../models/Product');

exports.getProducts = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  query('category').optional().isMongoId(),
  query('sort').optional().isIn(['price', '-price', 'createdAt', '-createdAt']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page = 1, limit = 10, category, sort } = req.query;
      const queryObj = category ? { category } : {};
      const products = await Product.find(queryObj)
        .populate('category')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Product.countDocuments(queryObj);
      
      res.json({
        products,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      next(error);
    }
  }
];

exports.getProduct = [
  param('id').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await Product.findById(req.params.id).populate('category');
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
];

exports.createProduct = [
  body('name').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('originalPrice').isFloat({ min: 0 }),
  body('category').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = new Product(req.body);
      await product.save();
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }
];

// Implement updateProduct, deleteProduct, getFeaturedProducts, getNewArrivals, searchProducts similarly