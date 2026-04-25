// ══════════════════════════════════════════════════════════════════
//  /إحصائيات حالة — عرض الإحصائيات الحالية للسيرفر
//  المسار: commands/stats/status.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const statsSystem = require("../../systems/statsSystem")
const { COLORS, buildBar } = require("./_shared")

module.exports = async function handleStatus(interaction) {
  const guild = interaction.guild

  await interaction.deferReply({ ephemeral: true })

  // ✅ جلب الأعضاء
  await guild.members.fetch().catch(() => {})

  const totalMembers  = guild.memberCount
  const onlineMembers = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== "offline").size
  const humanMembers  = guild.members.cache.filter(m => !m.user.bot).size
  const botMembers    = guild.members.cache.filter(m => m.user.bot).size

  const textChannels  = guild.channels.cache.filter(c => c.type === 0).size  // GuildText
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size  // GuildVoice
  const totalChannels = textChannels + voiceChannels

  const rolesCount    = guild.roles.cache.size - 1  // -1 عشان @everyone
  const boostCount    = guild.premiumSubscriptionCount || 0
  const boostLevel    = guild.premiumTier || 0

  const activityPercent = totalMembers > 0
    ? Math.round((onlineMembers / totalMembers) * 100)
    : 0

  const configuredStats = await statsSystem.getAllChannels(guild.id)

  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle(`📊 إحصائيات ${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      {
        name: "👥 الأعضاء",
        value:
          `▸ الإجمالي: **${totalMembers.toLocaleString()}**\n` +
          `▸ متصلين: **${onlineMembers}** (${activityPercent}%)\n` +
          `▸ بشر: **${humanMembers}** | بوتات: **${botMembers}**`,
        inline: false
      },
      {
        name: "📊 نشاط السيرفر",
        value: buildBar(activityPercent) + ` ${activityPercent}%`,
        inline: false
      },
      {
        name: "📡 القنوات",
        value:
          `▸ نصية: **${textChannels}**\n` +
          `▸ صوتية: **${voiceChannels}**\n` +
          `▸ الإجمالي: **${totalChannels}**`,
        inline: true
      },
      {
        name: "🏷️ الرتب",
        value: `**${rolesCount}** رتبة`,
        inline: true
      },
      {
        name: "🚀 البوست",
        value:
          `▸ المستوى: **${boostLevel}**\n` +
          `▸ البوستات: **${boostCount}**`,
        inline: true
      },
      {
        name: "⚙️ القنوات المُعدّة",
        value: `**${configuredStats.length}** قناة إحصائية مُفعّلة`,
        inline: false
      }
    )
    .setFooter({ text: `معرف السيرفر: ${guild.id}` })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}