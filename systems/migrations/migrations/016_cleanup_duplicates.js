// ══════════════════════════════════════════════════════════════════
//  Migration 016 — Cleanup Duplicate Tables
//
//  يحذف الجداول المكررة أو المهجورة:
//   • events            — مكرر مع guild_events (الكود يستخدم guild_events)
//   • guild_settings    — مكرر مع guilds (الكود يستخدم guilds)
//   • inventory         — مهجور (الكود يستخدم economy_users.inventory JSONB)
//   • users             — مهجور (الكود يستخدم economy_users و xp)
//   • ai_knowledge      — يحتاج pgvector، غير مدعوم في Render Basic
//
//  ⚠️ هذه الـ migration آمنة لأن:
//   - DROP TABLE IF EXISTS لا يفشل لو الجدول غير موجود
//   - CASCADE يحذف الـ foreign keys المرتبطة (إن وُجدت)
//   - تم تأكيد إن الكود الفعلي يستخدم الجداول البديلة
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─────────────────────────────────────────
  //  حذف events (مكرر مع guild_events)
  // ─────────────────────────────────────────
  await db.query(`DROP TABLE IF EXISTS events CASCADE;`)

  // ─────────────────────────────────────────
  //  حذف guild_settings (مكرر مع guilds)
  // ─────────────────────────────────────────
  await db.query(`DROP TABLE IF EXISTS guild_settings CASCADE;`)

  // ─────────────────────────────────────────
  //  حذف inventory المستقل (الكود يستخدم JSONB)
  // ─────────────────────────────────────────
  await db.query(`DROP TABLE IF EXISTS inventory CASCADE;`)

  // ─────────────────────────────────────────
  //  حذف users (مكرر — economy_users + xp بدلاً عنه)
  // ─────────────────────────────────────────
  await db.query(`DROP TABLE IF EXISTS users CASCADE;`)

  // ─────────────────────────────────────────
  //  حذف ai_knowledge (يحتاج pgvector غير مدعوم)
  // ─────────────────────────────────────────
  await db.query(`DROP TABLE IF EXISTS ai_knowledge CASCADE;`)
}