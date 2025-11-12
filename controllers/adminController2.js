const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
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

    // Collect stats for these customers
    const userIds = customers.map((c) => c._id);
    const statsAgg = await Order.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);
    const statsMap = new Map(statsAgg.map((s) => [s._id.toString(), s]));

    const customersWithStats = customers.map((c) => {
      const st = statsMap.get(c._id.toString());
      return {
        ...c.toObject(),
        stats: {
          orderCount: st?.orderCount || 0,
          totalSpent: st?.totalSpent || 0,
          lastOrderDate: st?.lastOrderDate || null,
        },
      };
    });

    const totalPages = Math.ceil(totalCustomers / parseInt(limit));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCustomers,
      pages: totalPages,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1,
    };

    return responseHelper.success(
      res,
      { customers: customersWithStats, pagination },
      'Customers fetched successfully'
    );
  } catch (error) {
    console.error('Customers error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Get customer orders
exports.getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Verify customer exists
    const customer = await User.findById(customerId);
    if (!customer) {
      return responseHelper.error(res, 'Customer not found', 404);
    }

    // Get customer orders with populated product details
    const orders = await Order.find({ userId: customerId })
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 })
      .lean();

    return responseHelper.success(
      res,
      orders,
      'Customer orders fetched successfully'
    );
  } catch (error) {
    console.error('Customer orders error:', error);
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

// Get orders (admin)
exports.getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status !== 'all') {
      filter.orderStatus = status;
    }

    // Search by user name or email
    const userMatch = [];
    if (search) {
      userMatch.push({ 'userId.firstName': { $regex: search, $options: 'i' } });
      userMatch.push({ 'userId.lastName': { $regex: search, $options: 'i' } });
      userMatch.push({ 'userId.email': { $regex: search, $options: 'i' } });
    }

    // Sorting
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Query with population for user and product fields used by frontend
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('items.productId', 'name images')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter)
    ]);

    // Transform to match adminApi.AdminOrderSchema
    const mapped = orders.map(o => ({
      _id: o._id.toString(),
      orderId: o.orderId || o._id.toString().slice(-8).toUpperCase(),
      user: {
        firstName: o.userId?.firstName || '',
        lastName: o.userId?.lastName || '',
        email: o.userId?.email || '',
      },
      items: o.items.map(it => ({
        product: {
          name: it.productId?.name || it.name,
          images: it.productId?.images || (it.image ? [it.image] : []),
        },
        quantity: it.quantity,
        price: it.price,
      })),
      totalAmount: o.total,
      status: o.orderStatus,
      shippingAddress: o.shippingAddress ? {
        street: o.shippingAddress.address,
        city: o.shippingAddress.city,
        state: o.shippingAddress.state,
        zipCode: o.shippingAddress.pincode,
        country: o.shippingAddress.country || 'India'
      } : undefined,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1,
    };

    return responseHelper.success(
      res,
      { orders: mapped, pagination },
      'Orders fetched successfully'
    );
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

    // Attach stats like in getCustomers for consistency with frontend schema
    const statsAgg = await Order.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);
    const st = statsAgg[0];

    const userWithStats = {
      ...user.toObject(),
      stats: {
        orderCount: st?.orderCount || 0,
        totalSpent: st?.totalSpent || 0,
        lastOrderDate: st?.lastOrderDate || null,
      },
    };

    return responseHelper.success(
      res,
      userWithStats,
      `User ${isActive ? 'activated' : 'deactivated'} successfully`
    );
  } catch (error) {
    console.error('Update user status error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Update order status (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending','confirmed','processing','shipped','delivered','cancelled','returned'];
    if (!allowed.includes(status)) {
      return responseHelper.error(res, 'Invalid status', 400);
    }

    const order = await Order.findById(id).populate('items.productId', 'name images').populate('userId', 'firstName lastName email');
    if (!order) {
      return responseHelper.error(res, 'Order not found', 404);
    }

    order.orderStatus = status;
    await order.save();

    const mapped = {
      _id: order._id.toString(),
      user: {
        firstName: order.userId?.firstName || '',
        lastName: order.userId?.lastName || '',
        email: order.userId?.email || '',
      },
      items: order.items.map(it => ({
        product: {
          name: it.productId?.name || it.name,
          images: it.productId?.images || (it.image ? [it.image] : []),
        },
        quantity: it.quantity,
        price: it.price,
      })),
      totalAmount: order.total,
      status: order.orderStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    return responseHelper.success(res, mapped, 'Order status updated successfully');
  } catch (error) {
    console.error('Update order status error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};