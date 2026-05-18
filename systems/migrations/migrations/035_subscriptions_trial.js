// ══════════════════════════════════════════════════════════════════
//  Migration 035 — Add is_trial flag to subscriptions
//  المسار: systems/migrations/migrations/035_subscriptions_trial.js
//
//  يضيف:
//   • is_trial    BOOLEAN - يميّز التجربة عن الاشتراك المدفوع
//   • trial_notes TEXT    - ملاحظات الأونر (ليش منحه trial)
//
//  ⚠️ آمنة 100% — IF NOT EXISTS في كل خطوة
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─── is_trial column ───
  await db.query(`
    ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
  `)

  // ─── trial_notes column ───
  await db.query(`
    ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS trial_notes TEXT;
  `)

  // ─── index للبحث السريع عن الـ trials ───
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_subscriptions_is_trial
    ON subscriptions (is_trial) WHERE is_trial = true;
  `)
}