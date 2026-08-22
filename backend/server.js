require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');
const pomodoroRoutes = require('./src/routes/pomodoro');
const friendsRoutes = require('./src/routes/friends');
const usersRoutes = require('./src/routes/users');
const aiRoutes = require('./src/routes/ai');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3001);

function validateEnvironment() {
  const errors = [];
  const jwtSecret = process.env.JWT_SECRET;
  const databaseVariables = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const configuredDatabaseVariables = databaseVariables.filter((name) => process.env[name]);

  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (
    jwtSecret === 'secret'
    || jwtSecret === 'replace_with_at_least_32_random_characters'
  ) {
    errors.push('JWT_SECRET must not use a default or example value');
  } else if (isProduction && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }

  if (isProduction && !process.env.CORS_ORIGINS) {
    errors.push('CORS_ORIGINS is required in production');
  }

  if (isProduction || configuredDatabaseVariables.length > 0) {
    for (const name of databaseVariables) {
      if (!process.env[name]) errors.push(`${name} is required when using the database`);
    }
  }

  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    errors.push('PORT must be a valid TCP port');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }
}

function getTrustProxy() {
  if (process.env.TRUST_PROXY === undefined) return isProduction ? 1 : false;
  if (process.env.TRUST_PROXY === 'true') return true;
  if (process.env.TRUST_PROXY === 'false') return false;

  const hops = Number(process.env.TRUST_PROXY);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error('TRUST_PROXY must be true, false, or a non-negative integer');
  }
  return hops;
}

const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = (process.env.CORS_ORIGINS || localOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.set('trust proxy', getTrustProxy());
app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    const error = new Error('Origin is not allowed by CORS');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'AI 요청 한도를 초과했습니다. 1시간 후 다시 시도해주세요.' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pomodoro', generalLimiter, pomodoroRoutes);
app.use('/api/friends', generalLimiter, friendsRoutes);
app.use('/api/users', generalLimiter, usersRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(err.status || 500).json({
    error: err.status ? err.message : 'Server error',
  });
});

async function start() {
  try {
    validateEnvironment();

    // Only init DB if connection settings are provided
    if (process.env.DB_SERVER) {
      const { initDB } = require('./src/db/database');
      await initDB();
    } else {
      console.log('DB_SERVER not set - running without database');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
