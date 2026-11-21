import ErrorHandler from '../utils/errorHandler.js';

const errorMiddleware = (err, req, res, next) => {
  // Normalize unknown errors to ErrorHandler
  let error = err instanceof ErrorHandler ? err : new ErrorHandler(err.message || 'Internal Server Error', err.statusCode || 500, err.code || 'SERVER_ERROR');

  // Mongoose validation errors -> 400
  if (err.name === 'ValidationError') {
    const fieldErrors = {};
    Object.keys(err.errors || {}).forEach((k) => {
      fieldErrors[k] = err.errors[k].message;
    });
    error = new ErrorHandler('Validation failed', 400, 'VALIDATION_ERROR', fieldErrors);
  }

  // Mongoose duplicate key -> 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field';
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = new ErrorHandler(message, 409, 'DUPLICATE_ENTRY', { [field]: message });
  }

  // CastError (invalid ObjectId) -> 400
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path || 'id'} format`;
    error = new ErrorHandler(message, 400, 'INVALID_ID', { [err.path || 'id']: message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new ErrorHandler('Invalid or malformed token', 401, 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    error = new ErrorHandler('Token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Log server errors in production appropriately
  if (error.statusCode >= 500) {
    console.error('Server Error:', err);
  }

  // Standardized API error response
  return res.status(error.statusCode).json({
    status: 'error',
    code: error.code || 'ERROR',
    message: error.message || 'An error occurred',
    ...(error.errors && Object.keys(error.errors).length > 0 && { errors: error.errors }),
    timestamp: error.timestamp || new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorMiddleware;
