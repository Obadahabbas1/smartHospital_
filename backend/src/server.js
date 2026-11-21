import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { connectDB } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';

import { rateLimiter, loginLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
// Prevent browsers/proxies from caching API responses (avoids 304 + empty body issues)
app.disable('etag');
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
// Trust proxy when behind a load balancer / platform proxy (Render, Railway, Vercel, ngrok)
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true' || true) {
  app.set('trust proxy', 1);
}
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== Database ====================
connectDB();

// ==================== Security ====================
app.use(helmet());

app.use(
  cors({
    origin: NODE_ENV === 'development' ? (origin, callback) => callback(null, true) : (process.env.CORS_ORIGIN || 'http://localhost:5173'),
    credentials: true,
  })
);

// ==================== Logging ====================
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==================== Body Parsers ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== Rate Limiting ====================
app.use('/api', rateLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/signup', loginLimiter);

// ==================== Health Check ====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ==================== API Routes ====================
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);

// ==================== 404 Handler ====================
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// ==================== Global Error Handler ====================
app.use(errorHandler);

// ==================== Start Server ====================
let server;

const startServer = (startPort, attemptsLeft = 5) => {
  try {
    server = app.listen(startPort, () => {
      const actualPort = server.address() && server.address().port ? server.address().port : startPort;
      console.log(`\nSmart Hospital Backend running on port ${actualPort} (env: ${NODE_ENV})\n`);
      console.log(`Health: GET /health  |  Auth: /api/auth/*  |  Hospitals: /api/hospitals/*\n`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${startPort} is in use.`);
        if (attemptsLeft > 0) {
          const nextPort = parseInt(startPort, 10) + 1;
          console.warn(`Trying port ${nextPort} (attempts left: ${attemptsLeft - 1})`);
          setTimeout(() => startServer(nextPort, attemptsLeft - 1), 500);
        } else {
          console.error('No available ports found after retries. Exiting.');
          process.exit(1);
        }
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(PORT);

// ==================== Graceful Shutdown ====================
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  server.close(() => process.exit(0));
});

// ==================== Unhandled Errors ====================
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
