const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "emojiDelete",
  async execute(emoji, client) {
    try {
      if (!emoji.guild) return
      await sendLog(client, emoji.guild.id, "emoji_delete", {
        title: "🗑️ إيموجي محذوف",
        color: LOG_COLORS.delete,
        fields: [
          { name: "😀 الإيموجي", value: emoji.name, inline: true },
          { name: "🆔 المعرف", value: emoji.id, inline: true }
        ],
        footer: "معرف الإيموجي: " + emoji.id
      })
    } catch (err) {
      logger.error("LOG_EMOJI_DELETE_FAILED", { error: err.message })
    }
  }
}