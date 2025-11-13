const CustomerReview = require('../models/CustomerReview');
const { validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

// Get all active customer reviews (for public display)
exports.getActiveReviews = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const reviews = await CustomerReview.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    return responseHelper.success(res, {
      reviews
    }, 'Customer reviews fetched successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Get all customer reviews (Admin only)
exports.getAllReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const reviews = await CustomerReview.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await CustomerReview.countDocuments(query);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
      hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
      hasPrev: parseInt(page) > 1
    };

    return responseHelper.success(res, {
      reviews,
      pagination
    }, 'Customer reviews retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Get single customer review by ID
exports.getReviewById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await CustomerReview.findById(id);
    if (!review) {
      return responseHelper.error(res, 'Customer review not found', 404);
    }

    return responseHelper.success(res, {
      review
    }, 'Customer review retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Create new customer review (Admin only)
exports.createReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const { customerName, location, rating, comment, displayOrder } = req.body;

    const review = new CustomerReview({
      customerName,
      location,
      rating,
      comment,
      displayOrder: displayOrder || 0,
      isActive: true
    });

    await review.save();

    return responseHelper.success(res, {
      review: {
        id: review._id,
        customerName: review.customerName,
        location: review.location,
        rating: review.rating,
        comment: review.comment,
        isActive: review.isActive,
        displayOrder: review.displayOrder,
        createdAt: review.createdAt
      }
    }, 'Customer review created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update customer review (Admin only)
exports.updateReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const { id } = req.params;
    const updateData = req.body;

    const review = await CustomerReview.findById(id);
    if (!review) {
      return responseHelper.error(res, 'Customer review not found', 404);
    }

    // Update review
    Object.assign(review, updateData);
    await review.save();

    return responseHelper.success(res, {
      review: {
        id: review._id,
        customerName: review.customerName,
        location: review.location,
        rating: review.rating,
        comment: review.comment,
        isActive: review.isActive,
        displayOrder: review.displayOrder,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      }
    }, 'Customer review updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Delete customer review (Admin only)
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await CustomerReview.findById(id);
    if (!review) {
      return responseHelper.error(res, 'Customer review not found', 404);
    }

    await review.deleteOne();

    return responseHelper.success(res, {
      message: 'Customer review deleted successfully'
    }, 'Customer review deleted successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Toggle review active status (Admin only)
exports.toggleReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await CustomerReview.findById(id);
    if (!review) {
      return responseHelper.error(res, 'Customer review not found', 404);
    }

    review.isActive = !review.isActive;
    await review.save();

    return responseHelper.success(res, {
      review: {
        id: review._id,
        isActive: review.isActive
      }
    }, `Customer review ${review.isActive ? 'activated' : 'deactivated'} successfully`, 200);
  } catch (error) {
    next(error);
  }
};

