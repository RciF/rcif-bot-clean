// ══════════════════════════════════════════════════════════════════
//  Migrations Runner
//  المسار: systems/migrations/migrations/_runner.js
//
//  - يقرأ كل ملفات migrations/*.js (ما عدا اللي تبدأ بـ _)
//  - يتجاهل اللي طُبّقت (مسجّلة في schema_migrations)
//  - يشغّل الباقي بترتيب الاسم
//
//  ⚠️ هذا هو المسار الوحيد الذي يشتغل
//  ⚠️ أي migration يجب أن تكون هنا (systems/migrations/migrations/)
//  ⚠️ ملفات في systems/migrations/*.js المباشرة لا تشتغل!
// ══════════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const databaseSystem = require("../../databaseSystem")
const logger = require("../../loggerSystem")

async function ensureMigrationsTable() {
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          TEXT PRIMARY KEY,
      applied_at  TIMESTAMP DEFAULT NOW()
    );
  `)
}

async function getAppliedMigrations() {
  const result = await databaseSystem.query("SELECT id FROM schema_migrations")
  return new Set((result.rows || []).map(r => r.id))
}

async function markApplied(id) {
  await databaseSystem.query(
    "INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING",
    [id]
  )
}

async function runAll() {
  await ensureMigrationsTable()
  const applied = await getAppliedMigrations()

  const dir = __dirname
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".js") && !f.startsWith("_"))
    .sort()

  let appliedCount = 0
  let skippedCount = 0

  for (const file of files) {
    const id = file.replace(/\.js$/, "")

    if (applied.has(id)) {
      skippedCount++
      continue
    }

    const migration = require(path.join(dir, file))
    if (typeof migration !== "function") {
      logger.warn(`MIGRATION_INVALID ${id} (not a function)`)
      continue
    }

    try {
      await migration(databaseSystem)
      await markApplied(id)
      appliedCount++
      logger.success(`MIGRATION_APPLIED ${id}`)
    } catch (err) {
      logger.error(`MIGRATION_FAILED ${id}`, { error: err.message })
      throw err
    }
  }

  logger.info(`MIGRATIONS_DONE applied=${appliedCount} skipped=${skippedCount}`)
}

module.exports = { runAll }