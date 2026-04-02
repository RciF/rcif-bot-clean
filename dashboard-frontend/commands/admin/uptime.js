const { SlashCommandBuilder } = require("discord.js")
const uptimeSystem = require("../../systems/uptimeSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("عرض وقت تشغيل البوت"),

  async execute(interaction, client) {
    try {

      if (!uptimeSystem || typeof uptimeSystem.getUptime !== "function") {
        return interaction.reply("❌ نظام uptime غير متوفر")
      }

      const uptime = uptimeSystem.getUptime()

      await interaction.reply(`⏱ Uptime: ${uptime} seconds`)

    } catch (error) {
      console.error("UPTIME_COMMAND_ERROR", error)
      await interaction.reply("❌ حصل خطأ في حساب وقت التشغيل")
    }
  },
}