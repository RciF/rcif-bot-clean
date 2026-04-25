// ══════════════════════════════════════════════════════════════════
//  /إحصائيات إضافة — إضافة قناة إحصائية واحدة
//  المسار: commands/stats/add.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleAdd(interaction) {
  const guild    = interaction.guild
  const statType = interaction.options.getString("النوع")
  const category = interaction.options.getChannel("الكاتيقوري")

  await interaction.deferReply()

  // ✅ التأكد من عدم وجود الإحصائية مسبقاً
  const existing = await statsSystem.getChannel(guild.id, statType)
  if (existing) {
    return interaction.editReply({
      content: `❌ الإحصائية **${statType}** موجودة بالفعل: <#${existing.channel_id}>`
    })
  }

  try {
    const value = await statsSystem.calculateStatValue(guild, statType)
    const channelName = statsSystem.formatChannelName(statType, value)

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: category?.id || null,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    })

    await statsSystem.saveChannel(guild.id, channel.id, statType)

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle("✅ تم إضافة قناة إحصائية")
      .addFields(
        { name: "📊 النوع",    value: `\`${statType}\``,          inline: true },
        { name: "📡 القناة",   value: `${channel}`,               inline: true },
        { name: "🔢 القيمة",   value: `**${value.toLocaleString()}**`, inline: true }
      )
      .setFooter({ text: "تتحدث تلقائياً كل 10 دقائق" })
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })

  } catch (err) {
    console.error("[STATS ADD]", err)
    return interaction.editReply({
      content: `❌ فشل الإنشاء: ${err.message}`
    })
  }
}