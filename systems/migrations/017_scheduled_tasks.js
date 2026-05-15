// ══════════════════════════════════════════════════════════════════
//  Migration 017 — Scheduled Tasks
//
//  جدول المهام المجدولة من الداش (cron-like)
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
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
      run_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduler_next
    ON scheduled_tasks (next_run_at)
    WHERE enabled = true;
  `)
}