// ══════════════════════════════════════════════════════════════════
//  /إحصائيات تحديث — تحديث اللوحة فوراً
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleRefresh(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const config = await statsSystem.getConfig(interaction.guild.id)
  if (!config || !config.enabled) {
    return interaction.editReply({ content: "❌ اللوحة غير مفعّلة — استخدم /إحصائيات إعداد أولاً." })
  }

  await statsSystem.updatePanel(interaction.guild, interaction.client)

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.success)
        .setDescription("✅ تم تحديث اللوحة الآن!")
        .setTimestamp()
    ]
  })
}
