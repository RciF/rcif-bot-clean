// ══════════════════════════════════════════════════════════════════
//  Database Audit Script — Lyn Bot
//  المسار: db_audit.js
//
//  الاستخدام:
//    node db_audit.js
//
//  الإخراج:
//    db_audit_report.txt — تقرير شامل قابل للمشاركة
//
//  ⚠️ READ-ONLY — السكريبت يقرأ فقط، ما يعدّل أي شي
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

// ──────────────────────────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────────────────────────

const REPORT_FILE = path.join(__dirname, "db_audit_report.txt")

// الجداول المتوقعة (من الكود)
const EXPECTED_TABLES = [
  // من 001_initial
  "users",
  "guilds",
  "xp",
  "xp_settings",
  "analytics",
  "inventory",

  // من 002_log_settings
  "log_settings",

  // من 003_tickets
  "tickets",
  "ticket_settings",

  // من 004_welcome
  "welcome_settings",

  // من 005_protection
  "protection_settings",

  // من 006_button_roles
  "button_role_panels",
  "button_roles",

  // من 007_events
  "guild_events",
  "event_attendees",

  // من 008_economy_extras
  "card_customization",
  "user_premium",

  // من 009_auto_role
  "auto_role_settings",
  "auto_role_assignments",
  "auto_role_history",

  // من 010_giveaway
  "giveaways",
  "giveaway_entries",

  // من 011_automod
  "automod_settings",
  "automod_words",
  "automod_violations",

  // من 012_bulk_actions
  "bulk_actions",

  // System tables
  "schema_migrations",

  // مستخدمة في الكود لكن مو في migrations (هذي المشكلة!)
  "economy_users",
  "economy_settings",
  "economy_shop",
  "ai_conversations",
  "ai_settings",
  "ai_usage_log",
  "ai_memories",
  "ai_token_usage",
  "warnings",
  "moderation_bans",
  "moderation_mutes",
  "scheduled_tasks",
  "embed_templates",
  "stats_config",
  "stats_channels",
  "stats_snapshots",
  "stats_hourly",
  "guild_analytics",
  "guild_command_settings",
  "guild_prefix_settings",
  "guild_command_aliases",
  "guild_command_restrictions",
  "guild_command_defaults",
  "command_usage_stats",
  "subscriptions",
  "payment_requests",
  "guild_subscriptions",
  "dashboard_audit_log",
  "help_hidden_categories",
]

// ──────────────────────────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────────────────────────

const lines = []

function log(text = "") {
  console.log(text)
  lines.push(text)
}

function header(title) {
  log("")
  log("═".repeat(70))
  log("  " + title)
  log("═".repeat(70))
}

function section(title) {
  log("")
  log("─".repeat(70))
  log("  " + title)
  log("─".repeat(70))
}

// ──────────────────────────────────────────────────────────────────
//  AUDIT FUNCTIONS
// ──────────────────────────────────────────────────────────────────

async function getAllTables(client) {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  return result.rows.map((r) => r.table_name)
}

async function getTableColumns(client, tableName) {
  const result = await client.query(
    `
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [tableName],
  )
  return result.rows
}

async function getTableRowCount(client, tableName) {
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM "${tableName}"`,
    )
    return parseInt(result.rows[0].count, 10)
  } catch (err) {
    return -1
  }
}

async function getTableIndexes(client, tableName) {
  const result = await client.query(
    `
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
    ORDER BY indexname
  `,
    [tableName],
  )
  return result.rows
}

async function getPrimaryKey(client, tableName) {
  const result = await client.query(
    `
    SELECT
      a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum)
  `,
    [tableName],
  )
  return result.rows.map((r) => r.column_name)
}

async function getForeignKeys(client, tableName) {
  const result = await client.query(
    `
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = $1
  `,
    [tableName],
  )
  return result.rows
}

async function getAppliedMigrations(client) {
  try {
    const result = await client.query(
      `SELECT id, applied_at FROM schema_migrations ORDER BY id`,
    )
    return result.rows
  } catch (err) {
    return null
  }
}

async function getDatabaseSize(client) {
  const result = await client.query(`
    SELECT
      pg_database.datname AS db_name,
      pg_size_pretty(pg_database_size(pg_database.datname)) AS size
    FROM pg_database
    WHERE datname = current_database()
  `)
  return result.rows[0]
}

// ──────────────────────────────────────────────────────────────────
//  MAIN
// ──────────────────────────────────────────────────────────────────

async function run() {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error("❌ DATABASE_URL غير موجود في .env")
    console.error("   تأكد إن الملف .env في نفس مجلد السكريبت")
    process.exit(1)
  }

  console.log("🔌 جاري الاتصال بقاعدة البيانات...")

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("render.com")
      ? { rejectUnauthorized: false }
      : false,
  })

  try {
    await client.connect()
  } catch (err) {
    console.error("❌ فشل الاتصال:", err.message)
    process.exit(1)
  }

  console.log("✅ الاتصال ناجح\n")

  // ─────────────────────────────────────────
  //  HEADER
  // ─────────────────────────────────────────

  header("DATABASE AUDIT REPORT — Lyn Bot")
  log("Generated: " + new Date().toISOString())

  // ─── Database info ───
  const dbInfo = await getDatabaseSize(client)
  log("Database:   " + dbInfo.db_name)
  log("Size:       " + dbInfo.size)

  // ─────────────────────────────────────────
  //  MIGRATIONS
  // ─────────────────────────────────────────

  header("APPLIED MIGRATIONS")

  const migrations = await getAppliedMigrations(client)

  if (migrations === null) {
    log("⚠️  جدول schema_migrations غير موجود!")
  } else if (migrations.length === 0) {
    log("⚠️  ما فيه أي migration مطبقة!")
  } else {
    log("Total: " + migrations.length + " migration(s)")
    log("")
    for (const m of migrations) {
      log("  ✓ " + m.id.padEnd(35) + " " + m.applied_at.toISOString())
    }
  }

  // ─────────────────────────────────────────
  //  ALL TABLES
  // ─────────────────────────────────────────

  header("ALL TABLES IN DATABASE")

  const allTables = await getAllTables(client)
  log("Total: " + allTables.length + " table(s)")
  log("")

  for (const t of allTables) {
    const count = await getTableRowCount(client, t)
    const countStr = count >= 0 ? count.toLocaleString().padStart(8) : "  ERROR"
    log("  " + countStr + " rows   " + t)
  }

  // ─────────────────────────────────────────
  //  EXPECTED vs ACTUAL
  // ─────────────────────────────────────────

  header("EXPECTED vs ACTUAL")

  const actualSet = new Set(allTables)
  const expectedSet = new Set(EXPECTED_TABLES)

  const missing = EXPECTED_TABLES.filter((t) => !actualSet.has(t))
  const unexpected = allTables.filter((t) => !expectedSet.has(t))

  section("❌ MISSING TABLES (متوقعة لكن غير موجودة)")
  if (missing.length === 0) {
    log("  ✅ ما فيه جداول مفقودة")
  } else {
    log("  Total: " + missing.length)
    log("")
    for (const t of missing) {
      log("  ❌ " + t)
    }
  }

  section("⚠️  UNEXPECTED TABLES (موجودة لكن غير معروفة)")
  if (unexpected.length === 0) {
    log("  ✅ ما فيه جداول غير معروفة")
  } else {
    log("  Total: " + unexpected.length)
    log("")
    for (const t of unexpected) {
      log("  ⚠️  " + t)
    }
  }

  // ─────────────────────────────────────────
  //  DETAILED SCHEMA FOR EACH TABLE
  // ─────────────────────────────────────────

  header("DETAILED SCHEMA FOR EACH TABLE")

  for (const tableName of allTables) {
    section("TABLE: " + tableName)

    // Row count
    const count = await getTableRowCount(client, tableName)
    log("  Rows: " + (count >= 0 ? count.toLocaleString() : "ERROR"))

    // Primary key
    const pk = await getPrimaryKey(client, tableName)
    if (pk.length > 0) {
      log("  Primary Key: (" + pk.join(", ") + ")")
    } else {
      log("  Primary Key: ⚠️  NONE")
    }

    // Columns
    const columns = await getTableColumns(client, tableName)
    log("  Columns: " + columns.length)
    log("")
    log("  " + "Column".padEnd(30) + "Type".padEnd(20) + "Nullable  Default")
    log("  " + "─".repeat(80))

    for (const col of columns) {
      const colName = col.column_name.padEnd(30)
      let typeStr = col.data_type
      if (col.character_maximum_length) {
        typeStr += "(" + col.character_maximum_length + ")"
      }
      typeStr = typeStr.padEnd(20)

      const nullable = (col.is_nullable === "YES" ? "YES" : "NO ").padEnd(8)
      const defaultVal = col.column_default
        ? String(col.column_default).slice(0, 30)
        : ""

      log("  " + colName + typeStr + "  " + nullable + "  " + defaultVal)
    }

    // Indexes
    const indexes = await getTableIndexes(client, tableName)
    if (indexes.length > 0) {
      log("")
      log("  Indexes:")
      for (const idx of indexes) {
        log("    • " + idx.indexname)
      }
    }

    // Foreign Keys
    const fks = await getForeignKeys(client, tableName)
    if (fks.length > 0) {
      log("")
      log("  Foreign Keys:")
      for (const fk of fks) {
        log(
          "    • " +
            fk.column_name +
            " → " +
            fk.foreign_table +
            "(" +
            fk.foreign_column +
            ")",
        )
      }
    }
  }

  // ─────────────────────────────────────────
  //  FINAL SUMMARY
  // ─────────────────────────────────────────

  header("SUMMARY")

  log("Total tables:        " + allTables.length)
  log("Applied migrations:  " + (migrations?.length || 0))
  log("Missing tables:      " + missing.length)
  log("Unexpected tables:   " + unexpected.length)
  log("")

  if (missing.length === 0 && unexpected.length === 0) {
    log("✅ قاعدة البيانات نظيفة 100%")
  } else {
    log("⚠️  فيه مشاكل تحتاج إصلاح — راجع القسم 'EXPECTED vs ACTUAL'")
  }

  // ─────────────────────────────────────────
  //  WRITE REPORT
  // ─────────────────────────────────────────

  fs.writeFileSync(REPORT_FILE, lines.join("\n"), "utf8")

  console.log("\n" + "═".repeat(70))
  console.log("✅ التقرير محفوظ في: " + REPORT_FILE)
  console.log("═".repeat(70))

  await client.end()
}

run().catch((err) => {
  console.error("❌ خطأ غير متوقع:", err)
  process.exit(1)
})