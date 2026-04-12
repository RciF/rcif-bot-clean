const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "messageUpdate",
  async execute(oldMessage, newMessage, client) {
    try {
      if (!newMessage.guild) return
      if (newMessage.author?.bot) return
      if (oldMessage.partial || newMessage.partial) return
      if (oldMessage.content === newMessage.content) return
      await sendLog(client, newMessage.guild.id, "message_update", {
        title: "✏️ رسالة معدّلة",
        color: LOG_COLORS.update,
        fields: [
          { name: "👤 الكاتب", value: newMessage.author.tag, inline: true },
          { name: "📌 القناة", value: newMessage.channel.name, inline: true },
          { name: "📝 قبل التعديل", value: (oldMessage.content || "بدون محتوى").slice(0, 1024) },
          { name: "📝 بعد التعديل", value: (newMessage.content || "بدون محتوى").slice(0, 1024) }
        ],
        footer: "معرف الرسالة: " + newMessage.id
      })
    } catch (err) {
      logger.error("LOG_MESSAGE_UPDATE_FAILED", { error: err.message })
    }
  }
}