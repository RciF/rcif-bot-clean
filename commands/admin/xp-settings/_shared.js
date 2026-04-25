// ══════════════════════════════════════════════════════════════════
//  XP-SETTINGS COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../../../systems/databaseSystem")

// ── ألوان الـ Embeds (موحّدة) ──
const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6,
  neutral: 0x5865f2
}

// ══════════════════════════════════════
//  تأكد من وجود صف السيرفر في xp_settings
// ══════════════════════════════════════
async function ensureSettings(guildId) {
  await databaseSystem.query(`
    INSERT INTO xp_settings (guild_id)
    VALUES ($1)
    ON CONFLICT (guild_id) DO NOTHING
  `, [guildId])
}

// ══════════════════════════════════════
//  تحقق من صلاحيات البوت في القناة
// ══════════════════════════════════════
function checkBotPermissions(channel, guild) {
  const permissions = channel.permissionsFor(guild.members.me)
  if (!permissions) return false
  return permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"])
}

module.exports = {
  COLORS,
  ensureSettings,
  checkBotPermissions
}