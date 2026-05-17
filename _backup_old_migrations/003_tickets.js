module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_settings (
      guild_id TEXT PRIMARY KEY,
      category_id TEXT,
      log_channel_id TEXT,
      support_role_id TEXT,
      welcome_message TEXT,
      max_open_tickets INTEGER DEFAULT 1,
      auto_close_hours INTEGER DEFAULT 48,
      transcript_enabled BOOLEAN DEFAULT true,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      claimed_by TEXT,
      closed_by TEXT,
      close_reason TEXT,
      message_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      closed_at TIMESTAMP
    );
  `)

  await db.query(`ALTER TABLE ticket_settings ADD COLUMN IF NOT EXISTS panel_channel TEXT;`)
  await db.query(`ALTER TABLE ticket_settings ADD COLUMN IF NOT EXISTS panel JSONB DEFAULT '{}'::jsonb;`)
  await db.query(`ALTER TABLE ticket_settings ADD COLUMN IF NOT EXISTS transcripts JSONB DEFAULT '{"enabled":false}'::jsonb;`)
}