const { body, param } = require('express-validator');

const cartValidators = {
  addToCart: [
    body('productId')
      .isMongoId()
      .withMessage('Please provide a valid product ID'),
    
    body('quantity')
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100'),
    
    body('selectedSize')
      .optional()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Size must be between 1 and 20 characters'),
    
    body('selectedColor')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Color must be between 1 and 30 characters')
  ],

  updateCart: [
    body('productId')
      .isMongoId()
      .withMessage('Please provide a valid product ID'),
    
    body('quantity')
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100'),
    
    body('selectedSize')
      .optional()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Size must be between 1 and 20 characters'),
    
    body('selectedColor')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Color must be between 1 and 30 characters')
  ],

  removeFromCart: [
    body('productId')
      .isMongoId()
      .withMessage('Please provide a valid product ID'),
    
    body('selectedSize')
      .optional()
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Size must be between 1 and 20 characters'),
    
    body('selectedColor')
      .optional()
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Color must be between 1 and 30 characters')
  ]
};

module.exports = cartValidators;