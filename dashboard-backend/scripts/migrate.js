/**
 * ═══════════════════════════════════════════════════════════
 *  Database Migration Script
 *
 *  يضيف الجداول الجديدة المطلوبة للـ V2
 *  للتشغيل: node scripts/migrate.js
 * ═══════════════════════════════════════════════════════════
 */

const { query } = require("../config/database")

const migrations = [
  // ── Welcome ──
  {
    name: "welcome_settings",
    sql: `CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT false,
      welcome_channel TEXT,
      leave_channel TEXT,
      type TEXT DEFAULT 'embed',
      message_text TEXT,
      embed_data JSONB,
      leave_enabled BOOLEAN DEFAULT false,
      leave_message JSONB,
      mention_user BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ── Protection ──
  {
    name: "protection_settings",
    sql: `CREATE TABLE IF NOT EXISTS protection_settings (
      guild_id TEXT PRIMARY KEY,
      anti_spam JSONB DEFAULT '{"enabled":false}'::jsonb,
      anti_raid JSONB DEFAULT '{"enabled":false}'::jsonb,
      anti_nuke JSONB DEFAULT '{"enabled":false}'::jsonb,
      whitelist JSONB DEFAULT '{"roles":[],"members":[]}'::jsonb,
      log_channel TEXT,
      is_locked BOOLEAN DEFAULT false,
      lockdown_started_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ── Logs ──
  {
    name: "log_settings",
    sql: `CREATE TABLE IF NOT EXISTS log_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT false,
      master_channel TEXT,
      use_single_channel BOOLEAN DEFAULT false,
      events JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ── AI ──
  {
    name: "ai_settings",
    sql: `CREATE TABLE IF NOT EXISTS ai_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT false,
      respond_to_mentions BOOLEAN DEFAULT true,
      respond_to_replies BOOLEAN DEFAULT true,
      always_respond_channels JSONB DEFAULT '[]'::jsonb,
      persona TEXT DEFAULT 'friendly',
      custom_prompt TEXT,
      blocked_words JSONB DEFAULT '[]'::jsonb,
      max_response_length INT DEFAULT 500,
      messages_per_day INT DEFAULT 50,
      allowed_channels JSONB DEFAULT '[]'::jsonb,
      creative_model_enabled BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  // ── AI Usage Log ──
  {
    name: "ai_usage_log",
    sql: `CREATE TABLE IF NOT EXISTS ai_usage_log (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      model TEXT,
      tokens_used INT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_ai_usage_guild_date ON ai_usage_log(guild_id, created_at DESC)`,
    ],
  },

  // ── XP ──
  {
    name: "xp_settings",
    sql: `CREATE TABLE IF NOT EXISTS xp_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT true,
      min_xp_per_message INT DEFAULT 15,
      max_xp_per_message INT DEFAULT 25,
      cooldown INT DEFAULT 60,
      multiplier NUMERIC DEFAULT 1,
      disabled_channels JSONB DEFAULT '[]'::jsonb,
      disabled_roles JSONB DEFAULT '[]'::jsonb,
      multipliers JSONB DEFAULT '[]'::jsonb,
      role_rewards JSONB DEFAULT '[]'::jsonb,
      level_up_message JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  {
    name: "xp_users",
    sql: `CREATE TABLE IF NOT EXISTS xp_users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp BIGINT DEFAULT 0,
      level INT DEFAULT 0,
      messages BIGINT DEFAULT 0,
      last_message_at TIMESTAMP,
      PRIMARY KEY (guild_id, user_id)
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_xp_guild_xp ON xp_users(guild_id, xp DESC)`,
    ],
  },

  // ── Economy ──
  {
    name: "economy_settings",
    sql: `CREATE TABLE IF NOT EXISTS economy_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT true,
      currency_symbol TEXT DEFAULT '🪙',
      currency_name TEXT DEFAULT 'كوينز',
      daily_reward JSONB DEFAULT '{"min":100,"max":500}'::jsonb,
      weekly_reward JSONB DEFAULT '{"min":1000,"max":5000}'::jsonb,
      message_reward JSONB DEFAULT '{"min":1,"max":5,"cooldown":60}'::jsonb,
      starting_balance INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  {
    name: "economy_shop",
    sql: `CREATE TABLE IF NOT EXISTS economy_shop (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT,
      price INT NOT NULL,
      type TEXT DEFAULT 'item',
      role_id TEXT,
      stock INT DEFAULT -1,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_shop_guild ON economy_shop(guild_id)`,
    ],
  },

  // ── Tickets ──
  {
    name: "tickets_settings",
    sql: `CREATE TABLE IF NOT EXISTS tickets_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT false,
      panel_channel TEXT,
      category_channel TEXT,
      staff_role TEXT,
      auto_archive_hours INT DEFAULT 48,
      transcripts JSONB DEFAULT '{"enabled":false}'::jsonb,
      welcome_message TEXT,
      panel JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
  },

  {
    name: "tickets",
    sql: `CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL UNIQUE,
      category TEXT,
      status TEXT DEFAULT 'open',
      staff_id TEXT,
      opened_at TIMESTAMP DEFAULT NOW(),
      closed_at TIMESTAMP,
      transcript_url TEXT
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_tickets_guild_status ON tickets(guild_id, status)`,
    ],
  },

  // ── Reaction Roles ──
  {
    name: "button_role_panels",
    sql: `CREATE TABLE IF NOT EXISTS button_role_panels (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      message_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      channel_id TEXT,
      color INT DEFAULT 10181046,
      exclusive BOOLEAN DEFAULT false,
      buttons JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_role_panels_guild ON button_role_panels(guild_id)`,
    ],
  },

  // ── Moderation ──
  {
    name: "moderation_warnings",
    sql: `CREATE TABLE IF NOT EXISTS moderation_warnings (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON moderation_warnings(guild_id, user_id)`,
    ],
  },

  {
    name: "moderation_bans",
    sql: `CREATE TABLE IF NOT EXISTS moderation_bans (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT,
      reason TEXT,
      moderator_id TEXT,
      banned_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_bans_unique ON moderation_bans(guild_id, user_id)`,
    ],
  },

  {
    name: "moderation_mutes",
    sql: `CREATE TABLE IF NOT EXISTS moderation_mutes (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT,
      moderator_id TEXT,
      muted_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_mutes_guild_user ON moderation_mutes(guild_id, user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_mutes_expires ON moderation_mutes(expires_at)`,
    ],
  },

  // ── Events ──
  {
    name: "events",
    sql: `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      starts_at TIMESTAMP NOT NULL,
      max_participants INT,
      channel TEXT,
      reminder_hours INT DEFAULT 1,
      registered_users JSONB DEFAULT '[]'::jsonb,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_events_guild ON events(guild_id, starts_at DESC)`,
    ],
  },

  // ── Scheduler ──
  {
    name: "scheduled_tasks",
    sql: `CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      channel_id TEXT,
      payload JSONB,
      schedule JSONB NOT NULL,
      enabled BOOLEAN DEFAULT true,
      last_run_at TIMESTAMP,
      next_run_at TIMESTAMP,
      run_count INT DEFAULT 0,
      success_count INT DEFAULT 0,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_scheduler_next ON scheduled_tasks(next_run_at) WHERE enabled = true`,
    ],
  },

  // ── Embed Templates ──
  {
    name: "embed_templates",
    sql: `CREATE TABLE IF NOT EXISTS embed_templates (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data JSONB NOT NULL,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_embed_templates_guild ON embed_templates(guild_id)`,
    ],
  },
]

async function runMigrations() {
  console.log("═══════════════════════════════════════════")
  console.log("🔄 Running database migrations...")
  console.log("═══════════════════════════════════════════")

  let success = 0
  let failed = 0

  for (const migration of migrations) {
    try {
      await query(migration.sql)
      console.log(`✅ ${migration.name}`)

      if (migration.indexes) {
        for (const idx of migration.indexes) {
          await query(idx)
        }
      }

      success++
    } catch (err) {
      console.error(`❌ ${migration.name}: ${err.message}`)
      failed++
    }
  }

  console.log("═══════════════════════════════════════════")
  console.log(`✅ Successful: ${success}`)
  if (failed > 0) console.log(`❌ Failed: ${failed}`)
  console.log("═══════════════════════════════════════════")
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err)
      process.exit(1)
    })
}

module.exports = { runMigrations }
