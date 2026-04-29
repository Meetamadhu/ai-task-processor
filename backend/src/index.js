// src/index.js
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim() === '') {
  // eslint-disable-next-line no-console
  console.error('FATAL: JWT_SECRET must be set to a non-empty value');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err);
  });

// Redis: use full URL if set (Render/Railway). Empty REDIS_URL must not fall back silently.
function resolveRedisUrl() {
  const candidates = [
    process.env.REDIS_URL,
    process.env.REDISCLOUD_URL,
    process.env.REDIS_TLS_URL,
  ];
  for (const c of candidates) {
    if (c && String(c).trim() !== '') return String(c).trim();
  }
  return '';
}

const redisUrl = resolveRedisUrl();
const redisOptions = redisUrl
  ? { url: redisUrl }
  : {
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      },
    };

if (!redisUrl && (!process.env.REDIS_HOST || process.env.REDIS_HOST === 'localhost')) {
  // eslint-disable-next-line no-console
  console.warn('Redis: REDIS_URL is not set; using localhost:6379 (set REDIS_URL on Render).');
}

const redisClient = redis.createClient(redisOptions);

redisClient.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Redis error:', err);
});
redisClient.on('connect', () => {
  // eslint-disable-next-line no-console
  console.log('Redis connected');
});
redisClient.connect();

// Make Redis client available to routes
app.locals.redisClient = redisClient;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
