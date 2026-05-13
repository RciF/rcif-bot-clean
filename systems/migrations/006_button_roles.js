module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS button_role_panels (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT,
      message_id TEXT UNIQUE,
      title TEXT NOT NULL DEFAULT 'اختر رتبتك',
      description TEXT,
      color TEXT DEFAULT 'أزرق',
      image_url TEXT,
      thumbnail TEXT,
      exclusive BOOLEAN DEFAULT false,
      buttons JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // Color fix: INT → TEXT لو الجدول قديم
  try {
    const r = await db.queryOne(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'button_role_panels' AND column_name = 'color'
    `)
    if (r && r.data_type === "integer") {
      await db.query(`
        ALTER TABLE button_role_panels
        ALTER COLUMN color TYPE TEXT
        USING ('#' || LPAD(TO_HEX(color), 6, '0'))
      `)
      await db.query(`ALTER TABLE button_role_panels ALTER COLUMN color SET DEFAULT 'أزرق'`)
    }
  } catch {}

  await db.query(`
    CREATE TABLE IF NOT EXISTS button_roles (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      label TEXT NOT NULL,
      emoji TEXT,
      color TEXT DEFAULT 'أزرق',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
}