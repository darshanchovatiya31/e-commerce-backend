const { validationResult, body } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/email');
const responseHelper = require('../utils/responseHelper');
const RESPONSE_MESSAGES = require('../constants/responseMessages');
const authValidators = require('../validators/authValidators');

// Generate JWT tokens
const generateTokens = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { token, refreshToken };
};

// User registration
exports.register = [
  ...authValidators.register,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { firstName, lastName, email, password, phone } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return responseHelper.error(res, RESPONSE_MESSAGES.AUTH.EMAIL_EXISTS, 400);
      }

      // Create new user
      const user = new User({ firstName, lastName, email, password, phone });
      await user.save();

      // Generate tokens
      const { token, refreshToken } = generateTokens(user._id);

      // Send welcome email
      try {
        await sendEmail({
          to: email,
          subject: 'Welcome to Samjubaa Creation',
          text: `Dear ${firstName}, welcome to Samjubaa Creation! Your account has been created successfully.`
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail registration if email fails
      }

      // Return success response
      const userData = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        joinedDate: user.createdAt
      };

      responseHelper.success(res, { 
        token, 
        refreshToken, 
        user: userData 
      }, RESPONSE_MESSAGES.AUTH.REGISTER_SUCCESS, 201);
    } catch (error) {
      next(error);
    }
  }
];

// User login
exports.login = [
  ...authValidators.login,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { email, password } = req.body;
      
      // Find user and check if active
      const user = await User.findOne({ email, isActive: true });
      if (!user || !await user.comparePassword(password)) {
        return responseHelper.error(res, RESPONSE_MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
      }

      // Generate tokens
      const { token, refreshToken } = generateTokens(user._id);

      // Return success response
      const userData = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        joinedDate: user.createdAt
      };

      responseHelper.success(res, { 
        token, 
        refreshToken, 
        user: userData 
      }, RESPONSE_MESSAGES.AUTH.LOGIN_SUCCESS);
    } catch (error) {
      next(error);
    }
  }
];

// Forgot password
exports.forgotPassword = [
  ...authValidators.forgotPassword,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { email } = req.body;
      const user = await User.findOne({ email, isActive: true });
      
      // Always return success to prevent email enumeration
      if (!user) {
        return responseHelper.success(res, null, RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SENT);
      }

      // Generate reset token (shorter expiry for security)
      const resetToken = jwt.sign({ userId: user._id, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
      
      try {
        await sendEmail({
          to: email,
          subject: 'Password Reset Request - Samjubaa Creation',
          text: `You requested a password reset. Click the link below to reset your password:\n\n${process.env.FRONTEND_URL}/reset-password/${resetToken}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`
        });
      } catch (emailError) {
        console.error('Password reset email failed:', emailError);
        return responseHelper.error(res, 'Failed to send reset email. Please try again.', 500);
      }

      responseHelper.success(res, null, RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SENT);
    } catch (error) {
      next(error);
    }
  }
];

// Reset password
exports.resetPassword = [
  ...authValidators.resetPassword,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { token, password } = req.body;

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'password_reset') {
          throw new Error('Invalid token type');
        }
      } catch (jwtError) {
        return responseHelper.error(res, RESPONSE_MESSAGES.AUTH.TOKEN_INVALID, 400);
      }

      // Find user and update password
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return responseHelper.error(res, RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND, 404);
      }

      user.password = password;
      await user.save();

      responseHelper.success(res, null, RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);
    } catch (error) {
      next(error);
    }
  }
];

// Change password (for authenticated users)
exports.changePassword = [
  ...authValidators.changePassword,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { currentPassword, newPassword } = req.body;
      const user = req.user; // From auth middleware

      // Verify current password
      if (!await user.comparePassword(currentPassword)) {
        return responseHelper.error(res, 'Current password is incorrect', 400);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      responseHelper.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Get user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = req.user; // From auth middleware
    
    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      addresses: user.addresses,
      joinedDate: user.createdAt
    };

    responseHelper.success(res, userData, 'Profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().trim().matches(/^[\+]?[1-9][\d]{0,15}$/),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const user = req.user; // From auth middleware
      const { firstName, lastName, phone } = req.body;

      // Update allowed fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;

      await user.save();

      const userData = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses,
        joinedDate: user.createdAt
      };

      responseHelper.success(res, userData, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Refresh token
exports.refreshToken = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { refreshToken } = req.body;

      // Verify refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      } catch (jwtError) {
        return responseHelper.error(res, 'Invalid refresh token', 401);
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return responseHelper.error(res, RESPONSE_MESSAGES.AUTH.USER_NOT_FOUND, 404);
      }

      // Generate new tokens
      const { token, refreshToken: newRefreshToken } = generateTokens(user._id);

      responseHelper.success(res, { 
        token, 
        refreshToken: newRefreshToken 
      }, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  }
];

// Logout (optional - mainly for clearing client-side tokens)
exports.logout = async (req, res, next) => {
  try {
    // In a more advanced setup, you might want to blacklist the token
    responseHelper.success(res, null, RESPONSE_MESSAGES.AUTH.LOGOUT_SUCCESS);
  } catch (error) {
    next(error);
  }
};