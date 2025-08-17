const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const Category = require('../models/Category');
const responseHelper = require('../utils/responseHelper');
const RESPONSE_MESSAGES = require('../constants/responseMessages');
const productValidators = require('../validators/productValidators');

// Middleware to convert category slug to ID
const convertCategorySlugToId = async (req, res, next) => {
  try {
    console.log('Middleware called with category:', req.query.category);
    if (req.query.category) {
      // Check if it's already a MongoDB ID
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!mongoIdRegex.test(req.query.category)) {
        console.log('Converting slug to ID:', req.query.category);
        // It's a slug, convert to ID
        const categoryDoc = await Category.findOne({ slug: req.query.category });
        if (categoryDoc) {
          console.log('Found category:', categoryDoc._id);
          req.query.category = categoryDoc._id.toString();
        } else {
          console.log('Category not found, removing from query');
          // Invalid category slug, remove it from query
          delete req.query.category;
        }
      }
    }
    next();
  } catch (error) {
    console.error('Middleware error:', error);
    next(error);
  }
};

// Get all products with filtering, sorting, and pagination
exports.getProducts = async (req, res, next) => {
  try {

      const { 
        page = 1, 
        limit = 12, 
        category, 
        sort = '-createdAt',
        search,
        minPrice,
        maxPrice,
        featured,
        onSale
      } = req.query;

      // Build query object
      const queryObj = { inStock: true };
      
      // Handle category filtering by slug or ID
      if (category) {
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        if (mongoIdRegex.test(category)) {
          // It's already a MongoDB ID
          queryObj.category = category;
        } else {
          // It's a slug, convert to ID
          const categoryDoc = await Category.findOne({ slug: category });
          if (categoryDoc) {
            queryObj.category = categoryDoc._id;
          }
          // If category not found, don't add to query (will return no results)
        }
      }
      
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

      // Handle featured products filter
      if (featured === 'true') {
        queryObj.isFeatured = true;
      }

      // Handle sale/discount filter
      if (onSale === 'true') {
        queryObj.$expr = {
          $lt: ['$price', '$originalPrice']
        };
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
  };

// Get products for shop page (without strict validation)
exports.getProductsForShop = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      sort = '-createdAt',
      search,
      minPrice,
      maxPrice,
      featured,
      onSale
    } = req.query;

    // Build query object
    const queryObj = { inStock: true };
    
    // Handle category filtering by slug or ID
    if (category) {
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      if (mongoIdRegex.test(category)) {
        // It's already a MongoDB ID
        queryObj.category = category;
      } else {
        // It's a slug, convert to ID
        const categoryDoc = await Category.findOne({ slug: category });
        if (categoryDoc) {
          queryObj.category = categoryDoc._id;
        }
        // If category not found, don't add to query (will return no results)
      }
    }
    
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

    // Handle featured products filter
    if (featured === 'true') {
      queryObj.isFeatured = true;
    }

    // Handle sale/discount filter
    if (onSale === 'true') {
      queryObj.$expr = {
        $lt: ['$price', '$originalPrice']
      };
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
};

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

// Delete product (Admin only) - Hard delete
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

      // Hard delete - actually remove from database
      await Product.findByIdAndDelete(req.params.id);

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

// Get all products for admin (including inactive ones)
exports.getAllProductsAdmin = [
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
        maxPrice,
        status = 'all' // all, active, inactive
      } = req.query;

      // Build query object (don't filter by isActive for admin)
      const queryObj = {};
      
      if (category && category !== 'all') queryObj.category = category;
      
      if (status === 'active') queryObj.isActive = true;
      else if (status === 'inactive') queryObj.isActive = false;
      
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
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
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

      // Add statistics
      const stats = {
        total: await Product.countDocuments({}),
        active: await Product.countDocuments({ isActive: true }),
        inactive: await Product.countDocuments({ isActive: false }),
        featured: await Product.countDocuments({ isFeatured: true, isActive: true }),
        outOfStock: await Product.countDocuments({ inStock: false }),
        lowStock: await Product.countDocuments({ stock: { $lte: 10, $gt: 0 } })
      };

      responseHelper.paginated(res, products, pagination, RESPONSE_MESSAGES.PRODUCT.FETCH_SUCCESS, { stats });
    } catch (error) {
      next(error);
    }
  }
];

// Toggle product status (active/inactive)
exports.toggleProductStatus = [
  ...productValidators.getProduct,
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

      product.isActive = !product.isActive;
      product.updatedBy = req.user._id;
      await product.save();

      const updatedProduct = await Product.findById(product._id)
        .populate('category', 'name slug');

      responseHelper.success(res, updatedProduct, `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }
];

// Toggle featured status
exports.toggleFeatured = [
  ...productValidators.getProduct,
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

      product.isFeatured = !product.isFeatured;
      product.updatedBy = req.user._id;
      await product.save();

      const updatedProduct = await Product.findById(product._id)
        .populate('category', 'name slug');

      responseHelper.success(res, updatedProduct, `Product ${product.isFeatured ? 'marked as featured' : 'removed from featured'}`);
    } catch (error) {
      next(error);
    }
  }
];