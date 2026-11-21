import { body } from 'express-validator';

/* ==================== SIGNUP ==================== */
export const validateSignup = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),

  body('email')
    .trim()
    // .toLowerCase()
    .isEmail()
    .withMessage('Invalid email address'),

  body('phone')
    .optional({checkFalsy: true})
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be a 10-digit number'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

/* ==================== LOGIN ==================== */
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/* ==================== REFRESH TOKEN ==================== */
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token missing'),
];

/* ==================== FORGOT PASSWORD ==================== */
export const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email'),
];

/* ==================== RESET PASSWORD ==================== */
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token missing'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];
