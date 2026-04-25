// ══════════════════════════════════════════════════════════════════
//  /إحصائيات تلقائي — إنشاء كل قنوات الإحصائيات تلقائياً
//  المسار: commands/stats/auto.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS, BASIC_STATS, EXTRA_STATS } = require("./_shared")

module.exports = async function handleAuto(interaction) {
  const guild = interaction.guild
  const includeExtra = interaction.options.getBoolean("شامل") || false

  await interaction.deferReply()

  // ✅ إنشاء كاتيقوري الإحصائيات
  let statsCategory
  try {
    statsCategory = await guild.channels.create({
      name: "📊 ┃ إحصائيات السيرفر",
      type: ChannelType.GuildCategory,
      position: 0,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    })
  } catch (err) {
    return interaction.editReply({
      content: `❌ فشل إنشاء الكاتيقوري: ${err.message}`
    })
  }

  // ✅ تحديد الإحصائيات اللي بتنشأ
  const statsToCreate = includeExtra
    ? [...BASIC_STATS, ...EXTRA_STATS]
    : BASIC_STATS

  let created = 0
  let failed = 0

  // ✅ إنشاء القنوات
  for (const statType of statsToCreate) {
    try {
      const value = await statsSystem.calculateStatValue(guild, statType)
      const channelName = statsSystem.formatChannelName(statType, value)

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: statsCategory.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.Connect],
            allow: [PermissionFlagsBits.ViewChannel]
          }
        ]
      })

      await statsSystem.saveChannel(guild.id, channel.id, statType)
      created++

      // تأخير صغير عشان ما نتعدى rate limit
      await new Promise(r => setTimeout(r, 500))

    } catch (err) {
      console.error(`[STATS AUTO] فشل إنشاء ${statType}:`, err.message)
      failed++
    }
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle("📊 إعداد الإحصائيات التلقائية")
    .setDescription(`تم إنشاء قنوات الإحصائيات في الكاتيقوري ${statsCategory}`)
    .addFields(
      { name: "✅ تم إنشاؤه", value: `**${created}** قناة`, inline: true },
      { name: "❌ فشل",       value: `**${failed}** قناة`,  inline: true },
      { name: "🔄 التحديث",   value: "كل 10 دقائق",         inline: true }
    )
    .setFooter({ text: "النظام شغّال — راح تتحدث القنوات تلقائياً" })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}