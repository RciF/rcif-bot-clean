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

      const oldContent = oldMessage.content || "بدون محتوى"
      const newContent = newMessage.content || "بدون محتوى"

      await sendLog(client, newMessage.guild.id, "message_update", {
        title: "✏️ رسالة معدّلة",
        color: LOG_COLORS.update,
        fields: [
          { name: "👤 الكاتب", value: `${newMessage.author} (${newMessage.author.tag})`, inline: true },
          { name: "📌 القناة", value: `${newMessage.channel}`, inline: true },
          { name: "📝 قبل التعديل", value: oldContent.length > 1024 ? oldContent.slice(0, 1021) + "..." : oldContent },
          { name: "📝 بعد التعديل", value: newContent.length > 1024 ? newContent.slice(0, 1021) + "..." : newContent }
        ],
        footer: `معرف الرسالة: ${newMessage.id} • اضغط للانتقال`
      })
    } catch (err) {
      logger.error("LOG_MESSAGE_UPDATE_FAILED", { error: err.message })
    }
  }
}