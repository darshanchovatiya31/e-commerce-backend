const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { sendEmail } = require('../utils/email');

exports.register = [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('phone').notEmpty().trim(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email, password, phone } = req.body;
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      const user = new User({ firstName, lastName, email, password, phone });
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      await sendEmail({
        to: email,
        subject: 'Welcome to Samjubaa Creation',
        text: `Dear ${firstName}, welcome to Samjubaa Creation! Your account has been created successfully.`
      });

      res.status(201).json({ token, refreshToken, user: { id: user._id, firstName, lastName, email, role: user.role } });
    } catch (error) {
      next(error);
    }
  }
];

exports.login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      
      if (!user || !await user.comparePassword(password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      res.json({ token, refreshToken, user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email, role: user.role } });
    } catch (error) {
      next(error);
    }
  }
];

exports.forgotPassword = [
  body('email').isEmail().normalizeEmail(),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        text: `Click the link to reset your password: ${process.env.FRONTEND_URL}/reset-password/${resetToken}`
      });

      res.json({ message: 'Password reset link sent' });
    } catch (error) {
      next(error);
    }
  }
];

// Implement resetPassword, profile, etc., similarly