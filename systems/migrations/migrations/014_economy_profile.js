// ══════════════════════════════════════════════════════════════════
//  Migration 014 — Economy & User Profile
//
//  ينشئ جداول الاقتصاد العالمي وملفات المستخدم:
//   • economy_users       — أرصدة المستخدمين (عالمي، بدون guild_id)
//   • economy_settings    — إعدادات الاقتصاد لكل سيرفر
//   • economy_shop        — متجر السيرفر (per-guild)
//   • card_customization  — تخصيص بطاقة المستخدم
//   • user_premium        — Premium الشخصي للمستخدمين
//   • event_settings      — إعدادات الفعاليات لكل سيرفر
//
//  ملاحظة: economy_users يحتوي على inventory كـ JSONB
//  (نظام عالمي — الجدول المستقل inventory سيُحذف في 016)
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─────────────────────────────────────────
  //  economy_users — أرصدة عالمية
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS economy_users (
      user_id TEXT PRIMARY KEY,
      coins INTEGER DEFAULT 0,
      last_daily BIGINT DEFAULT 0,
      last_work BIGINT DEFAULT 0,
      inventory JSONB DEFAULT '[]'::jsonb,
      streak INTEGER DEFAULT 0,
      streak_last_day BIGINT DEFAULT 0
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_economy_users_user_id
    ON economy_users (user_id);
  `)

  // ─────────────────────────────────────────
  //  economy_settings — إعدادات الاقتصاد
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS economy_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT true,
      currency_symbol TEXT DEFAULT '🪙',
      currency_name TEXT DEFAULT 'كوينز',
      daily_reward JSONB DEFAULT '{"min": 100, "max": 500}'::jsonb,
      weekly_reward JSONB DEFAULT '{"min": 1000, "max": 5000}'::jsonb,
      message_reward JSONB DEFAULT '{"min": 1, "max": 5, "cooldown": 60}'::jsonb,
      starting_balance INTEGER DEFAULT 100,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─────────────────────────────────────────
  //  economy_shop — متجر السيرفر
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS economy_shop (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT,
      price INTEGER NOT NULL,
      type TEXT DEFAULT 'item',
      role_id TEXT,
      stock INTEGER DEFAULT -1,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_shop_guild
    ON economy_shop (guild_id);
  `)

  // ─────────────────────────────────────────
  //  card_customization — تخصيص البطاقة
  // ─────────────────────────────────────────
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

  // ─────────────────────────────────────────
  //  user_premium — Premium الشخصي
  // ─────────────────────────────────────────
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

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_premium_expires
    ON user_premium (user_id, expires_at);
  `)

  // ─────────────────────────────────────────
  //  event_settings — إعدادات الفعاليات
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS event_settings (
      guild_id TEXT PRIMARY KEY,
      manager_role_id TEXT,
      log_channel_id TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)
}