import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate secure password reset token
 * Uses JWT for token generation with 1-hour expiration
 *
 * @param {string} userId - MongoDB User ID
 * @returns {object} - Token object with token and expiration
 */
export const generatePasswordResetToken = (userId) => {
  const token = jwt.sign(
    {
      userId,
      type: 'password-reset',
    },
    JWT_SECRET,
    {
      expiresIn: '1h',
      issuer: 'smart-hospital-api',
    }
  );

  return {
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
};

/**
 * Verify password reset token
 * Validates token signature and expiration
 *
 * @param {string} token - Reset token to verify
 * @returns {object} - { valid: boolean, payload: object | null, error: string | null }
 */
export const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'password-reset') {
      return {
        valid: false,
        payload: null,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      payload: decoded,
      error: null,
    };
  } catch (error) {
    let errorMessage = 'Invalid token';

    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token signature';
    }

    return {
      valid: false,
      payload: null,
      error: errorMessage,
    };
  }
};

/**
 * Generate secure random token for email verification or other purposes
 * Uses crypto for additional randomness
 *
 * @returns {string} - Random hex token
 */
export const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a token using SHA256
 * Useful for storing token hashes instead of plain tokens
 *
 * @param {string} token - Token to hash
 * @returns {string} - SHA256 hash of token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Validate password reset URL
 * Checks if token in URL is valid
 *
 * @param {string} resetUrl - Full reset URL
 * @returns {object} - { valid: boolean, token: string | null, error: string | null }
 */
export const validateResetUrl = (resetUrl) => {
  try {
    const url = new URL(resetUrl);
    const token = url.searchParams.get('token');

    if (!token) {
      return {
        valid: false,
        token: null,
        error: 'No token in URL',
      };
    }

    const verification = verifyPasswordResetToken(token);

    return {
      valid: verification.valid,
      token: token,
      error: verification.error,
    };
  } catch (error) {
    return {
      valid: false,
      token: null,
      error: 'Invalid URL format',
    };
  }
};

/**
 * Get time remaining for token expiration
 * Useful for showing countdown to user
 *
 * @param {Date} expiresAt - Token expiration date
 * @returns {object} - { minutes, seconds, isExpired }
 */
export const getTokenTimeRemaining = (expiresAt) => {
  const now = new Date();
  const timeRemaining = expiresAt - now;

  if (timeRemaining <= 0) {
    return {
      minutes: 0,
      seconds: 0,
      isExpired: true,
      message: 'Token has expired',
    };
  }

  const minutes = Math.floor(timeRemaining / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  return {
    minutes,
    seconds,
    isExpired: false,
    message: `Time remaining: ${minutes}m ${seconds}s`,
  };
};

export default {
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateSecureToken,
  hashToken,
  validateResetUrl,
  getTokenTimeRemaining,
};
