const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "messageDelete",

  async execute(message, client) {
    try {
      if (!message.guild) return
      if (message.author?.bot) return
      if (message.partial) return

      const content = message.content || "بدون محتوى نصي"
      const attachments = message.attachments?.size || 0

      const fields = [
        { name: "👤 الكاتب", value: message.author ? `${message.author} (${message.author.tag})` : "غير معروف", inline: true },
        { name: "📌 القناة", value: `${message.channel}`, inline: true },
        { name: "📝 المحتوى", value: content.length > 1024 ? content.slice(0, 1021) + "..." : content }
      ]

      if (attachments > 0) {
        const attachmentList = message.attachments.map(a => `[${a.name}](${a.url})`).join("\n")
        fields.push({ name: `📎 مرفقات (${attachments})`, value: attachmentList.slice(0, 1024) })
      }

      await sendLog(client, message.guild.id, "message_delete", {
        title: "🗑️ رسالة محذوفة",
        color: LOG_COLORS.delete,
        fields,
        footer: `معرف الرسالة: ${message.id}`
      })
    } catch (err) {
      logger.error("LOG_MESSAGE_DELETE_FAILED", { error: err.message })
    }
  }
}