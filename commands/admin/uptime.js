const { SlashCommandBuilder } = require("discord.js")
const uptimeSystem = require("../../systems/uptimeSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("عرض وقت تشغيل البوت"),

  async execute(interaction) {
    try {
      const uptime = uptimeSystem.getUptime?.() || 0

      await interaction.reply(`⏱ Uptime: ${uptime} seconds`)
    } catch (error) {
      await interaction.reply("❌ حصل خطأ في حساب وقت التشغيل")
    }
  },
}