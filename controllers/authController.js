const { validationResult, body } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const transporter = require('../utils/email');
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

      console.log(`New user registered: ${email}`);
      console.log(`env EMAIL_USER: ${process.env.EMAIL_USER}`);
      console.log(`env EMAIL_PASS: ${process.env.EMAIL_PASS}`);


      // Send welcome email - Same as Blog Haven
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Samjubaa Creation - Welcome!",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h1 style="color: #8B0000;">Welcome, ${firstName} ${lastName}!</h1>
              <p>We're excited to have you join <strong>Samjubaa Creation</strong>, your destination for timeless elegance and quality products.</p>
              
              <h2 style="color: #8B0000;">Your account has been successfully created!</h2>
              <p>You can now:</p>
              
              <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; list-style: none; color: #333;">
                <li style="margin-bottom: 10px;">
                  <strong>🔹 Browse Products:</strong> Explore our exclusive collection of premium products.
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>🔹 Save to Wishlist:</strong> Save your favorite items for later.
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>🔹 Track Orders:</strong> Easily track your orders and delivery status.
                </li>
                <li style="margin-bottom: 10px;">
                  <strong>🔹 Special Offers:</strong> Enjoy member-only offers and discounts.
                </li>
              </ul>
              
              <p>Thank you for joining Samjubaa Creation! We look forward to serving you.</p>
              
              <h3 style="color: #8B0000;">Best regards,</h3>
              <p>The Samjubaa Creation Team</p>
            </div>
          `,
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

// Forgot password - Send OTP
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

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to user
      user.passwordResetOTP = otp;
      user.passwordResetOTPExpires = otpExpires;
      await user.save();
      
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Samjubaa Creation - Password Reset OTP",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h1 style="color: #8B0000;">Password Reset OTP</h1>
              <p>Dear ${user.firstName},</p>
              <p>We received a request to reset your password. Use the OTP below to verify your identity:</p>
              
              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h2 style="color: #8B0000; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
              </div>
              
              <p style="color: #666;">⚠️ This OTP will expire in 10 minutes for security reasons.</p>
              <p style="color: #666;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              <p style="color: #666; font-size: 12px;">For security reasons, never share this OTP with anyone.</p>
              
              <h3 style="color: #8B0000;">Best regards,</h3>
              <p>The Samjubaa Creation Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Password reset OTP email failed:', emailError);
        // Clear OTP if email fails
        user.passwordResetOTP = undefined;
        user.passwordResetOTPExpires = undefined;
        await user.save();
        return responseHelper.error(res, 'Failed to send reset email. Please try again.', 500);
      }

      responseHelper.success(res, null, RESPONSE_MESSAGES.AUTH.PASSWORD_RESET_SENT);
    } catch (error) {
      next(error);
    }
  }
];

// Verify OTP
exports.verifyOTP = [
  ...authValidators.verifyOTP,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseHelper.validationError(res, errors);
      }

      const { email, otp } = req.body;

      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        return responseHelper.error(res, 'Invalid email or OTP', 400);
      }

      // Check if OTP exists and is valid
      if (!user.passwordResetOTP || !user.passwordResetOTPExpires) {
        return responseHelper.error(res, 'OTP not found or expired. Please request a new OTP.', 400);
      }

      // Check if OTP is expired
      if (user.passwordResetOTPExpires < new Date()) {
        user.passwordResetOTP = undefined;
        user.passwordResetOTPExpires = undefined;
        await user.save();
        return responseHelper.error(res, 'OTP has expired. Please request a new OTP.', 400);
      }

      // Verify OTP
      if (user.passwordResetOTP !== otp) {
        return responseHelper.error(res, 'Invalid OTP. Please try again.', 400);
      }

      // Generate a temporary token for password reset (valid for 5 minutes)
      const resetToken = jwt.sign({ userId: user._id, email: user.email, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '5m' });

      responseHelper.success(res, { resetToken }, 'OTP verified successfully');
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

      // Update password and clear OTP
      user.password = password;
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
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