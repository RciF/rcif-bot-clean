const { ChannelType, AuditLogEvent } = require("discord.js")
const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const protectionSystem = require("../../systems/protectionSystem")
const logger = require("../../systems/loggerSystem")

const CHANNEL_TYPES = {
  [ChannelType.GuildText]: "نصية",
  [ChannelType.GuildVoice]: "صوتية",
  [ChannelType.GuildCategory]: "تصنيف",
  [ChannelType.GuildAnnouncement]: "إعلانات",
  [ChannelType.GuildStageVoice]: "مسرح",
  [ChannelType.GuildForum]: "منتدى"
}

module.exports = {
  name: "channelDelete",

  async execute(channel, client) {
    try {
      if (!channel.guild) return

      const typeName = CHANNEL_TYPES[channel.type] || "غير معروف"

      // ══ Log العادي ══
      await sendLog(client, channel.guild.id, "channel_delete", {
        title: "➖ قناة محذوفة",
        color: LOG_COLORS.delete,
        fields: [
          { name: "📌 القناة", value: `#${channel.name}`, inline: true },
          { name: "📂 النوع", value: typeName, inline: true },
          { name: "🗂️ التصنيف", value: channel.parent?.name || "بدون تصنيف", inline: true }
        ],
        footer: `معرف القناة: ${channel.id}`
      })

      // ══ Anti-Nuke ══
      await new Promise(r => setTimeout(r, 800))

      const logs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      }).catch(() => null)

      if (!logs) return

      const entry = logs.entries.first()
      if (!entry) return
      if (Date.now() - entry.createdTimestamp > 5000) return

      const executorId = entry.executor?.id
      if (!executorId || executorId === client.user.id) return

      await protectionSystem.checkNuke(channel.guild, executorId, "channelDelete")

    } catch (err) {
      logger.error("CHANNEL_DELETE_EVENT_FAILED", { error: err.message })
    }
  }
}