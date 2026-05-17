// ══════════════════════════════════════════════════════════════════
//  Migration 031 — log_settings JSONB columns
//
//  يضيف الأعمدة الجديدة المستخدمة من الداش:
//   • events           : JSONB { event_key: { enabled, channel } }
//   • master_channel   : قناة موحدة لكل اللوقات
//   • use_single_channel : تفعيل القناة الموحدة
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  await db.query(`
    ALTER TABLE log_settings
    ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '{}'::jsonb;
  `)

  await db.query(`
    ALTER TABLE log_settings
    ADD COLUMN IF NOT EXISTS master_channel TEXT;
  `)

  await db.query(`
    ALTER TABLE log_settings
    ADD COLUMN IF NOT EXISTS use_single_channel BOOLEAN DEFAULT false;
  `)
}