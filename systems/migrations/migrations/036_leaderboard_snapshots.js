// ══════════════════════════════════════════════════════════════════
//  Migration 036 — Leaderboard Snapshots
//  المسار: systems/migrations/migrations/036_leaderboard_snapshots.js
//
//  ينشئ جدولين لتسجيل لقطات يومية للاقتصاد والـ XP:
//   • economy_snapshots — لقطة لرصيد كل لاعب في نهاية اليوم
//   • xp_snapshots      — لقطة لـ XP كل لاعب في كل سيرفر في نهاية اليوم
//
//  تُستخدم لحساب "كم كسب اليوم/الأسبوع/الشهر" بدقة.
//
//  ⚠️ آمنة 100% — IF NOT EXISTS في كل خطوة
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ═══════════════════════════════════════════════════════════
  //  Economy Snapshots
  // ═══════════════════════════════════════════════════════════
  await db.query(`
    CREATE TABLE IF NOT EXISTS economy_snapshots (
      user_id     TEXT NOT NULL,
      date        DATE NOT NULL,
      coins       BIGINT NOT NULL DEFAULT 0,
      items_count INTEGER NOT NULL DEFAULT 0,
      items_value BIGINT NOT NULL DEFAULT 0,
      net_worth   BIGINT NOT NULL DEFAULT 0,
      created_at  TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, date)
    );
  `)

  // Index للبحث السريع: "كم كان عند فلان قبل يوم/أسبوع/شهر؟"
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_economy_snapshots_date
    ON economy_snapshots (date DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_economy_snapshots_user_date
    ON economy_snapshots (user_id, date DESC);
  `)

  // ═══════════════════════════════════════════════════════════
  //  XP Snapshots
  //  لكل (user_id, guild_id) في كل يوم نسجّل total_xp + level
  // ═══════════════════════════════════════════════════════════
  await db.query(`
    CREATE TABLE IF NOT EXISTS xp_snapshots (
      user_id    TEXT NOT NULL,
      guild_id   TEXT NOT NULL,
      date       DATE NOT NULL,
      level      INTEGER NOT NULL DEFAULT 0,
      xp         INTEGER NOT NULL DEFAULT 0,
      total_xp   BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, guild_id, date)
    );
  `)

  // Index للبحث السريع per-guild
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_xp_snapshots_guild_date
    ON xp_snapshots (guild_id, date DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_xp_snapshots_user_guild_date
    ON xp_snapshots (user_id, guild_id, date DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_xp_snapshots_date
    ON xp_snapshots (date DESC);
  `)
}