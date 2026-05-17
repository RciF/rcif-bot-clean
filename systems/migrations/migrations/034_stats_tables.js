// ══════════════════════════════════════════════════════════════════
//  Migration 034 — Stats Tables (نقل من lazy creation في statsSystem)
//
//  هذي الجداول كانت تنشأ lazy داخل systems/statsSystem.js
//  ننقلها هنا عشان كل الـ schema يكون في مكان واحد:
//   • stats_config    — إعدادات لوحة الإحصائيات لكل سيرفر
//   • stats_snapshots — لقطات يومية (member_count, online, joined, left)
//   • stats_hourly    — معدل المتصلين كل ساعة
//
//  ⚠️ آمنة 100% — CREATE IF NOT EXISTS لا يكسر شي
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─────────────────────────────────────────
  //  stats_config — إعدادات اللوحة لكل سيرفر
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS stats_config (
      guild_id             TEXT PRIMARY KEY,
      panel_channel_id     TEXT,
      panel_message_id     TEXT,
      milestone_channel_id TEXT,
      next_milestone       INTEGER DEFAULT 100,
      enabled              BOOLEAN DEFAULT true,
      created_at           TIMESTAMP DEFAULT NOW(),
      updated_at           TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─────────────────────────────────────────
  //  stats_snapshots — لقطات يومية
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS stats_snapshots (
      id               SERIAL PRIMARY KEY,
      guild_id         TEXT NOT NULL,
      date             DATE NOT NULL DEFAULT CURRENT_DATE,
      member_count     INTEGER DEFAULT 0,
      online_peak      INTEGER DEFAULT 0,
      online_peak_hour INTEGER DEFAULT 0,
      joined_today     INTEGER DEFAULT 0,
      left_today       INTEGER DEFAULT 0,
      UNIQUE (guild_id, date)
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_stats_snapshots_guild_date
    ON stats_snapshots (guild_id, date DESC);
  `)

  // ─────────────────────────────────────────
  //  stats_hourly — معدل المتصلين كل ساعة
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS stats_hourly (
      id         SERIAL PRIMARY KEY,
      guild_id   TEXT NOT NULL,
      hour       INTEGER NOT NULL,
      avg_online NUMERIC(10,2) DEFAULT 0,
      samples    INTEGER DEFAULT 0,
      UNIQUE (guild_id, hour)
    );
  `)
}