/**
 * ═══════════════════════════════════════════════════════════
 *  Commands Aliases Migration (Batch 1)
 *
 *  ⚠️ هذا الـ script ينشئ جداول جديدة فقط:
 *  - guild_command_aliases    : الاختصارات (alias → command)
 *  - guild_command_restrictions: الرولات/الرومات المسموحة والممنوعة
 *  - guild_command_defaults   : الإعدادات الافتراضية (الوقت، الحذف التلقائي)
 *  - command_usage_stats      : إحصائيات الاستخدام (للـ leaderboard)
 *
 *  ⚠️ لا يلمس أي جدول موجود — آمن 100% للتشغيل في production
 *
 *  للتشغيل: node scripts/migrate-commands.js
 * ═══════════════════════════════════════════════════════════
 */

const { query } = require("../config/database")

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

async function runCommandsMigration() {
  console.log("═══════════════════════════════════════════")
  console.log("🔄 Running commands aliases migration...")
  console.log("═══════════════════════════════════════════")

  let success = 0

  // ──────────────────────────────────────────────────────────
  //  1. guild_command_aliases
  //  alias → original command name (per guild)
  //
  //  المفتاح المركّب (guild_id, alias) يضمن:
  //  - alias واحد = أمر واحد فقط في كل سيرفر
  //  - لكن نفس الأمر يقدر يكون له عدة aliases
  // ──────────────────────────────────────────────────────────

  if (
    await createTable(
      "guild_command_aliases",
      `CREATE TABLE IF NOT EXISTS guild_command_aliases (
        guild_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        command_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (guild_id, alias)
      )`,
      [
        // فهرس للبحث عن كل aliases أمر معين
        `CREATE INDEX IF NOT EXISTS idx_aliases_guild_command
         ON guild_command_aliases(guild_id, command_name)`,
      ],
    )
  ) {
    console.log("   ✅ guild_command_aliases")
    success++
  }

  // ──────────────────────────────────────────────────────────
  //  2. guild_command_restrictions
  //  الرولات/الرومات المسموحة والممنوعة لكل أمر
  //
  //  JSONB يخزن:
  //  {
  //    enabled_roles:    ['roleId1', 'roleId2'],   // whitelist
  //    disabled_roles:   ['roleId3'],               // blacklist
  //    enabled_channels: ['channelId1'],            // whitelist
  //    disabled_channels:['channelId2']             // blacklist
  //  }
  // ──────────────────────────────────────────────────────────

  if (
    await createTable(
      "guild_command_restrictions",
      `CREATE TABLE IF NOT EXISTS guild_command_restrictions (
        guild_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        restrictions JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (guild_id, command_name)
      )`,
    )
  ) {
    console.log("   ✅ guild_command_restrictions")
    success++
  }

  // ──────────────────────────────────────────────────────────
  //  3. guild_command_defaults
  //  الإعدادات الافتراضية لكل أمر
  //
  //  JSONB يخزن:
  //  {
  //    default_duration:        '24h',   // الوقت الافتراضي للـ mute/ban
  //    delete_invocation:       false,   // حذف رسالة الأمر بعد التنفيذ
  //    delete_response:         false,   // حذف رد البوت بعد X ثواني
  //    delete_response_after:   5,       // عدد الثواني للحذف
  //    delete_on_user_delete:   false    // حذف رد البوت إذا حذف العضو رسالته
  //  }
  // ──────────────────────────────────────────────────────────

  if (
    await createTable(
      "guild_command_defaults",
      `CREATE TABLE IF NOT EXISTS guild_command_defaults (
        guild_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (guild_id, command_name)
      )`,
    )
  ) {
    console.log("   ✅ guild_command_defaults")
    success++
  }

  // ──────────────────────────────────────────────────────────
  //  4. command_usage_stats
  //  إحصائيات الاستخدام لكل أمر في كل سيرفر (للـ leaderboard)
  //
  //  ملاحظة: يوجد جدول analytics على مستوى البوت بشكل عام،
  //  لكن هذا الجدول للـ per-guild leaderboard
  // ──────────────────────────────────────────────────────────

  if (
    await createTable(
      "command_usage_stats",
      `CREATE TABLE IF NOT EXISTS command_usage_stats (
        guild_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        usage_count BIGINT DEFAULT 0,
        last_used_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (guild_id, command_name)
      )`,
      [
        // فهرس لترتيب الـ leaderboard
        `CREATE INDEX IF NOT EXISTS idx_usage_guild_count
         ON command_usage_stats(guild_id, usage_count DESC)`,
      ],
    )
  ) {
    console.log("   ✅ command_usage_stats")
    success++
  }

  console.log("\n═══════════════════════════════════════════")
  console.log(`✅ Total operations: ${success}/4`)
  console.log("═══════════════════════════════════════════")

  return success
}

if (require.main === module) {
  runCommandsMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err)
      process.exit(1)
    })
}

module.exports = { runCommandsMigration }