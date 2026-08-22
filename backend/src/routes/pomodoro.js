const express = require('express');
const { getPool, sql } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authMiddleware);

// POST /api/pomodoro/complete - complete a pomodoro session
router.post('/complete', async (req, res) => {
  try {
    const { started_at, completed_at, duration_minutes } = req.body;
    const userId = req.user.id;
    const db = await getPool();

    // Get current user
    const userResult = await db.request()
      .input('id', sql.UniqueIdentifier, userId)
      .query('SELECT level, xp, total_pomodoros, total_focus_minutes FROM users WHERE id = @id');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.recordset[0];
    const xpEarned = 25;
    let newXp = user.xp + xpEarned;
    let newLevel = user.level;
    let leveledUp = false;

    while (newXp >= 100) {
      newXp -= 100;
      newLevel += 1;
      leveledUp = true;
    }

    const sessionId = uuidv4();
    const focusMinutes = duration_minutes || 25;

    await db.request()
      .input('id', sql.UniqueIdentifier, sessionId)
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('started_at', sql.DateTime, new Date(started_at))
      .input('completed_at', sql.DateTime, new Date(completed_at))
      .input('duration_minutes', sql.Int, focusMinutes)
      .input('xp_earned', sql.Int, xpEarned)
      .input('level_after', sql.Int, newLevel)
      .query(`INSERT INTO pomodoro_sessions (id, user_id, started_at, completed_at, duration_minutes, xp_earned, level_after)
              VALUES (@id, @user_id, @started_at, @completed_at, @duration_minutes, @xp_earned, @level_after)`);

    await db.request()
      .input('id', sql.UniqueIdentifier, userId)
      .input('xp', sql.Int, newXp)
      .input('level', sql.Int, newLevel)
      .input('total_pomodoros', sql.Int, user.total_pomodoros + 1)
      .input('total_focus_minutes', sql.Int, user.total_focus_minutes + focusMinutes)
      .query(`UPDATE users SET xp = @xp, level = @level,
              total_pomodoros = @total_pomodoros,
              total_focus_minutes = @total_focus_minutes
              WHERE id = @id`);

    res.json({
      xp_earned: xpEarned,
      new_xp: newXp,
      new_level: newLevel,
      leveled_up: leveledUp,
      total_pomodoros: user.total_pomodoros + 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/pomodoro/stats - statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getPool();

    // Today stats
    const todayResult = await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`SELECT COUNT(*) as count, ISNULL(SUM(duration_minutes), 0) as total_minutes
              FROM pomodoro_sessions
              WHERE user_id = @user_id
              AND CAST(completed_at AS DATE) = CAST(GETDATE() AS DATE)`);

    // This week stats
    const weekResult = await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`SELECT COUNT(*) as count, ISNULL(SUM(duration_minutes), 0) as total_minutes,
              COUNT(DISTINCT CAST(completed_at AS DATE)) as active_days
              FROM pomodoro_sessions
              WHERE user_id = @user_id
              AND completed_at >= DATEADD(day, -6, CAST(GETDATE() AS DATE))`);

    // Streak: consecutive days with at least 1 pomodoro
    const streakResult = await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`WITH dates AS (
                SELECT DISTINCT CAST(completed_at AS DATE) AS session_date
                FROM pomodoro_sessions
                WHERE user_id = @user_id
              ),
              numbered AS (
                SELECT session_date,
                  DATEDIFF(day, '2000-01-01', session_date) - ROW_NUMBER() OVER (ORDER BY session_date) AS grp
                FROM dates
              )
              SELECT MAX(streak) as best_streak FROM (
                SELECT COUNT(*) as streak FROM numbered GROUP BY grp
              ) t`);

    // Hourly distribution
    const hourlyResult = await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`SELECT DATEPART(hour, started_at) as hour, COUNT(*) as count
              FROM pomodoro_sessions
              WHERE user_id = @user_id
              GROUP BY DATEPART(hour, started_at)
              ORDER BY hour`);

    // Daily this week breakdown
    const dailyResult = await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`SELECT CAST(completed_at AS DATE) as date, COUNT(*) as count
              FROM pomodoro_sessions
              WHERE user_id = @user_id
              AND completed_at >= DATEADD(day, -6, CAST(GETDATE() AS DATE))
              GROUP BY CAST(completed_at AS DATE)
              ORDER BY date`);

    const today = todayResult.recordset[0];
    const week = weekResult.recordset[0];

    res.json({
      today: {
        pomodoros: today.count,
        focus_minutes: today.total_minutes,
      },
      week: {
        pomodoros: week.count,
        focus_minutes: week.total_minutes,
        active_days: week.active_days,
        avg_daily: week.active_days > 0 ? Math.round(week.count / 7) : 0,
      },
      best_streak: streakResult.recordset[0]?.best_streak || 0,
      hourly: hourlyResult.recordset,
      daily: dailyResult.recordset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
