// ══════════════════════════════════════════════════════════════════
//  /إحصائيات تقرير — التقرير الأسبوعي
// ══════════════════════════════════════════════════════════════════

const statsSystem = require("../../systems/statsSystem")

module.exports = async function handleReport(interaction) {
  await interaction.deferReply()
  const embed = await statsSystem.buildWeeklyReport(interaction.guild)
  return interaction.editReply({ embeds: [embed] })
}
