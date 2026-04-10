const { ChannelType } = require("discord.js")
const { sendLog, LOG_COLORS } = require("../../utils/logSender")
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
    } catch (err) {
      logger.error("LOG_CHANNEL_DELETE_FAILED", { error: err.message })
    }
  }
}