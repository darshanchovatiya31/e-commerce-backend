const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const responseHelper = require('../utils/responseHelper');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('Dashboard stats requested');
    
    // Date calculations
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    
    // Basic counts
    const [totalUsers, totalProducts, totalCategories, totalOrders] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments(),
      Category.countDocuments(),
      Order.countDocuments()
    ]);

    // Revenue calculations
    const [currentMonthRevenue, previousMonthRevenue, yearlyRevenue] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfCurrentMonth },
            orderStatus: { $ne: 'cancelled' }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
            orderStatus: { $ne: 'cancelled' }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfCurrentYear },
            orderStatus: { $ne: 'cancelled' }
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    const monthlyRevenue = currentMonthRevenue[0]?.total || 0;
    const prevMonthRevenue = previousMonthRevenue[0]?.total || 0;
    const yearlyRev = yearlyRevenue[0]?.total || 0;

    // Order counts for current and previous month
    const [currentMonthOrders, previousMonthOrders] = await Promise.all([
      Order.countDocuments({
        createdAt: { $gte: startOfCurrentMonth },
        orderStatus: { $ne: 'cancelled' }
      }),
      Order.countDocuments({
        createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
        orderStatus: { $ne: 'cancelled' }
      })
    ]);

    // User counts for current and previous month
    const [currentMonthUsers, previousMonthUsers] = await Promise.all([
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: startOfCurrentMonth }
      }),
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth }
      })
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    };

    const revenueGrowth = calculateGrowth(monthlyRevenue, prevMonthRevenue);
    const ordersGrowth = calculateGrowth(currentMonthOrders, previousMonthOrders);
    const usersGrowth = calculateGrowth(currentMonthUsers, previousMonthUsers);

    // Recent orders (last 10)
    const recentOrders = await Order.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .then(orders => orders.map(order => ({
        _id: order._id.toString(),
        user: {
          firstName: order.userId?.firstName || order.guest?.name?.split(' ')[0] || 'Guest',
          lastName: order.userId?.lastName || order.guest?.name?.split(' ').slice(1).join(' ') || '',
          email: order.userId?.email || order.guest?.email || ''
        },
        totalAmount: order.total,
        status: order.orderStatus,
        createdAt: order.createdAt
      })));

    // Top products by revenue and quantity sold
    const topProductsAgg = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: 'cancelled' },
          createdAt: { $gte: startOfCurrentMonth }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    const productIds = topProductsAgg.map(p => p._id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('name images')
      .lean();

    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    const topProducts = topProductsAgg
      .filter(p => p._id && productMap.has(p._id.toString()))
      .map(p => ({
        product: {
          _id: p._id.toString(),
          name: productMap.get(p._id.toString()).name,
          image: productMap.get(p._id.toString()).images?.[0] || null
        },
        totalSold: p.totalSold,
        revenue: p.revenue
      }));

    // Low stock products (stock < 10)
    const lowStockProducts = await Product.find({
      stock: { $lt: 10 },
      isActive: true
    })
      .select('name stock images')
      .sort({ stock: 1 })
      .limit(10)
      .lean()
      .then(products => products.map(p => ({
        _id: p._id.toString(),
        name: p.name,
        stock: p.stock,
        image: p.images?.[0] || null
      })));

    // Category stats
    const categoryStats = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          productCount: { $size: '$products' },
          activeProducts: {
            $size: {
              $filter: {
                input: '$products',
                as: 'product',
                cond: { $eq: ['$$product.isActive', true] }
              }
            }
          }
        }
      },
      { $sort: { productCount: -1 } }
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalProducts,
        totalCategories,
        totalOrders,
        monthlyRevenue,
        yearlyRevenue: yearlyRev
      },
      growth: {
        users: {
          current: currentMonthUsers,
          previous: previousMonthUsers,
          growth: usersGrowth
        },
        orders: {
          current: currentMonthOrders,
          previous: previousMonthOrders,
          growth: ordersGrowth
        },
        revenue: {
          current: monthlyRevenue,
          previous: prevMonthRevenue,
          growth: revenueGrowth
        }
      },
      recentOrders,
      topProducts,
      lowStockProducts,
      categoryStats
    };

    return responseHelper.success(res, stats, 'Dashboard statistics fetched successfully');
  } catch (error) {
    console.error('Dashboard error:', error);
    return responseHelper.error(res, error.message, 500);
  }
};

// Export all customers to CSV
exports.exportCustomers = async (req, res) => {
  try {
    // Get all customers without pagination
    let query = { role: 'customer' };
    
    const customers = await User.find(query)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 });

    // Collect stats for all customers
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

    // CSV Headers
    const headers = [
      'Customer ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Status',
      'Total Orders',
      'Total Spent (₹)',
      'Last Order Date',
      'Joined Date',
      'Gender',
      'Date of Birth'
    ];

    // Prepare CSV rows
    const csvRows = customers.map((c) => {
      const st = statsMap.get(c._id.toString());
      return [
        c._id.toString(),
        c.firstName || '',
        c.lastName || '',
        c.email || '',
        c.phone || '',
        c.isActive ? 'Active' : 'Inactive',
        st?.orderCount || 0,
        st?.totalSpent || 0,
        st?.lastOrderDate ? new Date(st.lastOrderDate).toLocaleDateString() : 'N/A',
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
        c.gender || 'N/A',
        c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : 'N/A'
      ];
    });

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCsvValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...csvRows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=customers-export-${new Date().toISOString().split('T')[0]}.csv`);
    
    // Add BOM for Excel compatibility with special characters and send the CSV file
    res.send('\ufeff' + csvContent);
  } catch (error) {
    console.error('Export customers error:', error);
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
    const filterConditions = [];
    
    // Add status filter if not 'all'
    if (status !== 'all') {
      filterConditions.push({ orderStatus: status });
    }

    // If search is provided, search by user info and/or orderId
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchConditions = [];
      
      // Search by user name, email, or phone
      const searchRegex = { $regex: searchTerm, $options: 'i' };
      const matchingUsers = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      }).select('_id').lean();
      
      const userIds = matchingUsers.map(u => u._id);
      
      // If users found, add userId condition
      if (userIds.length > 0) {
        searchConditions.push({ userId: { $in: userIds } });
      }
      
      // Also search by orderId (always add this condition)
      const orderIdRegex = { $regex: searchTerm, $options: 'i' };
      searchConditions.push({ orderId: orderIdRegex });
      
      // Search by MongoDB _id if it's a valid ObjectId format
      if (searchTerm.length === 24 && /^[0-9a-fA-F]{24}$/.test(searchTerm)) {
        try {
          const mongoose = require('mongoose');
          const objectId = new mongoose.Types.ObjectId(searchTerm);
          searchConditions.push({ _id: objectId });
        } catch (e) {
          // Invalid ObjectId, ignore
        }
      }
      
      // Add search conditions
      if (searchConditions.length > 0) {
        filterConditions.push({ $or: searchConditions });
      }
    }
    
    // Combine all filter conditions
    if (filterConditions.length === 1) {
      // Single condition, use it directly
      Object.assign(filter, filterConditions[0]);
    } else if (filterConditions.length > 1) {
      // Multiple conditions, combine with $and
      filter.$and = filterConditions;
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
    
    const now = new Date();
    let startDate, previousStartDate, previousEndDate;
    let groupFormat = '%Y-%m-%d'; // Default for days
    
    // Calculate date ranges based on period
    switch (period) {
      case '7d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        groupFormat = '%Y-%m-%d';
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 30);
        previousEndDate = new Date(startDate);
        groupFormat = '%Y-%m-%d';
        break;
      case '90d':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 90);
        previousEndDate = new Date(startDate);
        groupFormat = '%Y-%m-%d';
        break;
      case '1y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        previousStartDate = new Date(startDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousEndDate = new Date(startDate);
        groupFormat = '%Y-%m'; // Group by month for yearly view
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 30);
        previousEndDate = new Date(startDate);
    }

    // Sales data by date
    const salesDataAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const salesData = salesDataAgg.map(item => ({
      date: item._id,
      revenue: item.revenue,
      orders: item.orders
    }));

    // User registrations by date
    const userRegistrationsAgg = await User.aggregate([
      {
        $match: {
          role: 'customer',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt'
            }
          },
          registrations: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const userRegistrations = userRegistrationsAgg.map(item => ({
      date: item._id,
      registrations: item.registrations
    }));

    // Product performance (top products by revenue)
    const productPerformanceAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 }
    ]);

    const productIds = productPerformanceAgg.map(p => p._id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('name images')
      .lean();

    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    const productPerformance = productPerformanceAgg
      .filter(p => p._id && productMap.has(p._id.toString()))
      .map(p => ({
        product: {
          _id: p._id.toString(),
          name: productMap.get(p._id.toString()).name,
          image: productMap.get(p._id.toString()).images?.[0] || null
        },
        totalSold: p.totalSold,
        revenue: p.revenue
      }));

    // Category performance
    const categoryPerformanceAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const categoryIds = categoryPerformanceAgg.map(c => c._id).filter(Boolean);
    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select('name')
      .lean();

    const categoryMap = new Map(categories.map(c => [c._id.toString(), c]));
    const categoryPerformance = categoryPerformanceAgg
      .filter(c => c._id && categoryMap.has(c._id.toString()))
      .map(c => ({
        categoryId: c._id.toString(),
        categoryName: categoryMap.get(c._id.toString()).name,
        totalSold: c.totalSold,
        revenue: c.revenue
      }));

    // Calculate metrics (current vs previous period)
    const [currentPeriodStats, previousPeriodStats] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            orderStatus: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            avgOrderValue: { $avg: '$total' }
          }
        }
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: previousStartDate, $lt: previousEndDate },
            orderStatus: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            avgOrderValue: { $avg: '$total' }
          }
        }
      ])
    ]);

    const currentStats = currentPeriodStats[0] || { revenue: 0, orders: 0, avgOrderValue: 0 };
    const previousStats = previousPeriodStats[0] || { revenue: 0, orders: 0, avgOrderValue: 0 };

    // Customer counts
    const [currentCustomers, previousCustomers] = await Promise.all([
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: startDate }
      }),
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: previousStartDate, $lt: previousEndDate }
      })
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    const metrics = {
      revenue: {
        current: currentStats.revenue || 0,
        previous: previousStats.revenue || 0,
        change: calculateGrowth(currentStats.revenue || 0, previousStats.revenue || 0)
      },
      orders: {
        current: currentStats.orders || 0,
        previous: previousStats.orders || 0,
        change: calculateGrowth(currentStats.orders || 0, previousStats.orders || 0)
      },
      customers: {
        current: currentCustomers,
        previous: previousCustomers,
        change: calculateGrowth(currentCustomers, previousCustomers)
      },
      averageOrder: {
        current: Math.round(currentStats.avgOrderValue || 0),
        previous: Math.round(previousStats.avgOrderValue || 0),
        change: calculateGrowth(currentStats.avgOrderValue || 0, previousStats.avgOrderValue || 0)
      }
    };

    // Customer insights by city
    const customerInsightsAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $ne: 'cancelled' },
          'shippingAddress.city': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$shippingAddress.city',
          customers: { $addToSet: '$userId' },
          revenue: { $sum: '$total' }
        }
      },
      {
        $project: {
          city: '$_id',
          customers: { $size: '$customers' },
          revenue: 1
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    const customerInsights = customerInsightsAgg.map(item => ({
      city: item.city,
      customers: item.customers,
      revenue: item.revenue
    }));

    // Format sales data for daily view (convert date to day name for 7d period)
    let formattedSalesData = salesData;
    if (period === '7d') {
      formattedSalesData = salesData.map(item => {
        const date = new Date(item.date);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return {
          day: dayNames[date.getDay()],
          sales: item.revenue
        };
      });
    }

    // Format top products with growth (simplified - comparing current period to previous)
    const previousProductPerformanceAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousStartDate, $lt: previousEndDate },
          orderStatus: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' }
        }
      }
    ]);

    const previousProductMap = new Map(
      previousProductPerformanceAgg.map(p => [p._id?.toString(), p.totalSold || 0])
    );

    const topProducts = productPerformance.slice(0, 10).map(p => {
      const previousSold = previousProductMap.get(p.product._id) || 0;
      const growth = calculateGrowth(p.totalSold, previousSold);
      return {
        name: p.product.name,
        sales: p.totalSold,
        revenue: p.revenue,
        growth
      };
    });

    const analytics = {
      period,
      metrics,
      salesData: formattedSalesData,
      userRegistrations,
      productPerformance,
      categoryPerformance,
      topProducts,
      customerInsights
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