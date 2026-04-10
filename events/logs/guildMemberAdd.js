const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildMemberAdd",

  async execute(member, client) {
    try {
      if (!member.guild) return

      const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))
      const isNew = accountAge < 7

      const fields = [
        { name: "👤 العضو", value: `${member} (${member.user.tag})`, inline: true },
        { name: "🔢 عدد الأعضاء", value: `${member.guild.memberCount}`, inline: true },
        { name: "📅 تاريخ إنشاء الحساب", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
      ]

      if (isNew) {
        fields.push({ name: "⚠️ تنبيه", value: `حساب جديد (${accountAge} يوم)` })
      }

      await sendLog(client, member.guild.id, "member_join", {
        title: "📥 عضو جديد",
        color: LOG_COLORS.join,
        fields,
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
        footer: `معرف العضو: ${member.id}`
      })
    } catch (err) {
      logger.error("LOG_MEMBER_ADD_FAILED", { error: err.message })
    }
  }
}