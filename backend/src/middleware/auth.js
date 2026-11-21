import jwt from 'jsonwebtoken';
import { errors } from './errorHandler.js';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * Token format: Bearer <token>
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw errors.unauthorized();
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        timestamp: new Date().toISOString(),
      });
    }
    next(error);
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 * Usage: router.post('/admin', authorize('admin'), controller)
 */
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(errors.unauthorized());
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(errors.forbidden());
  }

  next();
};

/**
 * Optional authentication middleware
 * Doesn't throw error if token is missing, but verifies if present
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // If token is invalid, continue without auth info
    next();
  }
};

export default {
  authenticate,
  authorize,
  optionalAuth,
};
