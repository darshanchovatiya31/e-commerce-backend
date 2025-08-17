const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const responseHelper = require('../utils/responseHelper');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('Dashboard stats requested');
    
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();
    
    const stats = {
      overview: {
        totalUsers,
        totalProducts,
        totalCategories,
        totalOrders: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0
      },
      growth: {
        users: { current: totalUsers, previous: 0, growth: 0 },
        orders: { current: 0, previous: 0, growth: 0 },
        revenue: { current: 0, previous: 0, growth: 0 }
      },
      recentOrders: [],
      topProducts: [],
      lowStockProducts: [],
      categoryStats: []
    };

    return responseHelper.success(res, stats, 'Dashboard statistics fetched successfully');
  } catch (error) {
    console.error('Dashboard error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { role: 'customer' };
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' }},
        { lastName: { $regex: search, $options: 'i' }},
        { email: { $regex: search, $options: 'i' }}
      ];
    }

    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const [customers, totalCustomers] = await Promise.all([
      User.find(query)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCustomers / parseInt(limit));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCustomers,
      pages: totalPages,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    };

    return responseHelper.paginated(res, { customers }, pagination, 'Customers fetched successfully');
  } catch (error) {
    console.error('Customers error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' }},
        { description: { $regex: search, $options: 'i' }}
      ];
    }

    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalProducts,
      pages: totalPages,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    };

    return responseHelper.paginated(res, { products }, pagination, 'Products fetched successfully');
  } catch (error) {
    console.error('Products error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Get orders (simplified)
exports.getOrders = async (req, res) => {
  try {
    const pagination = {
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
      hasNext: false,
      hasPrev: false
    };

    return responseHelper.paginated(res, { orders: [] }, pagination, 'Orders fetched successfully');
  } catch (error) {
    console.error('Orders error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Get analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const analytics = {
      period,
      salesData: [],
      userRegistrations: [],
      productPerformance: [],
      categoryPerformance: []
    };

    return responseHelper.success(res, analytics, 'Analytics data fetched successfully');
  } catch (error) {
    console.error('Analytics error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return responseHelper.error(res, 'User not found', 404);
    }

    return responseHelper.success(res, user, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('Update user status error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Update order status (placeholder)
exports.updateOrderStatus = async (req, res) => {
  try {
    return responseHelper.success(res, null, 'Order status update not implemented yet');
  } catch (error) {
    console.error('Update order status error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};