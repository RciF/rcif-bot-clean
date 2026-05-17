// ══════════════════════════════════════════════════════════════════
//  Migration 013 — AI Core Tables
//
//  ينشئ الجداول الأساسية لنظام الذكاء الاصطناعي:
//   • ai_settings        — إعدادات AI لكل سيرفر
//   • ai_conversations   — تاريخ محادثات AI
//   • ai_usage_log       — تتبع استخدام AI (للحدود اليومية)
//   • memories           — ذاكرة طويلة المدى لكل مستخدم
//   • relationships      — تتبع التفاعلات بين المستخدمين
//
//  ملاحظة: تم حذف ai_knowledge (pgvector) لأنه لا يدعمه Render Basic
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─────────────────────────────────────────
  //  ai_settings — إعدادات AI لكل سيرفر
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT false,
      respond_to_mentions BOOLEAN DEFAULT true,
      respond_to_replies BOOLEAN DEFAULT true,
      always_respond_channels JSONB DEFAULT '[]'::jsonb,
      persona TEXT DEFAULT 'friendly',
      custom_prompt TEXT,
      blocked_words JSONB DEFAULT '[]'::jsonb,
      max_response_length INTEGER DEFAULT 500,
      messages_per_day INTEGER DEFAULT 50,
      allowed_channels JSONB DEFAULT '[]'::jsonb,
      creative_model_enabled BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─────────────────────────────────────────
  //  ai_conversations — تاريخ المحادثات
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL DEFAULT 'dm',
      channel_id TEXT NOT NULL DEFAULT 'dm',
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at BIGINT DEFAULT (EXTRACT(epoch FROM NOW()) * 1000)::bigint
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_conv_lookup
    ON ai_conversations (user_id, guild_id, channel_id, created_at DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_conv_cleanup
    ON ai_conversations (created_at);
  `)

  // ─────────────────────────────────────────
  //  ai_usage_log — تتبع الاستخدام
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_log (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      model TEXT,
      tokens_used INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_usage_guild_date
    ON ai_usage_log (guild_id, created_at DESC);
  `)

  // ─────────────────────────────────────────
  //  memories — ذاكرة طويلة المدى
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      memory TEXT NOT NULL,
      created_at BIGINT DEFAULT (EXTRACT(epoch FROM NOW()) * 1000)::bigint
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_memories_user
    ON memories (user_id, created_at DESC);
  `)

  // ─────────────────────────────────────────
  //  relationships — التفاعلات بين المستخدمين
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS relationships (
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      last_interaction BIGINT,
      PRIMARY KEY (user_a, user_b)
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_relationships_last
    ON relationships (last_interaction DESC);
  `)
}