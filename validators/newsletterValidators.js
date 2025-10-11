const { body, param, query } = require('express-validator');

// Newsletter subscription validation
const subscribe = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.promotions')
    .optional()
    .isBoolean()
    .withMessage('Promotions preference must be a boolean'),
  
  body('preferences.newProducts')
    .optional()
    .isBoolean()
    .withMessage('New products preference must be a boolean'),
  
  body('preferences.styleTips')
    .optional()
    .isBoolean()
    .withMessage('Style tips preference must be a boolean'),
  
  body('preferences.orderUpdates')
    .optional()
    .isBoolean()
    .withMessage('Order updates preference must be a boolean'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  body('metadata.ipAddress')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '') {
        // Only validate if IP address is provided and not empty
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(value)) {
          throw new Error('IP address must be valid');
        }
      }
      return true;
    }),
  
  body('metadata.userAgent')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('User agent must be less than 500 characters'),
  
  body('metadata.referrer')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Referrer must be less than 200 characters'),
  
  body('metadata.utmSource')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('UTM source must be less than 100 characters'),
  
  body('metadata.utmMedium')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('UTM medium must be less than 100 characters'),
  
  body('metadata.utmCampaign')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('UTM campaign must be less than 100 characters')
];

// Newsletter unsubscribe validation
const unsubscribe = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase()
];

// Newsletter update validation
const update = [
  param('id')
    .isMongoId()
    .withMessage('Invalid newsletter subscriber ID'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('status')
    .optional()
    .isIn(['active', 'unsubscribed', 'bounced'])
    .withMessage('Status must be active, unsubscribed, or bounced'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.promotions')
    .optional()
    .isBoolean()
    .withMessage('Promotions preference must be a boolean'),
  
  body('preferences.newProducts')
    .optional()
    .isBoolean()
    .withMessage('New products preference must be a boolean'),
  
  body('preferences.styleTips')
    .optional()
    .isBoolean()
    .withMessage('Style tips preference must be a boolean'),
  
  body('preferences.orderUpdates')
    .optional()
    .isBoolean()
    .withMessage('Order updates preference must be a boolean'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
];

// Newsletter list validation
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
    .isIn(['active', 'unsubscribed', 'bounced', 'all'])
    .withMessage('Status must be active, unsubscribed, bounced, or all'),
  
  query('search')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '') {
        const trimmed = value.trim();
        if (trimmed.length < 1 || trimmed.length > 100) {
          throw new Error('Search term must be between 1 and 100 characters');
        }
      }
      return true;
    }),
  
  query('sortBy')
    .optional()
    .isIn(['email', 'firstName', 'lastName', 'subscribedAt', 'emailCount'])
    .withMessage('Sort by must be email, firstName, lastName, subscribedAt, or emailCount'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Newsletter stats validation
const stats = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year', 'all'])
    .withMessage('Period must be day, week, month, year, or all')
];

// Newsletter export validation
const exportData = [
  query('format')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('Format must be csv or json'),
  
  query('status')
    .optional()
    .isIn(['active', 'unsubscribed', 'bounced', 'all'])
    .withMessage('Status must be active, unsubscribed, bounced, or all'),
  
  query('fields')
    .optional()
    .custom((value) => {
      if (value) {
        let fields;
        if (Array.isArray(value)) {
          fields = value;
        } else if (typeof value === 'string') {
          fields = value.split(',').map(field => field.trim());
        } else {
          throw new Error('Fields must be an array or comma-separated string');
        }
        
        const validFields = ['email', 'firstName', 'lastName', 'status', 'subscribedAt', 'preferences', 'tags'];
        for (const field of fields) {
          if (!validFields.includes(field)) {
            throw new Error(`Invalid field name: ${field}`);
          }
        }
      }
      return true;
    })
];

module.exports = {
  subscribe,
  unsubscribe,
  update,
  list,
  stats,
  exportData
};
