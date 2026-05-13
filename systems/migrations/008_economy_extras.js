module.exports = async function (db) {
  // Streak columns
  await db.query(`ALTER TABLE economy_users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`).catch(() => {})
  await db.query(`ALTER TABLE economy_users ADD COLUMN IF NOT EXISTS streak_last_day BIGINT DEFAULT 0`).catch(() => {})

  // Card customization
  await db.query(`
    CREATE TABLE IF NOT EXISTS card_customization (
      user_id TEXT PRIMARY KEY,
      background_url TEXT,
      theme_color TEXT DEFAULT 'amber',
      avatar_url TEXT,
      badge_style TEXT DEFAULT 'default',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_premium (
      user_id TEXT PRIMARY KEY,
      plan TEXT DEFAULT 'monthly',
      activated_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      activated_by TEXT,
      notes TEXT
    );
  `)

  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_premium_expires ON user_premium (user_id, expires_at);`)
}