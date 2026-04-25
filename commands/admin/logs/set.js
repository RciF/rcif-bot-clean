// ══════════════════════════════════════════════════════════════════
//  /لوق ضبط — تحديد قناة لحدث معين
//  المسار: commands/admin/logs/set.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { clearCache, EVENT_TYPES } = require("../../../utils/logSender")
const { COLORS, ensureSettings, checkBotPermissions } = require("./_shared")

module.exports = async function handleSet(interaction, guildId) {
  const eventKey = interaction.options.getString("الحدث")
  const channel  = interaction.options.getChannel("القناة")

  const eventInfo = EVENT_TYPES.find(e => e.key === eventKey)

  if (!eventInfo) {
    return interaction.reply({
      content: "❌ حدث غير صالح",
      ephemeral: true
    })
  }

  if (!checkBotPermissions(channel, interaction.guild)) {
    return interaction.reply({
      content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة",
      ephemeral: true
    })
  }

  await ensureSettings(guildId)

  await databaseSystem.query(
    "UPDATE log_settings SET " + eventInfo.column + " = $1, enabled = true WHERE guild_id = $2",
    [channel.id, guildId]
  )

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 تم ضبط السجل")
    .setColor(COLORS.success)
    .setDescription(eventInfo.emoji + " **" + eventInfo.label + "** → " + channel)
    .setFooter({ text: "النظام مفعّل تلقائياً" })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}