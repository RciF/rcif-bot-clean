// ══════════════════════════════════════════════════════════════════
//  Migration 018 — Lazy Tables (Final cleanup)
//
//  جداول كانت تنشأ lazy من الكود — نضمن وجودها من البداية:
//   • warnings              — تحذيرات الأعضاء
//   • moderation_bans       — سجل الحظر
//   • moderation_mutes      — سجل الكتم
//   • embed_templates       — قوالب الإيمبد
//   • stats_channels        — قنوات الإحصائيات
//   • guild_command_settings — إعدادات الأوامر المخصصة
//   • guild_prefix_settings  — البريفكس المخصص
//   • help_hidden_categories — تصنيفات help المخفية
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─────────────────────────────────────────
  //  warnings — تحذيرات الأعضاء
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS warnings (
      id SERIAL PRIMARY KEY,
      guild_id TEXT,
      user_id TEXT,
      moderator_id TEXT,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_warnings_guild_user
    ON warnings (guild_id, user_id);
  `)

  // ─────────────────────────────────────────
  //  moderation_bans — سجل الحظر
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS moderation_bans (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT,
      reason TEXT,
      moderator_id TEXT,
      banned_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_bans_guild_user
    ON moderation_bans (guild_id, user_id);
  `)

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bans_unique
    ON moderation_bans (guild_id, user_id);
  `)

  // ─────────────────────────────────────────
  //  moderation_mutes — سجل الكتم
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS moderation_mutes (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      moderator_id TEXT,
      muted_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_mutes_guild_user
    ON moderation_mutes (guild_id, user_id);
  `)

  // ─────────────────────────────────────────
  //  embed_templates — قوالب الإيمبد
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS embed_templates (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data JSONB NOT NULL,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_embed_templates_guild
    ON embed_templates (guild_id);
  `)

  // ─────────────────────────────────────────
  //  stats_channels — قنوات الإحصائيات الصوتية
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS stats_channels (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      stat_type TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (guild_id, stat_type)
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_stats_guild
    ON stats_channels (guild_id);
  `)

  // ─────────────────────────────────────────
  //  guild_command_settings — إعدادات الأوامر
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS guild_command_settings (
      guild_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      custom_name TEXT,
      enabled BOOLEAN DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (guild_id, command_name)
    );
  `)

  // ─────────────────────────────────────────
  //  guild_prefix_settings — البريفكس المخصص
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS guild_prefix_settings (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT NOT NULL DEFAULT '!',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─────────────────────────────────────────
  //  help_hidden_categories — تصنيفات help المخفية
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS help_hidden_categories (
      guild_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      hidden_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (guild_id, category_id)
    );
  `)
}