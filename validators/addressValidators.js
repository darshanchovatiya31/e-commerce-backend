const { body, param } = require('express-validator');

const addressFields = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Invalid phone number'),
  body('address').trim().isLength({ min: 5, max: 200 }).withMessage('Address must be 5-200 characters'),
  body('city').trim().isLength({ min: 2, max: 50 }).withMessage('City must be 2-50 characters'),
  body('state').trim().isLength({ min: 2, max: 50 }).withMessage('State must be 2-50 characters'),
  body('pincode').trim().matches(/^[1-9][0-9]{5}$/).withMessage('Invalid pincode'),
  body('country').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Country must be 2-50 characters'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be boolean'),
];

const partialAddressFields = [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().trim().matches(/^[6-9]\d{9}$/),
  body('address').optional().trim().isLength({ min: 5, max: 200 }),
  body('city').optional().trim().isLength({ min: 2, max: 50 }),
  body('state').optional().trim().isLength({ min: 2, max: 50 }),
  body('pincode').optional().trim().matches(/^[1-9][0-9]{5}$/),
  body('country').optional().trim().isLength({ min: 2, max: 50 }),
  body('isDefault').optional().isBoolean(),
];

const idParam = [param('addressId').isMongoId().withMessage('Invalid address id')];

module.exports = { addressFields, partialAddressFields, idParam };