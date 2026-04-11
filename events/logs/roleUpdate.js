const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "roleUpdate",

  async execute(oldRole, newRole, client) {
    try {
      if (!newRole.guild) return
      if (newRole.managed) return

      const changes = []

      if (oldRole.name !== newRole.name) {
        changes.push({ name: "📝 الاسم", value: `\`${oldRole.name}\` ← \`${newRole.name}\``, inline: false })
      }

      if (oldRole.color !== newRole.color) {
        changes.push({
          name: "🎨 اللون",
          value: `\`${oldRole.hexColor}\` ← \`${newRole.hexColor}\``,
          inline: true
        })
      }

      if (oldRole.hoist !== newRole.hoist) {
        changes.push({ name: "📌 إظهار منفصل", value: newRole.hoist ? "✅ نعم" : "❌ لا", inline: true })
      }

      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push({ name: "🔔 قابل للمنشن", value: newRole.mentionable ? "✅ نعم" : "❌ لا", inline: true })
      }

      if (changes.length === 0) return

      await sendLog(client, newRole.guild.id, "role_update", {
        title: "✏️ تعديل رتبة",
        color: LOG_COLORS.role,
        fields: [
          { name: "🏷️ الرتبة", value: `${newRole}`, inline: true },
          ...changes
        ],
        footer: `معرف الرتبة: ${newRole.id}`
      })

    } catch (err) {
      logger.error("LOG_ROLE_UPDATE_FAILED", { error: err.message })
    }
  }
}