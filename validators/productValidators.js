const { body, query, param } = require('express-validator');

const productValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Product name is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Product name must be between 2 and 200 characters'),
    
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Product description is required')
      .isLength({ min: 10, max: 2000 })
      .withMessage('Product description must be between 10 and 2000 characters'),
    
    body('price')
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number'),
    
    body('originalPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Original price must be a positive number'),
    
    body('category')
      .isMongoId()
      .withMessage('Please provide a valid category ID'),
    
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array'),
    
    body('images.*')
      .optional()
      .isURL()
      .withMessage('Each image must be a valid URL'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean value')
  ],

  update: [
    param('id')
      .isMongoId()
      .withMessage('Please provide a valid product ID'),
    
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Product name must be between 2 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Product description must be between 10 and 2000 characters'),
    
    body('price')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number'),
    
    body('originalPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Original price must be a positive number'),
    
    body('category')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid category ID'),
    
    body('stock')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock must be a non-negative integer'),
    
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array'),
    
    body('images.*')
      .optional()
      .isURL()
      .withMessage('Each image must be a valid URL'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean value')
  ],

  getProducts: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('category')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid category ID'),
    
    query('sort')
      .optional()
      .isIn(['price', '-price', 'createdAt', '-createdAt', 'name', '-name'])
      .withMessage('Invalid sort parameter'),
    
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters'),
    
    query('minPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be a non-negative number'),
    
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a non-negative number')
  ],

  getProduct: [
    param('id')
      .isMongoId()
      .withMessage('Please provide a valid product ID')
  ],

  deleteProduct: [
    param('id')
      .isMongoId()
      .withMessage('Please provide a valid product ID')
  ]
};

module.exports = productValidators;