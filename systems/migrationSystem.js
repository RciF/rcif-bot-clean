// ══════════════════════════════════════════════════════════════════
//  Migration System — Entry Point
//  يستدعي الـ runner الجديد (systems/migrations/_runner.js)
// ══════════════════════════════════════════════════════════════════

const { runAll } = require("./migrations/migrations/_runner")

async function runMigrations() {
  await runAll()
}

module.exports = { runMigrations }