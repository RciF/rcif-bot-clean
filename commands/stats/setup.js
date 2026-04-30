// ══════════════════════════════════════════════════════════════════
//  /إحصائيات إعداد — إنشاء لوحة الإحصائيات
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleSetup(interaction) {
  const guild             = interaction.guild
  const channel           = interaction.options.getChannel("القناة") || interaction.channel
  const milestoneChannel  = interaction.options.getChannel("قناة_الاحتفالات")

  await interaction.deferReply({ ephemeral: true })

  // تحقق صلاحيات البوت في القناة المختارة
  const perms = channel.permissionsFor(guild.members.me)
  if (!perms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    return interaction.editReply({
      content: `❌ البوت ما يقدر يرسل في ${channel} — تحقق من الصلاحيات.`
    })
  }

  // لو في لوحة موجودة نحذف الرسالة القديمة
  try {
    const existing = await statsSystem.getConfig(guild.id)
    if (existing?.panel_channel_id && existing?.panel_message_id) {
      const oldChannel = guild.channels.cache.get(existing.panel_channel_id)
      if (oldChannel) {
        const oldMsg = await oldChannel.messages.fetch(existing.panel_message_id).catch(() => null)
        if (oldMsg) await oldMsg.delete().catch(() => {})
      }
    }
  } catch {}

  // إنشاء اللوحة
  const { msg } = await statsSystem.setupPanel(guild, channel, milestoneChannel)

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle("✅ تم إعداد لوحة الإحصائيات")
    .addFields(
      { name: "📊 القناة",           value: `${channel}`,                                    inline: true },
      { name: "🎯 قناة الاحتفالات", value: milestoneChannel ? `${milestoneChannel}` : "—",  inline: true },
      { name: "🔗 اللوحة",           value: `[انقر هنا](${msg.url})`,                        inline: true },
      { name: "🔄 التحديث",          value: "كل 10 دقائق تلقائياً",                          inline: true }
    )
    .setFooter({ text: "استخدم /إحصائيات تقرير لعرض تقرير أسبوعي" })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}
