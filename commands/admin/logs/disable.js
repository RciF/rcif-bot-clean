// ══════════════════════════════════════════════════════════════════
//  /لوق إيقاف — إيقاف نظام السجلات بالكامل
//  المسار: commands/admin/logs/disable.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { clearCache } = require("../../../utils/logSender")
const { COLORS } = require("./_shared")

module.exports = async function handleDisable(interaction, guildId) {
  await databaseSystem.query(
    "UPDATE log_settings SET enabled = false WHERE guild_id = $1",
    [guildId]
  )

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 نظام السجلات — معطّل")
    .setColor(COLORS.danger)
    .setDescription("🔴 تم إيقاف نظام السجلات")
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}