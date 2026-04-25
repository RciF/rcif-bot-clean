// ══════════════════════════════════════════════════════════════════
//  /إحصائيات مسح — مسح كل قنوات الإحصائيات وحذفها
//  المسار: commands/stats/clear.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleClear(interaction) {
  const guild = interaction.guild

  await interaction.deferReply()

  const channels = await statsSystem.getAllChannels(guild.id)

  if (channels.length === 0) {
    return interaction.editReply({
      content: "❌ ما فيه قنوات إحصائيات لحذفها"
    })
  }

  let deleted = 0
  let categoryToDelete = null

  for (const stat of channels) {
    try {
      const channel = guild.channels.cache.get(stat.channel_id)
      if (channel) {
        // ✅ حفظ مرجع الكاتيقوري عشان نحذفه آخر شي
        if (channel.parent && !categoryToDelete) {
          categoryToDelete = channel.parent
        }
        await channel.delete("مسح قنوات الإحصائيات")
        deleted++
      }
    } catch (err) {
      console.error("[STATS CLEAR] فشل حذف قناة:", err.message)
    }
  }

  // ✅ حذف الكاتيقوري لو فاضي
  if (categoryToDelete) {
    try {
      const refreshed = guild.channels.cache.get(categoryToDelete.id)
      if (refreshed && refreshed.children.cache.size === 0) {
        await refreshed.delete("مسح كاتيقوري الإحصائيات")
      }
    } catch (err) {
      console.error("[STATS CLEAR] فشل حذف الكاتيقوري:", err.message)
    }
  }

  // ✅ مسح من قاعدة البيانات
  await statsSystem.deleteAllChannels(guild.id)

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle("🗑️ تم مسح جميع الإحصائيات")
    .setDescription(`تم حذف **${deleted}** قناة من السيرفر`)
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}