import express from 'express';
import { register, login, getCurrentUser } from '../controllers/auth.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// REGISTER
router.post('/register', register);

// LOGIN
router.post('/login', login);

// CURRENT USER
router.get('/me', authMiddleware, getCurrentUser);

export default router;
