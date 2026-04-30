// ══════════════════════════════════════════════════════════════════
//  /إحصائيات إيقاف — إيقاف نظام الإحصائيات
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleDisable(interaction) {
  await interaction.deferReply({ ephemeral: true })

  await statsSystem.disableStats(interaction.guild.id)

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.danger)
        .setDescription("🔴 تم إيقاف نظام الإحصائيات.\nاستخدم `/إحصائيات إعداد` لتفعيله مجدداً.")
        .setTimestamp()
    ]
  })
}
