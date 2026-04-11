const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "emojiCreate",

  async execute(emoji, client) {
    try {
      if (!emoji.guild) return

      await sendLog(client, emoji.guild.id, "emoji_create", {
        title: "😀 إيموجي جديد",
        color: LOG_COLORS.create,
        fields: [
          { name: "😀 الإيموجي", value: `${emoji} \`${emoji.name}\``, inline: true },
          { name: "🎭 نوع", value: emoji.animated ? "متحرك" : "ثابت", inline: true },
        ],
        thumbnail: emoji.imageURL({ size: 128 }),
        footer: `معرف الإيموجي: ${emoji.id}`
      })

    } catch (err) {
      logger.error("LOG_EMOJI_CREATE_FAILED", { error: err.message })
    }
  }
}