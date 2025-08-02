const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalProducts = await Product.countDocuments();

    res.json({
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalProducts
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { name: '$product.name', totalSold: 1 } }
    ]);

    res.json({
      ordersByStatus,
      topProducts
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password');
    res.json(customers);
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = [
  param('id').isMongoId(),
  body('isActive').isBoolean(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { isActive } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.isActive = isActive;
      await user.save();

      res.json({ message: 'User status updated', user });
    } catch (error) {
      next(error);
    }
  }
];