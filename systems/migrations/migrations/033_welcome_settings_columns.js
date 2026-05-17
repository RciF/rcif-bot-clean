// ══════════════════════════════════════════════════════════════════
//  Migration 033 — welcome_settings missing columns
//
//  أعمدة يستخدمها الكود والداش لكنها مفقودة في schema الأصلي:
//   • mention_user   : منشن العضو في رسالة الترحيب
//   • leave_enabled  : تفعيل رسالة الوداع منفصلاً
//   • leave_message  : JSONB لرسالة الوداع المتقدمة
//   • type           : "text" | "embed"
//   • embed_data     : JSONB لـ embed الترحيب
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  await db.query(`ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS mention_user BOOLEAN DEFAULT true;`)
  await db.query(`ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS leave_enabled BOOLEAN DEFAULT false;`)
  await db.query(`ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS leave_message JSONB;`)
  await db.query(`ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';`)
  await db.query(`ALTER TABLE welcome_settings ADD COLUMN IF NOT EXISTS embed_data JSONB;`)
}