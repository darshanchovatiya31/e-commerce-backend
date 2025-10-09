const { validationResult, body, param } = require('express-validator');
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
  body('name').notEmpty().trim().isLength({ min: 2, max: 200 }),
  body('description').notEmpty().trim().isLength({ min: 10, max: 2000 }),
  body('price').isFloat({ min: 0.01 }),
  body('originalPrice').optional().isFloat({ min: 0.01 }),
  body('category').isMongoId(),
  body('stock').optional().isInt({ min: 0 }),
  body('colors').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return Array.isArray(value);
  }),
  body('sizes').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return Array.isArray(value);
  }),
  body('tags').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return Array.isArray(value);
  }),
  body('material').optional().trim().isLength({ max: 100 }),
  body('subcategory').optional().trim().isLength({ max: 100 }),
  body('isFeatured').optional().isBoolean(),
  body('isNew').optional().isBoolean(),
  body('inStock').optional().isBoolean(),
  body('rating').optional().isFloat({ min: 0, max: 5 }),
  body('reviewCount').optional().isInt({ min: 0 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { name, description, price, originalPrice, category, stock, material, subcategory, isFeatured, isNew, inStock } = req.body;
      
      // Parse JSON strings for arrays
      let colors = [];
      let sizes = [];
      let tags = [];
      
      if (req.body.colors) {
        try {
          colors = typeof req.body.colors === 'string' ? JSON.parse(req.body.colors) : req.body.colors;
        } catch (error) {
          return responseHelper.error(res, 'Invalid colors format', 400);
        }
      }
      
      if (req.body.sizes) {
        try {
          sizes = typeof req.body.sizes === 'string' ? JSON.parse(req.body.sizes) : req.body.sizes;
        } catch (error) {
          return responseHelper.error(res, 'Invalid sizes format', 400);
        }
      }
      
      if (req.body.tags) {
        try {
          tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        } catch (error) {
          return responseHelper.error(res, 'Invalid tags format', 400);
        }
      }
      
      // Handle multiple image uploads
      let images = [];
      if (req.files && req.files.length > 0) {
        images = req.files.map(file => file.path); // Cloudinary URLs from multer-storage-cloudinary
      }

      const productData = {
        name,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
        category,
        stock: stock ? parseInt(stock) : 0,
        colors,
        sizes,
        images,
        tags,
        material: material || '',
        subcategory: subcategory || '',
        isFeatured: isFeatured || false,
        isNew: isNew !== undefined ? isNew : true,
        inStock: inStock !== undefined ? inStock : true,
        rating: req.body.rating ? parseFloat(req.body.rating) : 0,
        reviewCount: req.body.reviewCount ? parseInt(req.body.reviewCount) : 0,
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
  param('id').isMongoId(),
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('price').optional().isFloat({ min: 0.01 }),
  body('originalPrice').optional().isFloat({ min: 0.01 }),
  body('category').optional().isMongoId(),
  body('stock').optional().isInt({ min: 0 }),
  body('colors').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return Array.isArray(value);
  }),
  body('sizes').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return Array.isArray(value);
  }),
  body('tags').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return Array.isArray(value);
  }),
  body('material').optional().trim().isLength({ max: 100 }),
  body('subcategory').optional().trim().isLength({ max: 100 }),
  body('isFeatured').optional().isBoolean(),
  body('isNew').optional().isBoolean(),
  body('inStock').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  body('rating').optional().isFloat({ min: 0, max: 5 }),
  body('reviewCount').optional().isInt({ min: 0 }),
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

      // Handle multiple image uploads
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path); // Cloudinary URLs from multer-storage-cloudinary
        product.images = newImages;
      }

      // Parse JSON strings for arrays
      if (req.body.colors !== undefined) {
        try {
          product.colors = typeof req.body.colors === 'string' ? JSON.parse(req.body.colors) : req.body.colors;
        } catch (error) {
          return responseHelper.error(res, 'Invalid colors format', 400);
        }
      }
      
      if (req.body.sizes !== undefined) {
        try {
          product.sizes = typeof req.body.sizes === 'string' ? JSON.parse(req.body.sizes) : req.body.sizes;
        } catch (error) {
          return responseHelper.error(res, 'Invalid sizes format', 400);
        }
      }
      
      if (req.body.tags !== undefined) {
        try {
          product.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
        } catch (error) {
          return responseHelper.error(res, 'Invalid tags format', 400);
        }
      }

      // Update other product fields
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined && key !== 'images' && key !== 'colors' && key !== 'sizes' && key !== 'tags') {
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
        limit = 10, 
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