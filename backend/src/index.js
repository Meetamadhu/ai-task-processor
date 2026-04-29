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

/** Strip accidental wrapping quotes from Render / shell paste */
function trimEnvUri(uri) {
  let s = String(uri || '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Append authSource when Atlas user authenticates against `admin` (common). */
function buildMongoUri() {
  let uri = trimEnvUri(process.env.MONGODB_URI);
  if (!uri) return '';
  const authSource = trimEnvUri(process.env.MONGODB_AUTH_SOURCE);
  if (authSource && !/([?&])authSource=/.test(uri)) {
    const sep = uri.includes('?') ? '&' : '?';
    uri += `${sep}authSource=${encodeURIComponent(authSource)}`;
  }
  return uri;
}

/** Log host + user only (never password). */
function maskMongoUri(uri) {
  if (!uri) return '(empty)';
  return uri.replace(
    /^(mongodb(?:\+srv)?:\/\/)([^:/?#]+):([^@]+)@/i,
    (_, proto, user) => `${proto}${user}:***@`
  );
}

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { authenticateToken } = require('./middleware/auth');

const app = express();

function normalizeOrigin(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/$/, '');
}

function allowedFrontendOrigins() {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',').map(normalizeOrigin).filter(Boolean);
}

// Security middleware — CORP same-origin breaks browser fetches from Vercel → API
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    const allowed = allowedFrontendOrigins();
    if (allowed.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
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
const mongoUri = buildMongoUri();
if (!mongoUri) {
  // eslint-disable-next-line no-console
  console.error('FATAL: MONGODB_URI must be set to a non-empty connection string');
  process.exit(1);
}
// eslint-disable-next-line no-console
console.log('MongoDB URI (masked):', maskMongoUri(mongoUri));

mongoose.connect(mongoUri, {
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
    const msg = String(err.message || '');
    if (msg.includes('bad auth') || err.code === 8000) {
      // eslint-disable-next-line no-console
      console.error(
        'Atlas auth failed: verify Database User + password in MONGODB_URI (URL-encode @#:/ in password), '
        + 'Network Access allows Render (try 0.0.0.0/0 for testing), and add MONGODB_AUTH_SOURCE=admin on Render if your user uses the admin auth database.'
      );
    }
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
