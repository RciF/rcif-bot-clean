// ══════════════════════════════════════════════════════════════════
//  Migration 001 — Initial Schema Baseline
//  كل الجداول الأساسية للبوت
//  
//  ⚠️ آمن للسيرفرات القديمة:
//      - CREATE TABLE IF NOT EXISTS لا يكسر شي
//      - ALTER ADD COLUMN IF NOT EXISTS لا يكسر شي
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─── USERS ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      coins INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (id, guild_id)
    );
  `)

  // ─── GUILDS ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      ai_enabled BOOLEAN DEFAULT true,
      xp_enabled BOOLEAN DEFAULT true,
      economy_enabled BOOLEAN DEFAULT true
    );
  `)

  // ─── XP ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS xp (
      user_id TEXT,
      guild_id TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS xp_settings (
      guild_id TEXT PRIMARY KEY,
      levelup_channel_id TEXT,
      xp_multiplier NUMERIC DEFAULT 1,
      disabled_channels JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─── ANALYTICS ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS analytics (
      command TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    );
  `)

  // ─── INVENTORY ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      PRIMARY KEY (user_id, guild_id, item_id)
    );
  `)
}