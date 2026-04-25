// ══════════════════════════════════════════════════════════════════
//  /لوق إزالة — إيقاف تسجيل حدث معين
//  المسار: commands/admin/logs/remove.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { clearCache, EVENT_TYPES } = require("../../../utils/logSender")
const { COLORS } = require("./_shared")

module.exports = async function handleRemove(interaction, guildId) {
  const eventKey = interaction.options.getString("الحدث")

  const eventInfo = EVENT_TYPES.find(e => e.key === eventKey)

  if (!eventInfo) {
    return interaction.reply({
      content: "❌ حدث غير صالح",
      ephemeral: true
    })
  }

  await databaseSystem.query(
    "UPDATE log_settings SET " + eventInfo.column + " = NULL WHERE guild_id = $1",
    [guildId]
  )

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 تم إيقاف السجل")
    .setColor(COLORS.danger)
    .setDescription(eventInfo.emoji + " **" + eventInfo.label + "** — تم الإيقاف")
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}