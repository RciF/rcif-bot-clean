const { SlashCommandBuilder } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const configSystem = require("../../systems/configSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("إعدادات السيرفر")
    .addStringOption(option =>
      option
        .setName("system")
        .setDescription("النظام")
        .setRequired(true)
        .addChoices(
          { name: "AI", value: "ai" },
          { name: "XP", value: "xp" },
          { name: "Economy", value: "economy" }
        )
    )
    .addStringOption(option =>
      option
        .setName("state")
        .setDescription("تشغيل أو إيقاف")
        .setRequired(true)
        .addChoices(
          { name: "تشغيل", value: "on" },
          { name: "إيقاف", value: "off" }
        )
    ),

  async execute(interaction) {

    if (!commandGuardSystem.requireAdmin(interaction)) return

    const system = interaction.options.getString("system")
    const state = interaction.options.getString("state")

    const enabled = state === "on"

    configSystem.updateSystem(interaction.guild.id, system, enabled)

    await interaction.reply(`✅ تم تحديث إعداد **${system}** إلى **${state}**`)

  }
}