const express = require('express');
const { getPool, sql } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authMiddleware);

// GET /api/friends - list friends
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getPool();

    const result = await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`SELECT u.id, u.nickname, u.email, u.level, u.xp,
                u.total_pomodoros, u.total_focus_minutes,
                f.status, f.created_at,
                f.user_id as requester_id
              FROM friends f
              JOIN users u ON (
                CASE WHEN f.user_id = @user_id THEN f.friend_id ELSE f.user_id END = u.id
              )
              WHERE (f.user_id = @user_id OR f.friend_id = @user_id)
              AND f.status IN ('accepted', 'pending')`);

    const friends = result.recordset.map(r => ({
      ...r,
      is_requester: r.requester_id === userId,
    }));

    // Get weekly pomodoros for each friend
    const enriched = await Promise.all(friends.map(async (friend) => {
      const weekResult = await db.request()
        .input('user_id', sql.UniqueIdentifier, friend.id)
        .query(`SELECT COUNT(*) as weekly_pomodoros
                FROM pomodoro_sessions
                WHERE user_id = @user_id
                AND completed_at >= DATEADD(day, -6, CAST(GETDATE() AS DATE))`);
      const streakResult = await db.request()
        .input('user_id', sql.UniqueIdentifier, friend.id)
        .query(`WITH dates AS (
                  SELECT DISTINCT CAST(completed_at AS DATE) AS session_date
                  FROM pomodoro_sessions WHERE user_id = @user_id
                ),
                numbered AS (
                  SELECT session_date,
                    DATEDIFF(day, '2000-01-01', session_date) - ROW_NUMBER() OVER (ORDER BY session_date) AS grp
                  FROM dates
                )
                SELECT ISNULL(MAX(streak), 0) as best_streak FROM (
                  SELECT COUNT(*) as streak FROM numbered GROUP BY grp
                ) t`);
      return {
        ...friend,
        weekly_pomodoros: weekResult.recordset[0]?.weekly_pomodoros || 0,
        best_streak: streakResult.recordset[0]?.best_streak || 0,
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/friends/request - send friend request
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;
    const db = await getPool();

    const targetResult = await db.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id, nickname FROM users WHERE email = @email');

    if (targetResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const target = targetResult.recordset[0];
    if (target.id === userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    const existing = await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('friend_id', sql.UniqueIdentifier, target.id)
      .query(`SELECT id FROM friends WHERE
              (user_id = @user_id AND friend_id = @friend_id) OR
              (user_id = @friend_id AND friend_id = @user_id)`);

    if (existing.recordset.length > 0) {
      return res.status(409).json({ error: 'Friend request already exists' });
    }

    const id = uuidv4();
    await db.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('friend_id', sql.UniqueIdentifier, target.id)
      .query(`INSERT INTO friends (id, user_id, friend_id, status)
              VALUES (@id, @user_id, @friend_id, 'pending')`);

    res.status(201).json({ message: 'Friend request sent', friend: target });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/friends/:id/accept
router.put('/:id/accept', async (req, res) => {
  try {
    const userId = req.user.id;
    const friendshipId = req.params.id;
    const db = await getPool();

    await db.request()
      .input('id', sql.UniqueIdentifier, friendshipId)
      .input('friend_id', sql.UniqueIdentifier, userId)
      .query(`UPDATE friends SET status = 'accepted'
              WHERE id = @id AND friend_id = @friend_id AND status = 'pending'`);

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/friends/:id/reject
router.put('/:id/reject', async (req, res) => {
  try {
    const userId = req.user.id;
    const friendshipId = req.params.id;
    const db = await getPool();

    await db.request()
      .input('id', sql.UniqueIdentifier, friendshipId)
      .input('friend_id', sql.UniqueIdentifier, userId)
      .query(`DELETE FROM friends WHERE id = @id AND friend_id = @friend_id`);

    res.json({ message: 'Friend request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/friends/:id
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;
    const db = await getPool();

    await db.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .input('friend_id', sql.UniqueIdentifier, friendId)
      .query(`DELETE FROM friends WHERE
              (user_id = @user_id AND friend_id = @friend_id) OR
              (user_id = @friend_id AND friend_id = @user_id)`);

    res.json({ message: 'Friend removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
