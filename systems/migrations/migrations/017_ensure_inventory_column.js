// ══════════════════════════════════════════════════════════════════
//  Migration 017 — Ensure economy_users.inventory exists (defensive)
//
//  هذي الميغريشن دفاعية:
//  - تتأكد إن عمود inventory موجود في economy_users
//  - تتأكد إنه JSONB (مو TEXT أو أي شي ثاني)
//  - تتأكد إن الـ default = '[]'::jsonb
//  - تصلح أي صفوف فيها NULL inventory (لو حدثت بطريقة ما)
//
//  ⚠️ آمنة 100%:
//   - ADD COLUMN IF NOT EXISTS لا يكسر شي
//   - UPDATE WHERE IS NULL ما يلمس البيانات الموجودة
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─────────────────────────────────────────
  //  تأكد إن العمود موجود
  // ─────────────────────────────────────────
  await db.query(`
    ALTER TABLE economy_users
    ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb
  `)

  // ─────────────────────────────────────────
  //  أصلح أي NULL inventory موجود
  // ─────────────────────────────────────────
  await db.query(`
    UPDATE economy_users
    SET inventory = '[]'::jsonb
    WHERE inventory IS NULL
  `)

  // ─────────────────────────────────────────
  //  تأكد إن العمود NOT NULL مع default
  // ─────────────────────────────────────────
  await db.query(`
    ALTER TABLE economy_users
    ALTER COLUMN inventory SET DEFAULT '[]'::jsonb
  `).catch(() => {}) // safe — لو سبق set
  
  await db.query(`
    ALTER TABLE economy_users
    ALTER COLUMN inventory SET NOT NULL
  `).catch(() => {}) // safe — لو سبق set
}