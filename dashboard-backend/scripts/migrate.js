/**
 * ═══════════════════════════════════════════════════════════
 *  Dashboard Migrations — DEPRECATED
 *
 *  Schema authority الآن في البوت (systems/migrations/).
 *  أي migration جديد يُضاف في:
 *    systems/migrations/00X_xxx.js
 *
 *  هذا الـ script باقي للتوافق فقط — لا يعمل شي.
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