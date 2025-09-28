const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const responseHelper = require('../utils/responseHelper');

exports.validateCreate = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('subject').trim().isLength({ min: 2, max: 150 }),
  body('message').trim().isLength({ min: 5, max: 2000 }),
];

exports.create = [
  ...exports.validateCreate,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { name, email, phone, subject, message } = req.body;
      const doc = await Contact.create({
        name,
        email,
        phone,
        subject,
        message,
        user: req.user?._id,
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      return responseHelper.success(res, doc, 'Message received. We will get back to you soon.', 201);
    } catch (err) {
      next(err);
    }
  },
];

// Admin list (optional)
exports.list = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status && ['new', 'read', 'responded', 'closed'].includes(status)) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      Contact.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Contact.countDocuments(query),
    ]);

    return responseHelper.paginated(res, items, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) * parseInt(limit) < total,
      hasPrev: parseInt(page) > 1,
    }, 'Contact messages fetched');
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'responded', 'closed'].includes(status)) {
      return responseHelper.badRequest(res, 'Invalid status value');
    }

    const message = await Contact.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!message) {
      return responseHelper.notFound(res, 'Message not found');
    }

    return responseHelper.success(res, message, 'Message status updated successfully');
  } catch (err) {
    next(err);
  }
};
