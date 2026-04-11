const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "messageDeleteBulk",

  async execute(messages, channel, client) {
    try {
      if (!channel.guild) return

      const count = messages.size
      const authors = new Map()

      messages.forEach(msg => {
        if (msg.author && !msg.author.bot) {
          const key = msg.author.id
          authors.set(key, (authors.get(key) || 0) + 1)
        }
      })

      const topAuthors = [...authors.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, c]) => `<@${id}> — ${c} رسالة`)
        .join("\n") || "غير معروف"

      await sendLog(client, channel.guild.id, "message_delete_bulk", {
        title: "🗑️ حذف رسائل جماعي",
        color: LOG_COLORS.delete,
        fields: [
          { name: "📌 القناة", value: `${channel}`, inline: true },
          { name: "🔢 العدد", value: `${count} رسالة`, inline: true },
          { name: "👥 أكثر الأعضاء", value: topAuthors, inline: false },
        ],
        footer: `معرف القناة: ${channel.id}`
      })

    } catch (err) {
      logger.error("LOG_MESSAGE_DELETE_BULK_FAILED", { error: err.message })
    }
  }
}