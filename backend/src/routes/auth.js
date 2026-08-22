const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { nickname, email, password } = req.body;
    if (!nickname || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const db = await getPool();
    const existing = await db.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await db.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('nickname', sql.NVarChar, nickname)
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, hash)
      .query(`INSERT INTO users (id, nickname, email, password_hash)
              VALUES (@id, @nickname, @email, @password_hash)`);

    const token = jwt.sign({ id, email, nickname }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, nickname, email, level: 1, xp: 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getPool();
    const result = await db.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nickname: user.nickname },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        level: user.level,
        xp: user.xp,
        total_pomodoros: user.total_pomodoros,
        total_focus_minutes: user.total_focus_minutes,
        focus_duration: user.focus_duration,
        break_duration: user.break_duration,
        long_break_duration: user.long_break_duration,
        white_noise_type: user.white_noise_type,
        white_noise_enabled: user.white_noise_enabled,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
