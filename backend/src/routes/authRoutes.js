import express from 'express';
import {
  signup,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from '../controllers/authController.js';

import { authenticate } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';

import {
  validateSignup,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
} from '../middleware/authValidator.js';

const router = express.Router();

// ============================================================
// PUBLIC ROUTES (NO AUTH REQUIRED)
// ============================================================

/**
 * POST /api/auth/signup
 * Main signup route (recommended)
 */
router.post(
  '/register',
  loginLimiter,
  validateSignup,
  asyncHandler(signup)
);

/**
 * POST /api/auth/register
 * Alias for signup (frontend compatibility)
 */
router.post(
  '/signup',
  loginLimiter,
  validateSignup,
  asyncHandler(signup)
);

/**
 * POST /api/auth/login
 * User login
 */
router.post(
  '/login',
  loginLimiter,
  validateLogin,
  asyncHandler(login)
);

/**
 * POST /api/auth/refresh-token
 * Get new access token
 */
router.post(
  '/refresh-token',
  validateRefreshToken,
  asyncHandler(refreshToken)
);

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  validateForgotPassword,
  asyncHandler(forgotPassword)
);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post(
  '/reset-password',
  validateResetPassword,
  asyncHandler(resetPassword)
);

// ============================================================
// PROTECTED ROUTES (AUTH REQUIRED)
// ============================================================

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(logout)
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(getCurrentUser)
);

export default router;
