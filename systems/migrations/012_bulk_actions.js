// ══════════════════════════════════════════════════════════════════
//  Migration 012 — Bulk Actions Undo History
//
//  جدول واحد:
//   - bulk_actions : كل عملية جماعية تُسجّل هنا
//
//  Schema design:
//   - action_type : 'ban' | 'kick' | 'mute' | 'role_add' | 'role_remove' | 'message_delete' | ...
//   - target_type : 'member' | 'message' | 'word' | 'giveaway' | ...
//   - targets : JSONB array — كل target له snapshot للحالة قبل العملية
//   - executed_by : user_id اللي سوى العملية
//   - reverted_at : لو انعمل undo، نسجل الوقت
//
//  Auto-expire: 30 ثانية للـ Undo، لكن السجل يبقى للـ audit لـ 7 أيام
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS bulk_actions (
      id              SERIAL PRIMARY KEY,
      guild_id        TEXT NOT NULL,
      executed_by     TEXT NOT NULL,
      action_type     TEXT NOT NULL,
      target_type     TEXT NOT NULL,
      targets         JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata        JSONB DEFAULT '{}'::jsonb,
      success_count   INTEGER DEFAULT 0,
      failed_count    INTEGER DEFAULT 0,
      reverted_at     TIMESTAMP,
      reverted_by     TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_bulk_actions_guild
    ON bulk_actions (guild_id, created_at DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_bulk_actions_undoable
    ON bulk_actions (guild_id, created_at DESC)
    WHERE reverted_at IS NULL;
  `)
}