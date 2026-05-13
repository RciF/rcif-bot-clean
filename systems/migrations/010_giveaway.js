// ══════════════════════════════════════════════════════════════════
//  Migration 010 — Giveaway System
//
//  جدولين:
//   - giveaways         : السحوبات (نشطة + منتهية)
//   - giveaway_entries  : المشاركين
//
//  ميزات:
//   - prize, winner_count, end_at
//   - requirements: required_role, required_level, min_messages
//   - status: 'active' | 'ended' | 'cancelled'
//   - winners: JSONB array من user_ids
//   - reroll history: عدد مرات إعادة السحب
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─── السحوبات ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id              SERIAL PRIMARY KEY,
      guild_id        TEXT NOT NULL,
      channel_id      TEXT NOT NULL,
      message_id      TEXT UNIQUE,
      host_id         TEXT NOT NULL,
      prize           TEXT NOT NULL,
      description     TEXT,
      winner_count    INTEGER DEFAULT 1,
      end_at          TIMESTAMP NOT NULL,
      required_role   TEXT,
      required_level  INTEGER DEFAULT 0,
      status          TEXT DEFAULT 'active',
      winners         JSONB DEFAULT '[]'::jsonb,
      reroll_count    INTEGER DEFAULT 0,
      created_at      TIMESTAMP DEFAULT NOW(),
      ended_at        TIMESTAMP
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_giveaways_guild_status
    ON giveaways (guild_id, status);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_giveaways_end_at
    ON giveaways (end_at) WHERE status = 'active';
  `)

  // ─── المشاركون ───
  await db.query(`
    CREATE TABLE IF NOT EXISTS giveaway_entries (
      id           SERIAL PRIMARY KEY,
      giveaway_id  INTEGER NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
      user_id      TEXT NOT NULL,
      entered_at   TIMESTAMP DEFAULT NOW(),
      UNIQUE (giveaway_id, user_id)
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_giveaway_entries_giveaway
    ON giveaway_entries (giveaway_id);
  `)
}