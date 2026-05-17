module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS guild_events (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'other',
      start_time BIGINT NOT NULL,
      end_time BIGINT,
      max_attendees INTEGER,
      status TEXT DEFAULT 'upcoming',
      image_url TEXT,
      location TEXT,
      ping_role_id TEXT,
      reminder_sent BOOLEAN DEFAULT false,
      started_notified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`ALTER TABLE guild_events ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`)
  await db.query(`ALTER TABLE guild_events ADD COLUMN IF NOT EXISTS started_notified BOOLEAN DEFAULT false`)

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_attendees (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'going',
      joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    );
  `)

  await db.query(`CREATE INDEX IF NOT EXISTS idx_guild_events_guild ON guild_events (guild_id);`)
  await db.query(`CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees (event_id);`)
}