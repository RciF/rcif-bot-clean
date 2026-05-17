// ══════════════════════════════════════════════════════════════════
//  Migration 032 — xp_settings missing columns
//
//  يضيف الأعمدة المستخدمة من الكود لكن مفقودة في schema الأصلي:
//   • enabled              : تفعيل النظام
//   • min_xp_per_message   : أقل XP لكل رسالة
//   • max_xp_per_message   : أكبر XP لكل رسالة
//   • cooldown             : وقت الانتظار بين الرسائل (بالثواني)
//   • disabled_roles       : رتب لا تكسب XP
//   • multipliers          : مضاعفات لكل قناة/رتبة
//   • role_rewards         : رتب تُعطى عند الترقية
//   • level_up_message     : إعدادات رسالة الترقية
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;`)
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS min_xp_per_message INTEGER DEFAULT 15;`)
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS max_xp_per_message INTEGER DEFAULT 25;`)
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS cooldown INTEGER DEFAULT 60;`)
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS disabled_roles JSONB DEFAULT '[]'::jsonb;`)
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS multipliers JSONB DEFAULT '[]'::jsonb;`)
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS role_rewards JSONB DEFAULT '[]'::jsonb;`)
  await db.query(`ALTER TABLE xp_settings ADD COLUMN IF NOT EXISTS level_up_message JSONB DEFAULT '{"enabled":true}'::jsonb;`)
}