const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "channelUpdate",

  async execute(oldChannel, newChannel, client) {
    try {
      if (!newChannel.guild) return

      const changes = []

      if (oldChannel.name !== newChannel.name) {
        changes.push({ name: "📝 الاسم", value: `\`${oldChannel.name}\` ← \`${newChannel.name}\``, inline: false })
      }

      if (oldChannel.topic !== newChannel.topic) {
        const oldTopic = oldChannel.topic || "بدون وصف"
        const newTopic = newChannel.topic || "بدون وصف"
        changes.push({ name: "📋 الوصف", value: `**قبل:** ${oldTopic}\n**بعد:** ${newTopic}`, inline: false })
      }

      if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push({ name: "🔞 NSFW", value: newChannel.nsfw ? "✅ مفعّل" : "❌ معطّل", inline: true })
      }

      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push({
          name: "🐌 السلو مود",
          value: `${oldChannel.rateLimitPerUser}s ← ${newChannel.rateLimitPerUser}s`,
          inline: true
        })
      }

      if (changes.length === 0) return

      await sendLog(client, newChannel.guild.id, "channel_update", {
        title: "✏️ تعديل قناة",
        color: LOG_COLORS.update,
        fields: [
          { name: "📌 القناة", value: `${newChannel}`, inline: true },
          ...changes
        ],
        footer: `معرف القناة: ${newChannel.id}`
      })

    } catch (err) {
      logger.error("LOG_CHANNEL_UPDATE_FAILED", { error: err.message })
    }
  }
}