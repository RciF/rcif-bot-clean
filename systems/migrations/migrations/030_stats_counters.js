// ══════════════════════════════════════════════════════════════════
//  Migration 030 — Stats Counters (daily)
//
//  جدول يومي للعدّ السريع:
//   • messages_count : عدد الرسائل (من messageCreate)
//   • commands_count : عدد الأوامر (من interactionCreate)
//
//  Row واحد لكل (guild_id, date) → كفاءة عالية
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS stats_counters (
      guild_id TEXT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      messages_count BIGINT DEFAULT 0,
      commands_count BIGINT DEFAULT 0,
      ai_commands_count BIGINT DEFAULT 0,
      PRIMARY KEY (guild_id, date)
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_stats_counters_guild_date
    ON stats_counters (guild_id, date DESC);
  `)
}