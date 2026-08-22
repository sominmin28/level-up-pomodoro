const express = require('express');
const { getPool, sql } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request()
      .input('id', sql.UniqueIdentifier, req.user.id)
      .query(`SELECT id, nickname, email, level, xp,
              total_pomodoros, total_focus_minutes,
              focus_duration, break_duration, long_break_duration,
              white_noise_type, white_noise_enabled
              FROM users WHERE id = @id`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/settings
router.put('/settings', async (req, res) => {
  try {
    const { focus_duration, break_duration, long_break_duration, white_noise_type, white_noise_enabled } = req.body;
    const db = await getPool();

    await db.request()
      .input('id', sql.UniqueIdentifier, req.user.id)
      .input('focus_duration', sql.Int, focus_duration)
      .input('break_duration', sql.Int, break_duration)
      .input('long_break_duration', sql.Int, long_break_duration)
      .input('white_noise_type', sql.NVarChar, white_noise_type)
      .input('white_noise_enabled', sql.Bit, white_noise_enabled ? 1 : 0)
      .query(`UPDATE users SET
              focus_duration = @focus_duration,
              break_duration = @break_duration,
              long_break_duration = @long_break_duration,
              white_noise_type = @white_noise_type,
              white_noise_enabled = @white_noise_enabled
              WHERE id = @id`);

    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
