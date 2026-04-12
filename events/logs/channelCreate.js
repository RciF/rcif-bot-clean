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
  name: "channelCreate",
  async execute(channel, client) {
    try {
      if (!channel.guild) return
      const typeName = CHANNEL_TYPES[channel.type] || "غير معروف"
      await sendLog(client, channel.guild.id, "channel_create", {
        title: "➕ قناة جديدة",
        color: LOG_COLORS.create,
        fields: [
          { name: "📌 القناة", value: channel.name, inline: true },
          { name: "📂 النوع", value: typeName, inline: true },
          { name: "🗂️ التصنيف", value: channel.parent?.name || "بدون تصنيف", inline: true }
        ],
        footer: "معرف القناة: " + channel.id
      })
    } catch (err) {
      logger.error("LOG_CHANNEL_CREATE_FAILED", { error: err.message })
    }
  }
}