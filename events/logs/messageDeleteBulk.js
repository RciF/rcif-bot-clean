const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "messageDeleteBulk",
  async execute(messages, channel, client) {
    try {
      if (!channel.guild) return
      await sendLog(client, channel.guild.id, "message_delete", {
        title: "🗑️ حذف رسائل جماعي",
        color: LOG_COLORS.delete,
        fields: [
          { name: "📌 القناة", value: channel.name, inline: true },
          { name: "📊 العدد", value: messages.size + " رسالة", inline: true }
        ],
        footer: "معرف القناة: " + channel.id
      })
    } catch (err) {
      logger.error("LOG_MESSAGE_DELETE_BULK_FAILED", { error: err.message })
    }
  }
}