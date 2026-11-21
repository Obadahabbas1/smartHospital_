/**
 * Central Error Handler Middleware
 * Catches all errors and returns standardized responses
 */
export const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  const errors = err.errors || {};

  // Mongoose validation error (400)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
  }

  // Mongoose duplicate key error (409)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyPattern)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    errors[field] = message;
  }

  // Mongoose cast error (400)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
    errors.id = message;
  }

  // JWT errors (401)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid or expired token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Send response
  return res.status(statusCode).json({
    status: 'error',
    code,
    message,
    ...(Object.keys(errors).length > 0 && { errors }),
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Async handler to catch errors in async route handlers
 * Usage: router.get('/route', asyncHandler(async (req, res) => {...}))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class for API responses
 */
export class AppError extends Error {
  constructor(message, statusCode, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

// ==================== Common Error Instances ====================
export const errors = {
  unauthorized: () => new AppError('Unauthorized', 401, 'UNAUTHORIZED'),
  forbidden: () => new AppError('Access forbidden', 403, 'FORBIDDEN'),
  notFound: (resource) => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  badRequest: (message) => new AppError(message, 400, 'BAD_REQUEST'),
  conflict: (message) => new AppError(message, 409, 'CONFLICT'),
  serverError: (message) => new AppError(message || 'Internal server error', 500, 'SERVER_ERROR'),
};
