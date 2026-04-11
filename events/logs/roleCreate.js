const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "roleCreate",

  async execute(role, client) {
    try {
      if (!role.guild) return
      if (role.managed) return

      await sendLog(client, role.guild.id, "role_create", {
        title: "🏷️ دور جديد",
        color: role.color || LOG_COLORS.create,
        fields: [
          { name: "🏷️ الدور", value: `${role} (${role.name})`, inline: true },
          { name: "🎨 اللون", value: role.hexColor || "بدون لون", inline: true },
          { name: "📊 الموقع", value: `${role.position}`, inline: true }
        ],
        footer: `معرف الدور: ${role.id}`
      })
    } catch (err) {
      logger.error("LOG_ROLE_CREATE_FAILED", { error: err.message })
    }
  }
}