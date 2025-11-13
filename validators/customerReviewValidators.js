const { body, param, query } = require('express-validator');

// Customer review creation validation
const create = [
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
];

// Customer review update validation
const update = [
  param('id')
    .isMongoId()
    .withMessage('Invalid customer review ID'),
  
  body('customerName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
];

// Customer review list validation
const list = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('Status must be active, inactive, or all'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['customerName', 'rating', 'createdAt', 'displayOrder'])
    .withMessage('Sort by must be customerName, rating, createdAt, or displayOrder'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Get active reviews validation
const getActive = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Get review by ID validation
const getById = [
  param('id')
    .isMongoId()
    .withMessage('Invalid customer review ID')
];

// Delete review validation
const deleteReview = [
  param('id')
    .isMongoId()
    .withMessage('Invalid customer review ID')
];

// Toggle status validation
const toggleStatus = [
  param('id')
    .isMongoId()
    .withMessage('Invalid customer review ID')
];

module.exports = {
  create,
  update,
  list,
  getActive,
  getById,
  deleteReview,
  toggleStatus
};

