// ══════════════════════════════════════════════════════════════════
//  /لوق مسح — مسح جميع إعدادات السجلات
//  المسار: commands/admin/logs/reset.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { clearCache } = require("../../../utils/logSender")
const { COLORS } = require("./_shared")

module.exports = async function handleReset(interaction, guildId) {
  await databaseSystem.query(
    "DELETE FROM log_settings WHERE guild_id = $1",
    [guildId]
  )

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 تم مسح إعدادات السجلات")
    .setColor(COLORS.neutral)
    .setDescription("تم مسح جميع إعدادات السجلات")
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}