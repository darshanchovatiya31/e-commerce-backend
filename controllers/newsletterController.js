const Newsletter = require('../models/Newsletter');
const { validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');
const RESPONSE_MESSAGES = require('../constants/responseMessages');

// Subscribe to newsletter
exports.subscribe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const { mobileNumber, firstName, lastName, preferences, tags, metadata } = req.body;

    // Check if mobile number already exists
    const existingSubscriber = await Newsletter.findByMobileNumber(mobileNumber);
    if (existingSubscriber) {
      if (existingSubscriber.status === 'unsubscribed') {
        // Resubscribe the user
        existingSubscriber.status = 'active';
        existingSubscriber.unsubscribedAt = undefined;
        
        // Update preferences if provided
        if (preferences) {
          existingSubscriber.preferences = { ...existingSubscriber.preferences, ...preferences };
        }
        
        // Update tags if provided
        if (tags) {
          existingSubscriber.tags = [...new Set([...existingSubscriber.tags, ...tags])];
        }
        
        // Update metadata if provided
        if (metadata) {
          existingSubscriber.metadata = { ...existingSubscriber.metadata, ...metadata };
        }
        
        await existingSubscriber.save();
        
        return responseHelper.success(res, {
          subscriber: existingSubscriber,
          message: 'Successfully resubscribed to newsletter'
        }, 'Welcome back! You have been resubscribed to our newsletter.', 200);
      } else {
        return responseHelper.error(res, 'Mobile number is already subscribed to newsletter', 400);
      }
    }

    // Create new subscriber
    const subscriber = new Newsletter({
      mobileNumber,
      firstName,
      lastName,
      preferences: preferences || {
        promotions: true,
        newProducts: true,
        styleTips: true,
        orderUpdates: true
      },
      tags: tags || [],
      metadata: {
        ...metadata,
        // Remove empty IP address if present
        ...(metadata?.ipAddress && metadata.ipAddress.trim() !== '' ? { ipAddress: metadata.ipAddress } : {})
      } || {},
      source: 'website'
    });

    await subscriber.save();

    // Send welcome SMS (optional)
    try {
      // TODO: Implement welcome SMS sending
      console.log(`Welcome SMS sent to: ${mobileNumber}`);
    } catch (smsError) {
      console.error('Welcome SMS failed:', smsError);
      // Don't fail subscription if SMS fails
    }

    responseHelper.success(res, {
      subscriber: {
        id: subscriber._id,
        mobileNumber: subscriber.mobileNumber,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        status: subscriber.status,
        subscribedAt: subscriber.subscribedAt,
        preferences: subscriber.preferences
      }
    }, 'Successfully subscribed to newsletter!', 201);

  } catch (error) {
    next(error);
  }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const { mobileNumber } = req.body;

    const subscriber = await Newsletter.findByMobileNumber(mobileNumber);
    if (!subscriber) {
      return responseHelper.error(res, 'Mobile number not found in newsletter subscribers', 404);
    }

    if (subscriber.status === 'unsubscribed') {
      return responseHelper.error(res, 'Mobile number is already unsubscribed', 400);
    }

    await subscriber.unsubscribe();

    responseHelper.success(res, {
      message: 'Successfully unsubscribed from newsletter'
    }, 'You have been unsubscribed from our newsletter.', 200);

  } catch (error) {
    next(error);
  }
};

// Get newsletter subscribers (Admin only)
exports.getSubscribers = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const {
      page = 1,
      limit = 20,
      status = 'all',
      search = '',
      sortBy = 'subscribedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { mobileNumber: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const subscribers = await Newsletter.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-metadata -__v');

    const total = await Newsletter.countDocuments(query);

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    responseHelper.success(res, {
      subscribers,
      pagination
    }, 'Newsletter subscribers retrieved successfully', 200);

  } catch (error) {
    next(error);
  }
};

// Get newsletter statistics (Admin only)
exports.getStats = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const { period = 'all' } = req.query;

    // Build date filter
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        dateFilter.subscribedAt = { $gte: startDate };
      }
    }

    // Get basic stats
    const totalSubscribers = await Newsletter.countDocuments({ isActive: true, ...dateFilter });
    const activeSubscribers = await Newsletter.countDocuments({ 
      status: 'active', 
      isActive: true, 
      ...dateFilter 
    });
    const unsubscribedSubscribers = await Newsletter.countDocuments({ 
      status: 'unsubscribed', 
      isActive: true, 
      ...dateFilter 
    });
    const bouncedSubscribers = await Newsletter.countDocuments({ 
      status: 'bounced', 
      isActive: true, 
      ...dateFilter 
    });

    // Get subscription trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const subscriptionTrends = await Newsletter.aggregate([
      {
        $match: {
          subscribedAt: { $gte: thirtyDaysAgo },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$subscribedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get top tags
    const topTags = await Newsletter.aggregate([
      { $match: { isActive: true, ...dateFilter } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get preferences breakdown
    const preferencesStats = await Newsletter.aggregate([
      { $match: { isActive: true, ...dateFilter } },
      {
        $group: {
          _id: null,
          promotions: { $sum: { $cond: ['$preferences.promotions', 1, 0] } },
          newProducts: { $sum: { $cond: ['$preferences.newProducts', 1, 0] } },
          styleTips: { $sum: { $cond: ['$preferences.styleTips', 1, 0] } },
          orderUpdates: { $sum: { $cond: ['$preferences.orderUpdates', 1, 0] } }
        }
      }
    ]);

    const stats = {
      overview: {
        total: totalSubscribers,
        active: activeSubscribers,
        unsubscribed: unsubscribedSubscribers,
        bounced: bouncedSubscribers,
        activeRate: totalSubscribers > 0 ? ((activeSubscribers / totalSubscribers) * 100).toFixed(2) : 0
      },
      trends: {
        subscriptionTrends,
        topTags
      },
      preferences: preferencesStats[0] || {
        promotions: 0,
        newProducts: 0,
        styleTips: 0,
        orderUpdates: 0
      },
      period
    };

    responseHelper.success(res, stats, 'Newsletter statistics retrieved successfully', 200);

  } catch (error) {
    next(error);
  }
};

// Update subscriber (Admin only)
exports.updateSubscriber = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const { id } = req.params;
    const updateData = req.body;

    const subscriber = await Newsletter.findById(id);
    if (!subscriber) {
      return responseHelper.error(res, 'Newsletter subscriber not found', 404);
    }

    // Update subscriber
    Object.assign(subscriber, updateData);
    await subscriber.save();

    responseHelper.success(res, {
      subscriber: {
        id: subscriber._id,
        mobileNumber: subscriber.mobileNumber,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        status: subscriber.status,
        subscribedAt: subscriber.subscribedAt,
        preferences: subscriber.preferences,
        tags: subscriber.tags
      }
    }, 'Newsletter subscriber updated successfully', 200);

  } catch (error) {
    next(error);
  }
};

// Delete subscriber (Admin only)
exports.deleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subscriber = await Newsletter.findById(id);
    if (!subscriber) {
      return responseHelper.error(res, 'Newsletter subscriber not found', 404);
    }

    // Soft delete
    subscriber.isActive = false;
    await subscriber.save();

    responseHelper.success(res, {
      message: 'Newsletter subscriber deleted successfully'
    }, 'Newsletter subscriber deleted successfully', 200);

  } catch (error) {
    next(error);
  }
};

// Export subscribers (Admin only)
exports.exportSubscribers = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseHelper.validationError(res, errors);
    }

    const {
      format = 'csv',
      status = 'all',
      fields = ['mobileNumber', 'firstName', 'lastName', 'status', 'subscribedAt']
    } = req.query;

    // Handle fields parameter - convert string to array if needed
    let fieldsArray = fields;
    if (typeof fields === 'string') {
      fieldsArray = fields.split(',').map(field => field.trim());
    }

    // Build query
    const query = { isActive: true };
    if (status !== 'all') {
      query.status = status;
    }

    const subscribers = await Newsletter.find(query)
      .select(fieldsArray.join(' '))
      .sort({ subscribedAt: -1 });

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = fieldsArray.join(',');
      const csvRows = subscribers.map(subscriber => {
        return fieldsArray.map(field => {
          const value = subscriber[field];
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return value || '';
        }).join(',');
      });

      const csvContent = [csvHeader, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=newsletter-subscribers.csv');
      res.send(csvContent);
    } else {
      // Return JSON
      responseHelper.success(res, {
        subscribers,
        count: subscribers.length,
        exportedAt: new Date().toISOString()
      }, 'Newsletter subscribers exported successfully', 200);
    }

  } catch (error) {
    next(error);
  }
};

// Bulk operations (Admin only)
exports.bulkAction = async (req, res, next) => {
  try {
    const { action, subscriberIds } = req.body;

    if (!action || !subscriberIds || !Array.isArray(subscriberIds)) {
      return responseHelper.error(res, 'Invalid bulk action parameters', 400);
    }

    let updateData = {};
    let message = '';

    switch (action) {
      case 'unsubscribe':
        updateData = { status: 'unsubscribed', unsubscribedAt: new Date() };
        message = 'Subscribers unsubscribed successfully';
        break;
      case 'activate':
        updateData = { status: 'active', unsubscribedAt: undefined };
        message = 'Subscribers activated successfully';
        break;
      case 'delete':
        updateData = { isActive: false };
        message = 'Subscribers deleted successfully';
        break;
      default:
        return responseHelper.error(res, 'Invalid bulk action', 400);
    }

    const result = await Newsletter.updateMany(
      { _id: { $in: subscriberIds } },
      updateData
    );

    responseHelper.success(res, {
      modifiedCount: result.modifiedCount,
      action
    }, message, 200);

  } catch (error) {
    next(error);
  }
};
