/**
 * ═══════════════════════════════════════════════════════════
 *  Database Migration Script — FINAL (Bot-Aware)
 *
 *  ⚠️ مهم: هذا الـ script يفترض إن البوت أنشأ معظم الجداول
 *  - البوت ينشئ: welcome_settings, log_settings, xp_settings, ticket_settings,
 *    protection_settings, button_role_panels, warnings, economy_users
 *  - الباك اند ينشئ فقط: ai_settings, ai_usage_log, economy_settings, economy_shop,
 *    moderation_bans, moderation_mutes, scheduled_tasks, embed_templates,
 *    dashboard_audit_log, payment_requests, guild_command_settings, guild_prefix_settings
 *
 *  للتشغيل: node scripts/migrate.js
 * ═══════════════════════════════════════════════════════════
 */

const { query } = require("../config/database")

// ════════════════════════════════════════════════════════════
//  Helper: إضافة عمود لجدول موجود (آمن)
// ════════════════════════════════════════════════════════════

async function addColumn(table, column, definition) {
  try {
    await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`)
    return true
  } catch (err) {
    if (err.code === "42P01") return false // table doesn't exist
    console.error(`   ❌ ${table}.${column}: ${err.message}`)
    return false
  }
}

async function createTable(name, sql, indexes = []) {
  try {
    await query(sql)
    for (const idx of indexes) await query(idx)
    return true
  } catch (err) {
    console.error(`   ❌ ${name}: ${err.message}`)
    return false
  }
}

// ════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════

async function runMigrations() {
  console.log("═══════════════════════════════════════════")
  console.log("🔄 Running dashboard migrations (Bot-aware)...")
  console.log("═══════════════════════════════════════════")

  let success = 0

  // ──────────────────────────────────────────────────
  //  1. أعمدة جديدة لجداول البوت الموجودة
  // ──────────────────────────────────────────────────
  console.log("\n📋 Extending bot tables...")

  // welcome_settings
  await addColumn("welcome_settings", "type", "TEXT DEFAULT 'embed'")
  await addColumn("welcome_settings", "embed_data", "JSONB")
  await addColumn("welcome_settings", "leave_enabled", "BOOLEAN DEFAULT false")
  await addColumn("welcome_settings", "leave_message", "JSONB")
  await addColumn("welcome_settings", "mention_user", "BOOLEAN DEFAULT true")
  await addColumn("welcome_settings", "updated_at", "TIMESTAMP DEFAULT NOW()")

  // log_settings (يضيف JSONB events للداش)
  await addColumn("log_settings", "master_channel", "TEXT")
  await addColumn("log_settings", "use_single_channel", "BOOLEAN DEFAULT false")
  await addColumn("log_settings", "events", "JSONB DEFAULT '{}'::jsonb")
  await addColumn("log_settings", "updated_at", "TIMESTAMP DEFAULT NOW()")

  // xp_settings
  await addColumn("xp_settings", "enabled", "BOOLEAN DEFAULT true")
  await addColumn("xp_settings", "min_xp_per_message", "INT DEFAULT 15")
  await addColumn("xp_settings", "max_xp_per_message", "INT DEFAULT 25")
  await addColumn("xp_settings", "cooldown", "INT DEFAULT 60")
  await addColumn("xp_settings", "disabled_roles", "JSONB DEFAULT '[]'::jsonb")
  await addColumn("xp_settings", "multipliers", "JSONB DEFAULT '[]'::jsonb")
  await addColumn("xp_settings", "role_rewards", "JSONB DEFAULT '[]'::jsonb")
  await addColumn("xp_settings", "level_up_message", "JSONB DEFAULT '{}'::jsonb")
  await addColumn("xp_settings", "updated_at", "TIMESTAMP DEFAULT NOW()")

  // ticket_settings
  await addColumn("ticket_settings", "panel_channel", "TEXT")
  await addColumn("ticket_settings", "panel", "JSONB DEFAULT '{}'::jsonb")
  await addColumn(
    "ticket_settings",
    "transcripts",
    `JSONB DEFAULT '{"enabled":false}'::jsonb`,
  )

  // protection_settings (lockdown columns)
  await addColumn("protection_settings", "is_locked", "BOOLEAN DEFAULT false")
  await addColumn("protection_settings", "lockdown_started_at", "TIMESTAMP")

  // button_role_panels
  await addColumn("button_role_panels", "title", "TEXT")
  await addColumn("button_role_panels", "description", "TEXT")
  await addColumn("button_role_panels", "channel_id", "TEXT")
  await addColumn("button_role_panels", "color", "INT DEFAULT 10181046")
  await addColumn("button_role_panels", "exclusive", "BOOLEAN DEFAULT false")
  await addColumn("button_role_panels", "buttons", "JSONB DEFAULT '[]'::jsonb")
  await addColumn("button_role_panels", "updated_at", "TIMESTAMP DEFAULT NOW()")

  console.log("   ✅ Bot tables extended")
  success++

  // ──────────────────────────────────────────────────
  //  2. جداول جديدة (للداش فقط)
  // ──────────────────────────────────────────────────
  console.log("\n📋 Creating dashboard-only tables...")

  // AI Settings
  if (
    await createTable(
      "ai_settings",
      `CREATE TABLE IF NOT EXISTS ai_settings (
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
    )
  ) {
    console.log("   ✅ ai_settings")
    success++
  }

  // AI Usage Log
  if (
    await createTable(
      "ai_usage_log",
      `CREATE TABLE IF NOT EXISTS ai_usage_log (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        model TEXT,
        tokens_used INT,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      [
        `CREATE INDEX IF NOT EXISTS idx_ai_usage_guild_date ON ai_usage_log(guild_id, created_at DESC)`,
      ],
    )
  ) {
    console.log("   ✅ ai_usage_log")
    success++
  }

  // Economy Settings (per-guild)
  if (
    await createTable(
      "economy_settings",
      `CREATE TABLE IF NOT EXISTS economy_settings (
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
    )
  ) {
    console.log("   ✅ economy_settings")
    success++
  }

  // Economy Shop
  if (
    await createTable(
      "economy_shop",
      `CREATE TABLE IF NOT EXISTS economy_shop (
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
      [`CREATE INDEX IF NOT EXISTS idx_shop_guild ON economy_shop(guild_id)`],
    )
  ) {
    console.log("   ✅ economy_shop")
    success++
  }

  // Moderation Bans
  if (
    await createTable(
      "moderation_bans",
      `CREATE TABLE IF NOT EXISTS moderation_bans (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        reason TEXT,
        moderator_id TEXT,
        banned_at TIMESTAMP DEFAULT NOW()
      )`,
      [`CREATE UNIQUE INDEX IF NOT EXISTS idx_bans_unique ON moderation_bans(guild_id, user_id)`],
    )
  ) {
    console.log("   ✅ moderation_bans")
    success++
  }

  // Moderation Mutes
  if (
    await createTable(
      "moderation_mutes",
      `CREATE TABLE IF NOT EXISTS moderation_mutes (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reason TEXT,
        moderator_id TEXT,
        muted_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )`,
      [`CREATE INDEX IF NOT EXISTS idx_mutes_guild_user ON moderation_mutes(guild_id, user_id)`],
    )
  ) {
    console.log("   ✅ moderation_mutes")
    success++
  }

  // Scheduled Tasks
  if (
    await createTable(
      "scheduled_tasks",
      `CREATE TABLE IF NOT EXISTS scheduled_tasks (
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
      [
        `CREATE INDEX IF NOT EXISTS idx_scheduler_next ON scheduled_tasks(next_run_at) WHERE enabled = true`,
      ],
    )
  ) {
    console.log("   ✅ scheduled_tasks")
    success++
  }

  // Embed Templates
  if (
    await createTable(
      "embed_templates",
      `CREATE TABLE IF NOT EXISTS embed_templates (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        data JSONB NOT NULL,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      [`CREATE INDEX IF NOT EXISTS idx_embed_templates_guild ON embed_templates(guild_id)`],
    )
  ) {
    console.log("   ✅ embed_templates")
    success++
  }

  // Dashboard Audit Log
  if (
    await createTable(
      "dashboard_audit_log",
      `CREATE TABLE IF NOT EXISTS dashboard_audit_log (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT,
        action TEXT NOT NULL,
        target TEXT,
        old_value JSONB,
        new_value JSONB,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      [
        `CREATE INDEX IF NOT EXISTS idx_audit_guild ON dashboard_audit_log(guild_id, created_at DESC)`,
      ],
    )
  ) {
    console.log("   ✅ dashboard_audit_log")
    success++
  }

  // Payment Requests
  if (
    await createTable(
      "payment_requests",
      `CREATE TABLE IF NOT EXISTS payment_requests (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        ref_number TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP
      )`,
      [`CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_requests(status)`],
    )
  ) {
    console.log("   ✅ payment_requests")
    success++
  }

  // Guild Command Settings
  if (
    await createTable(
      "guild_command_settings",
      `CREATE TABLE IF NOT EXISTS guild_command_settings (
        guild_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        custom_name TEXT,
        enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (guild_id, command_name)
      )`,
    )
  ) {
    console.log("   ✅ guild_command_settings")
    success++
  }

  // Guild Prefix Settings
  if (
    await createTable(
      "guild_prefix_settings",
      `CREATE TABLE IF NOT EXISTS guild_prefix_settings (
        guild_id TEXT PRIMARY KEY,
        prefix TEXT NOT NULL DEFAULT '!',
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
    )
  ) {
    console.log("   ✅ guild_prefix_settings")
    success++
  }

  // ════════════════════════════════════════════════════════════
  //  Summary
  // ════════════════════════════════════════════════════════════

  console.log("\n═══════════════════════════════════════════")
  console.log(`✅ Total operations: ${success}`)
  console.log("═══════════════════════════════════════════")
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err)
      process.exit(1)
    })
}

module.exports = { runMigrations }
