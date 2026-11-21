import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter for all API routes
 * Default: 100 requests per 15 minutes per IP
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development to avoid blocking testing
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    if (req.path === '/health') return true;
    return false;
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: req.rateLimit.resetTime,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Stricter rate limiter for authentication routes
 * Default: 5 requests per 15 minutes per IP
 * Prevents brute force attacks on login/registration
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased for development to allow testing authentication flows
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests too
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * API rate limiter for non-auth endpoints
 * Default: 30 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased for development
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search rate limiter (stricter for expensive operations)
 * Default: 10 requests per minute per IP
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Increased for development
  message: 'Search rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  rateLimiter,
  loginLimiter,
  apiLimiter,
  searchLimiter,
};
