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
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

async function start() {
  try {
    // Only init DB if connection settings are provided
    if (process.env.DB_SERVER) {
      const { initDB } = require('./src/db/database');
      await initDB();
    } else {
      console.log('DB_SERVER not set — running without database');
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
