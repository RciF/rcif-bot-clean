const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const settingsSystem = require("../../systems/settingsSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("عرض إعدادات السيرفر"),

  async execute(interaction) {

    const settings = settingsSystem.getSettings(interaction.guild.id)

    const embed = new EmbedBuilder()
      .setTitle("⚙️ إعدادات السيرفر")
      .setColor(0x3498db)
      .addFields(
        { name: "AI", value: settings.ai ? "🟢 Enabled" : "🔴 Disabled", inline: true },
        { name: "XP", value: settings.xp ? "🟢 Enabled" : "🔴 Disabled", inline: true },
        { name: "Economy", value: settings.economy ? "🟢 Enabled" : "🔴 Disabled", inline: true }
      )

    await interaction.reply({ embeds: [embed] })

  }
}