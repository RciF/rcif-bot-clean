const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildUpdate",

  async execute(oldGuild, newGuild, client) {
    try {
      const changes = []

      if (oldGuild.name !== newGuild.name) {
        changes.push({ name: "📝 الاسم", value: `\`${oldGuild.name}\` ← \`${newGuild.name}\``, inline: false })
      }

      if (oldGuild.icon !== newGuild.icon) {
        changes.push({ name: "🖼️ الأيقونة", value: "تم تغيير أيقونة السيرفر", inline: false })
      }

      if (oldGuild.banner !== newGuild.banner) {
        changes.push({ name: "🎨 البانر", value: "تم تغيير بانر السيرفر", inline: false })
      }

      if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        changes.push({
          name: "🔒 مستوى التحقق",
          value: `${oldGuild.verificationLevel} ← ${newGuild.verificationLevel}`,
          inline: true
        })
      }

      if (changes.length === 0) return

      await sendLog(client, newGuild.id, "guild_update", {
        title: "⚙️ تعديل السيرفر",
        color: LOG_COLORS.update,
        fields: changes,
        thumbnail: newGuild.iconURL({ dynamic: true, size: 256 }),
        footer: `معرف السيرفر: ${newGuild.id}`
      })

    } catch (err) {
      logger.error("LOG_GUILD_UPDATE_FAILED", { error: err.message })
    }
  }
}