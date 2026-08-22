require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const pomodoroRoutes = require('./src/routes/pomodoro');
const friendsRoutes = require('./src/routes/friends');
const usersRoutes = require('./src/routes/users');
const aiRoutes = require('./src/routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ai', aiRoutes);

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
