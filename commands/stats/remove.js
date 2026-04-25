// ══════════════════════════════════════════════════════════════════
//  /إحصائيات حذف — حذف قناة إحصائية
//  المسار: commands/stats/remove.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleRemove(interaction) {
  const guild       = interaction.guild
  const statType    = interaction.options.getString("النوع")
  const deleteFromServer = interaction.options.getBoolean("حذف_القناة") || false

  await interaction.deferReply()

  const existing = await statsSystem.getChannel(guild.id, statType)
  if (!existing) {
    return interaction.editReply({
      content: `❌ ما فيه إحصائية بهذا النوع: \`${statType}\``
    })
  }

  // ✅ حذف من قاعدة البيانات
  await statsSystem.deleteChannel(guild.id, statType)

  // ✅ حذف القناة نفسها لو طلب المستخدم
  if (deleteFromServer) {
    try {
      const channel = guild.channels.cache.get(existing.channel_id)
      if (channel) await channel.delete("حذف قناة إحصائية")
    } catch (err) {
      console.error("[STATS REMOVE]", err)
    }
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("🗑️ تم حذف الإحصائية")
    .addFields(
      { name: "📊 النوع",     value: `\`${statType}\``, inline: true },
      {
        name: "📡 القناة",
        value: deleteFromServer ? "تم حذفها" : `<#${existing.channel_id}>`,
        inline: true
      }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}