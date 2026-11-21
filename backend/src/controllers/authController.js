import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { sendPasswordResetEmail } from '../utils/emailService.js';

// ==================== JWT Configuration ====================
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d'; // Token valid for 7 days
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '30d'; // Refresh token valid for 30 days

// ==================== Token Generation ====================
/**
 * Generate JWT Access Token
 * Expires in 7 days by default
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role (user, admin, hospital-staff)
 * @returns {string} - Signed JWT token
 */
export const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    {
      userId,
      email,
      role,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRATION,
      issuer: 'smart-hospital-api',
    }
  );
};

/**
 * Generate JWT Refresh Token
 * Expires in 30 days by default
 * Used to get new access token without re-entering credentials
 * @param {string} userId - User ID
 * @returns {string} - Signed JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: 'refresh',
    },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRATION,
      issuer: 'smart-hospital-api',
    }
  );
};

// ==================== Auth Controllers ====================

/**
 * POST /api/auth/signup
 * Register a new user with email and password
 *
 * Request Body:
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "email": "john@example.com",
 *   "password": "securePassword123",
 *   "phone": "9876543210"
 * }
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "userId": "...",
 *     "email": "john@example.com",
 *     "accessToken": "eyJhbGc...",
 *     "refreshToken": "eyJhbGc...",
 *     "expiresIn": "7d"
 *   }
 * }
 */
export const signup = async (req, res, next) => {
  try {
    // ==================== Validation ====================
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',

        errors: errors.mapped(),
        // timestamp: new Date().toISOString(),
      });
    }

    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        code: 'USER_EXISTS',
        message: 'Email is already registered. Please login instead.',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== User Creation ====================
    // Password hashing is handled by pre-save middleware in User model
    const user = new User({
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.replace(/\D/g, '') : undefined, // Remove non-digits
      password, // Will be hashed automatically
      role: 'user', // Default role
      isEmailVerified: false,
      isActive: true,
    });

    // Save to database (triggers password hashing in pre-save)
    await user.save();

    // ==================== Token Generation ====================
    const accessToken = generateAccessToken(user._id.toString(), user.email, user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    // ==================== Response ====================
    res.status(201).json({
      status: 'success',
      code: 201,
      message: 'User registered successfully',
      data: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRATION,
        tokenType: 'Bearer',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login user with email and password
 *
 * Request Body:
 * {
 *   "email": "john@example.com",
 *   "password": "securePassword123",
 *   "rememberMe": false (optional)
 * }
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "userId": "...",
 *     "email": "john@example.com",
 *     "accessToken": "eyJhbGc...",
 *     "refreshToken": "eyJhbGc...",
 *     "expiresIn": "7d"
 *   }
 * }
 */
export const login = async (req, res, next) => {
  try {
    // ==================== Validation ====================
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: errors.mapped(),
        timestamp: new Date().toISOString(),
      });
    }

    const { email, password } = req.body;

    // ==================== User Lookup ====================
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== Account Status Check ====================
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account has been deactivated. Contact support for assistance.',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== Login Attempt Tracking ====================
    // Check if account is locked due to too many failed attempts
    if (user.isAccountLocked && user.isAccountLocked()) {
      return res.status(429).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        message: 'Too many failed login attempts. Please try again after 30 minutes.',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== Password Verification ====================
    const isPasswordCorrect = await user.matchPassword(password);

    if (!isPasswordCorrect) {
      // Increment failed login attempts
      if (user.incLoginAttempts) {
        await user.incLoginAttempts();
      }

      return res.status(401).json({
        status: 'error',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== Reset Login Attempts ====================
    // Clear failed attempts on successful login
    if (user.resetLoginAttempts) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    // ==================== Token Generation ====================
    const accessToken = generateAccessToken(user._id.toString(), user.email, user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    // ==================== Response ====================
    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Login successful',
      data: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRATION,
        tokenType: 'Bearer',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh-token
 * Get new access token using refresh token
 * Used when access token expires but session is still valid
 *
 * Request Body:
 * {
 *   "refreshToken": "eyJhbGc..."
 * }
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "accessToken": "eyJhbGc...",
 *     "expiresIn": "7d"
 *   }
 * }
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        code: 'REFRESH_TOKEN_REQUIRED',
        message: 'Refresh token is required',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== Token Verification ====================
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify it's actually a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        code: 'INVALID_TOKEN_TYPE',
        message: 'Invalid token type. Expected refresh token.',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== User Verification ====================
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found or inactive',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== New Token Generation ====================
    const newAccessToken = generateAccessToken(user._id.toString(), user.email, user.role);

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: JWT_EXPIRATION,
        tokenType: 'Bearer',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Logout user (client-side token cleanup mainly)
 * Can be extended to implement token blacklisting
 *
 * Response:
 * {
 *   "status": "success",
 *   "message": "Logged out successfully"
 * }
 */
export const logout = async (req, res, next) => {
  try {
    // In a production app, you might:
    // 1. Add token to blacklist
    // 2. Update last logout timestamp
    // 3. Clear refresh tokens from database

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 *
 * Request Body:
 * {
 *   "email": "john@example.com"
 * }
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: errors.mapped(),
        timestamp: new Date().toISOString(),
      });
    }

    const { email } = req.body;

    // ==================== User Lookup ====================
    const user = await User.findOne({ email: email.toLowerCase() });

    // Don't reveal if email exists (security best practice)
    if (!user) {
      return res.status(200).json({
        status: 'success',
        code: 200,
        message: 'If email exists, password reset link will be sent',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== Generate Reset Token ====================
    // Create token and set expiration (1 hour)
    const resetToken = jwt.sign(
      {
        userId: user._id,
        type: 'password-reset',
      },
      JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    // Store token hash in database
    user.passwordResetToken = resetToken;
    user.passwordResetExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await user.save();

    // ==================== Send Password Reset Email ====================
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    const emailResult = await sendPasswordResetEmail(user.email, userName, resetToken, resetUrl);

    // Email sending is non-blocking - continue even if email fails
    if (!emailResult.success) {
      console.warn(
        `Failed to send reset email to ${user.email}: ${emailResult.message}`
      );
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'If email exists, password reset link will be sent',
      data: {
        tokenExpiry: '1 hour',
        emailSent: emailResult.success,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password with token
 *
 * Request Body:
 * {
 *   "token": "eyJhbGc...",
 *   "newPassword": "newSecurePassword123"
 * }
 */
export const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: errors.mapped(),
        timestamp: new Date().toISOString(),
      });
    }

    const { token, newPassword } = req.body;

    // ==================== Token Verification ====================
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired reset token',
        timestamp: new Date().toISOString(),
      });
    }

    if (decoded.type !== 'password-reset') {
      return res.status(400).json({
        status: 'error',
        code: 'INVALID_TOKEN_TYPE',
        message: 'Invalid token type',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== User Lookup ====================
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify token matches what's stored
    if (user.passwordResetToken !== token) {
      return res.status(400).json({
        status: 'error',
        code: 'TOKEN_MISMATCH',
        message: 'Reset token does not match',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if token expired
    if (user.passwordResetExpire < new Date()) {
      return res.status(400).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Reset token has expired',
        timestamp: new Date().toISOString(),
      });
    }

    // ==================== Update Password ====================
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    user.loginAttempts = 0; // Reset login attempts
    user.lockUntil = undefined;

    await user.save(); // Triggers password hashing middleware

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Password reset successfully. Please login with your new password.',
      data: {
        email: user.email,
        nextStep: 'login',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: 'success',
      code: 200,
      message: 'Current user retrieved successfully',
      data: {
        user,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
