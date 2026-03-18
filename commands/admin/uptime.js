const { SlashCommandBuilder } = require("discord.js")
const uptimeSystem = require("../../systems/uptimeSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription("عرض وقت تشغيل البوت"),

  async execute(interaction) {

    const uptime = uptimeSystem.getUptime()

    await interaction.reply(`⏱ Uptime: ${uptime} seconds`)

  },
}