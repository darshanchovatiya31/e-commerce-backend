const { body, param, validationResult } = require('express-validator');
const Category = require('../models/Category');
const responseHelper = require('../utils/responseHelper');

// Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const { featured, includeInactive, limit, minimal } = req.query;
    
    let query = {};
    
    // Filter by active status
    if (!includeInactive) {
      query.isActive = true;
    }
    
    // Filter by featured
    if (featured === 'true') {
      query.featured = true;
    }
    
    // Select fields based on minimal flag
    // When minimal=true, only return essential fields (name, slug, _id)
    const isMinimal = minimal === 'true';
    
    let queryBuilder = Category.find(query);
    
    // Apply field selection if minimal
    if (isMinimal) {
      queryBuilder = queryBuilder.select('name slug _id');
    } else {
      // Only populate productCount if not minimal
      queryBuilder = queryBuilder.populate('productCount');
    }
    
    queryBuilder = queryBuilder.sort({ sortOrder: 1, createdAt: -1, name: 1 });
    
    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        queryBuilder = queryBuilder.limit(limitNum);
      }
    }
    
    const categories = await queryBuilder.exec();
    
    responseHelper.success(res, categories, 'Categories fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Get single category
exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let category;
    
    // Try to find by MongoDB ObjectId first
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      category = await Category.findOne({
        _id: id,
        isActive: true
      }).populate('productCount');
    } else {
      // Try to find by slug
      category = await Category.findOne({
        slug: id,
        isActive: true
      }).populate('productCount');
    }
    
    if (!category) {
      return responseHelper.error(res, 'Category not found', 404);
    }
    
    responseHelper.success(res, category, 'Category fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Create category (Admin only)
exports.createCategory = [
  body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('subcategories').optional().custom((value) => {
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
  body('featured').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { name, description, featured, sortOrder } = req.body;
      
      // Parse subcategories from JSON string if provided
      let subcategories = [];
      if (req.body.subcategories) {
        try {
          subcategories = typeof req.body.subcategories === 'string' 
            ? JSON.parse(req.body.subcategories) 
            : req.body.subcategories;
        } catch (error) {
          return responseHelper.error(res, 'Invalid subcategories format', 400);
        }
      }
      
      // Check if category name already exists
      const existingCategory = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
      if (existingCategory) {
        return responseHelper.error(res, 'Category name already exists', 400);
      }

      // Validate subcategories if provided
      if (subcategories && subcategories.length > 0) {
        for (const subcategory of subcategories) {
          if (!subcategory.name || subcategory.name.trim().length < 2) {
            return responseHelper.error(res, 'All subcategories must have a valid name', 400);
          }
        }
      }

      // Handle image upload
      let image = null;
      if (req.file) {
        image = req.file.path; // Cloudinary URL from multer-storage-cloudinary
      }

      const category = new Category({ 
        name, 
        description, 
        image, 
        subcategories: subcategories || [], 
        featured: featured || false,
        sortOrder: sortOrder || 0
      });
      
      await category.save();
      
      responseHelper.success(res, category, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
];

// Update category (Admin only)
exports.updateCategory = [
  param('id').isMongoId(),
  body('name').optional().notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('subcategories').optional().custom((value) => {
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
  body('featured').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Parse subcategories from JSON string if provided
      if (updateData.subcategories) {
        try {
          updateData.subcategories = typeof updateData.subcategories === 'string' 
            ? JSON.parse(updateData.subcategories) 
            : updateData.subcategories;
        } catch (error) {
          return responseHelper.error(res, 'Invalid subcategories format', 400);
        }
      }

      // Check if name already exists (excluding current category)
      if (updateData.name) {
        const existingCategory = await Category.findOne({ 
          name: new RegExp(`^${updateData.name}$`, 'i'), 
          _id: { $ne: id } 
        });
        if (existingCategory) {
          return responseHelper.error(res, 'Category name already exists', 400);
        }
      }

      // Validate subcategories if provided
      if (updateData.subcategories && updateData.subcategories.length > 0) {
        for (const subcategory of updateData.subcategories) {
          if (!subcategory.name || subcategory.name.trim().length < 2) {
            return responseHelper.error(res, 'All subcategories must have a valid name', 400);
          }
        }
      }

      // Handle image upload
      if (req.file) {
        updateData.image = req.file.path; // Cloudinary URL from multer-storage-cloudinary
      }

      const category = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!category) {
        return responseHelper.error(res, 'Category not found', 404);
      }

      responseHelper.success(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Delete category (Admin only)
exports.deleteCategory = [
  param('id').isMongoId(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { id } = req.params;
      
      // Check if category has products
      const Product = require('../models/Product');
      const productCount = await Product.countDocuments({ category: id });
      
      if (productCount > 0) {
        return responseHelper.error(res, 'Cannot delete category with existing products', 400);
      }

      const category = await Category.findByIdAndDelete(id);
      if (!category) {
        return responseHelper.error(res, 'Category not found', 404);
      }

      responseHelper.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
];