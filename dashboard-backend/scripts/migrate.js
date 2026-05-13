/**
 * ═══════════════════════════════════════════════════════════
 *  Dashboard Migrations — DEPRECATED
 *  Schema authority الآن في البوت (systems/migrations/)
 *  هذا الـ script صار no-op للتوافق
 * ═══════════════════════════════════════════════════════════
 */

async function runMigrations() {
  console.log("ℹ️  Dashboard migrations skipped — schema is managed by the bot")
  return
}

if (require.main === module) {
  runMigrations().then(() => process.exit(0))
}

module.exports = { runMigrations }