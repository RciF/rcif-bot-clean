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
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const isAdmin = await commandGuardSystem.requireAdmin(interaction)

      if (!isAdmin) {
        return interaction.reply({
          content: "❌ هذا الأمر للإدارة فقط",
          ephemeral: true
        })
      }

      const system = interaction.options.getString("system")
      const state = interaction.options.getString("state")

      const enabled = state === "on"

      await configSystem.updateSystem?.(interaction.guild.id, system, enabled)

      await interaction.reply(`✅ تم تحديث إعداد **${system}** إلى **${state}**`)

    } catch (error) {
      await interaction.reply({
        content: "❌ حصل خطأ في الإعدادات",
        ephemeral: true
      })
    }
  },
}