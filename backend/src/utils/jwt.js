import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || '30d';

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId, role = 'user') => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
};

/**
 * Generate refresh token (optional - for token rotation)
 * Store in database linked to user
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRE }
  );
};

/**
 * Generate password reset token (valid for 30 minutes only)
 * Store hashed version in database
 */
export const generateResetToken = () => {
  return jwt.sign(
    { type: 'reset', timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '30m' }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token, secret = JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Decode token without verification (use cautiously)
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyToken,
  decodeToken,
};
