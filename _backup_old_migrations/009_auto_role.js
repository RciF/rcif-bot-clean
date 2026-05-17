// ══════════════════════════════════════════════════════════════════
//  Migration 009 — Auto Role System
//  
//  جدولين:
//   - auto_role_settings : إعدادات السيرفر (enabled + bot/human مفصولين)
//   - auto_role_assignments : قائمة الرتب التلقائية
//
//  ميزات:
//   - رتب منفصلة للبوتات vs البشر
//   - تأخير اختياري (delay_seconds) — حماية من Raids
//   - شرط verified (للسيرفرات اللي عندها membership screening)
//   - bot_id يدعم rejoin (لو طلع ورجع نفس الشخص — يرجع له الرتب)
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─── إعدادات Auto-Role لكل سيرفر ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS auto_role_settings (
      guild_id          TEXT PRIMARY KEY,
      enabled           BOOLEAN DEFAULT false,
      delay_seconds     INTEGER DEFAULT 0,
      require_verified  BOOLEAN DEFAULT false,
      created_at        TIMESTAMP DEFAULT NOW(),
      updated_at        TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─── الرتب التلقائية ───
  // type: 'human' | 'bot' | 'both'
  await db.query(`
    CREATE TABLE IF NOT EXISTS auto_role_assignments (
      id         SERIAL PRIMARY KEY,
      guild_id   TEXT NOT NULL,
      role_id    TEXT NOT NULL,
      type       TEXT DEFAULT 'human',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (guild_id, role_id, type)
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_auto_role_guild
    ON auto_role_assignments (guild_id);
  `)

  // ─── سجل: من أعطيناه إيش (للـ rejoin restoration لاحقاً) ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS auto_role_history (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      role_ids    JSONB DEFAULT '[]'::jsonb,
      assigned_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_auto_role_history_user
    ON auto_role_history (guild_id, user_id);
  `)
}