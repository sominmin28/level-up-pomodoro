const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'levelup_pomodoro',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: process.env.NODE_ENV !== 'production',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMilliseconds: 30000,
  },
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

async function initDB() {
  const db = await getPool();

  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
    CREATE TABLE users (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      nickname NVARCHAR(50) NOT NULL,
      email NVARCHAR(100) NOT NULL UNIQUE,
      password_hash NVARCHAR(255) NOT NULL,
      level INT DEFAULT 1,
      xp INT DEFAULT 0,
      total_pomodoros INT DEFAULT 0,
      total_focus_minutes INT DEFAULT 0,
      focus_duration INT DEFAULT 25,
      break_duration INT DEFAULT 5,
      long_break_duration INT DEFAULT 15,
      white_noise_type NVARCHAR(20) DEFAULT 'none',
      white_noise_enabled BIT DEFAULT 0,
      created_at DATETIME DEFAULT GETDATE()
    )
  `);

  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='pomodoro_sessions' AND xtype='U')
    CREATE TABLE pomodoro_sessions (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
      started_at DATETIME NOT NULL,
      completed_at DATETIME NOT NULL,
      duration_minutes INT NOT NULL,
      xp_earned INT DEFAULT 25,
      level_after INT DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='friends' AND xtype='U')
    CREATE TABLE friends (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      user_id UNIQUEIDENTIFIER NOT NULL,
      friend_id UNIQUEIDENTIFIER NOT NULL,
      status NVARCHAR(20) DEFAULT 'pending',
      created_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE NO ACTION,
      UNIQUE (user_id, friend_id)
    )
  `);

  console.log('Database initialized successfully');
}

module.exports = { getPool, initDB, sql };
