const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const responseHelper = require('../utils/responseHelper');
const RESPONSE_MESSAGES = require('../constants/responseMessages');
const productValidators = require('../validators/productValidators');

// Get all products with filtering, sorting, and pagination
exports.getProducts = [
  ...productValidators.getProducts,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { 
        page = 1, 
        limit = 12, 
        category, 
        sort = '-createdAt',
        search,
        minPrice,
        maxPrice
      } = req.query;

      // Build query object
      const queryObj = { isActive: true };
      
      if (category) queryObj.category = category;
      
      if (search) {
        queryObj.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      if (minPrice || maxPrice) {
        queryObj.price = {};
        if (minPrice) queryObj.price.$gte = parseFloat(minPrice);
        if (maxPrice) queryObj.price.$lte = parseFloat(maxPrice);
      }

      // Execute query with pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const products = await Product.find(queryObj)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Product.countDocuments(queryObj);
      
      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      };

      responseHelper.paginated(res, products, pagination, RESPONSE_MESSAGES.PRODUCT.FETCH_SUCCESS);
    } catch (error) {
      next(error);
    }
  }
];

// Get single product by ID
exports.getProduct = [
  ...productValidators.getProduct,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const product = await Product.findOne({ 
        _id: req.params.id, 
        isActive: true 
      }).populate('category', 'name slug');
      
      if (!product) {
        return responseHelper.error(res, RESPONSE_MESSAGES.PRODUCT.NOT_FOUND, 404);
      }

      responseHelper.success(res, product, 'Product fetched successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Create new product (Admin only)
exports.createProduct = [
  ...productValidators.create,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const productData = {
        ...req.body,
        createdBy: req.user._id
      };

      const product = new Product(productData);
      await product.save();
      
      const populatedProduct = await Product.findById(product._id)
        .populate('category', 'name slug');

      responseHelper.success(res, populatedProduct, RESPONSE_MESSAGES.PRODUCT.CREATED, 201);
    } catch (error) {
      next(error);
    }
  }
];

// Update product (Admin only)
exports.updateProduct = [
  ...productValidators.update,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return responseHelper.error(res, RESPONSE_MESSAGES.PRODUCT.NOT_FOUND, 404);
      }

      // Update product fields
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          product[key] = req.body[key];
        }
      });

      product.updatedBy = req.user._id;
      await product.save();

      const updatedProduct = await Product.findById(product._id)
        .populate('category', 'name slug');

      responseHelper.success(res, updatedProduct, RESPONSE_MESSAGES.PRODUCT.UPDATED);
    } catch (error) {
      next(error);
    }
  }
];

// Delete product (Admin only) - Soft delete
exports.deleteProduct = [
  ...productValidators.deleteProduct,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const product = await Product.findById(req.params.id);
      if (!product) {
        return responseHelper.error(res, RESPONSE_MESSAGES.PRODUCT.NOT_FOUND, 404);
      }

      // Soft delete
      product.isActive = false;
      product.deletedBy = req.user._id;
      product.deletedAt = new Date();
      await product.save();

      responseHelper.success(res, null, RESPONSE_MESSAGES.PRODUCT.DELETED);
    } catch (error) {
      next(error);
    }
  }
];

// Get featured products
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    
    const products = await Product.find({ 
      isActive: true, 
      isFeatured: true 
    })
      .populate('category', 'name slug')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .lean();

    responseHelper.success(res, products, 'Featured products fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Get new arrivals
exports.getNewArrivals = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    
    const products = await Product.find({ isActive: true })
      .populate('category', 'name slug')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .lean();

    responseHelper.success(res, products, 'New arrivals fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Get products by category
exports.getProductsByCategory = [
  ...productValidators.getProducts,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { categoryId } = req.params;
      const { page = 1, limit = 12, sort = '-createdAt' } = req.query;

      const queryObj = { 
        category: categoryId, 
        isActive: true 
      };

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const products = await Product.find(queryObj)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Product.countDocuments(queryObj);
      
      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      };

      responseHelper.paginated(res, products, pagination, 'Category products fetched successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return responseHelper.error(res, 'Search query is required', 400);
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const queryObj = {
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(queryObj)
      .populate('category', 'name slug')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(queryObj);
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
      hasPrev: parseInt(page) > 1
    };

    responseHelper.paginated(res, products, pagination, `Search results for "${q}"`);
  } catch (error) {
    next(error);
  }
};