// ══════════════════════════════════════════════════════════════════
//  Migration 011 — AutoMod System
//
//  3 جداول:
//   - automod_settings  : إعدادات السيرفر (مفعل/معطل لكل filter)
//   - automod_words     : قائمة كلمات مخصصة (banned/warned)
//   - automod_violations: سجل المخالفات (للـ warnings progressive)
//
//  Filters المدعومة:
//   - bad_words      : كلمات سيئة (بالإضافة لقائمة افتراضية)
//   - links          : روابط (whitelist للنطاقات المسموحة)
//   - invites        : دعوات Discord
//   - caps           : النص بالكابيتال (% threshold)
//   - mass_mentions  : منشن جماعي
//   - emojis         : إيموجي زيادة
//   - duplicate      : رسائل متكررة (نفس النص)
//   - zalgo          : نصوص مشوهة
//
//  لكل filter: enabled + action + whitelist channels/roles
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─── إعدادات AutoMod (JSONB واحد لكل سيرفر) ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS automod_settings (
      guild_id      TEXT PRIMARY KEY,
      enabled       BOOLEAN DEFAULT false,
      filters       JSONB DEFAULT '{}'::jsonb,
      whitelist     JSONB DEFAULT '{"roles":[],"channels":[],"users":[]}'::jsonb,
      log_channel   TEXT,
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─── الكلمات المخصصة ───
  // type: 'banned' | 'warned'  (banned يحذف الرسالة + عقوبة، warned يحذف فقط)
  // match_type: 'exact' | 'contains' | 'regex'
  await db.query(`
    CREATE TABLE IF NOT EXISTS automod_words (
      id         SERIAL PRIMARY KEY,
      guild_id   TEXT NOT NULL,
      word       TEXT NOT NULL,
      type       TEXT DEFAULT 'banned',
      match_type TEXT DEFAULT 'contains',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (guild_id, word)
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_automod_words_guild
    ON automod_words (guild_id);
  `)

  // ─── سجل المخالفات (لتطبيق warnings progressive) ───
  // كل مخالفة تنتهي بعد 24 ساعة (decay) — معتمد على created_at
  await db.query(`
    CREATE TABLE IF NOT EXISTS automod_violations (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      filter_type TEXT NOT NULL,
      action      TEXT NOT NULL,
      message_id  TEXT,
      content     TEXT,
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_automod_violations_user
    ON automod_violations (guild_id, user_id, created_at DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_automod_violations_created
    ON automod_violations (created_at);
  `)
}