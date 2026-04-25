// ══════════════════════════════════════════════════════════════════
//  LOGS COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../../../systems/databaseSystem")

// ── ألوان الـ Embeds (موحّدة) ──
const COLORS = {
  success: 0x2ecc71,
  danger:  0xe74c3c,
  neutral: 0x95a5a6,
  info:    0x3498db,
  warning: 0xf39c12
}

// ══════════════════════════════════════
//  تأكد من وجود صف السيرفر في log_settings
// ══════════════════════════════════════
async function ensureSettings(guildId) {
  await databaseSystem.query(
    "INSERT INTO log_settings (guild_id, enabled) VALUES ($1, false) ON CONFLICT (guild_id) DO NOTHING",
    [guildId]
  )
}

// ══════════════════════════════════════
//  تحقق من صلاحيات البوت في القناة
// ══════════════════════════════════════
function checkBotPermissions(channel, guild) {
  const permissions = channel.permissionsFor(guild.members.me)
  if (!permissions) return false
  return permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"])
}

// ══════════════════════════════════════
//  رد آمن يتعامل مع أي حالة للـ interaction
// ══════════════════════════════════════
async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload)
    }
    return await interaction.reply(payload)
  } catch {
    return null
  }
}

module.exports = {
  COLORS,
  ensureSettings,
  checkBotPermissions,
  safeReply
}