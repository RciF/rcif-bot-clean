// ══════════════════════════════════════════════════════════════════
//  /إحصائيات تحديث — تحديث كل القنوات الآن يدوياً
//  المسار: commands/stats/update.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleUpdate(interaction) {
  const guild = interaction.guild

  await interaction.deferReply()

  const channels = await statsSystem.getAllChannels(guild.id)

  if (channels.length === 0) {
    return interaction.editReply({
      content: "❌ ما فيه قنوات إحصائيات في هذا السيرفر"
    })
  }

  let updated = 0
  let failed = 0

  for (const stat of channels) {
    try {
      const channel = guild.channels.cache.get(stat.channel_id)
      if (!channel) {
        failed++
        continue
      }

      const value = await statsSystem.calculateStatValue(guild, stat.stat_type)
      const newName = statsSystem.formatChannelName(stat.stat_type, value)

      if (channel.name !== newName) {
        await channel.setName(newName, "تحديث يدوي")
      }

      updated++

      // ✅ تأخير عشان rate limit
      await new Promise(r => setTimeout(r, 600))

    } catch (err) {
      console.error("[STATS UPDATE]", err.message)
      failed++
    }
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle("🔄 تم تحديث الإحصائيات")
    .addFields(
      { name: "✅ تم تحديثها", value: `**${updated}** قناة`, inline: true },
      { name: "❌ فشلت",       value: `**${failed}** قناة`,  inline: true }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}