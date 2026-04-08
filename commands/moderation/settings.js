const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const settingsSystem = require("../../systems/settingsSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("عرض إعدادات السيرفر"),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const settings = await settingsSystem.getSettings(interaction.guild.id)

      const embed = new EmbedBuilder()
        .setTitle("⚙️ إعدادات السيرفر")
        .setColor(0x3498db)
        .addFields(
          { name: "AI", value: settings.ai ? "🟢 مفعّل" : "🔴 معطّل", inline: true },
          { name: "XP", value: settings.xp ? "🟢 مفعّل" : "🔴 معطّل", inline: true },
          { name: "Economy", value: settings.economy ? "🟢 مفعّل" : "🔴 معطّل", inline: true }
        )

      await interaction.reply({ embeds: [embed] })

    } catch (error) {
      console.error("[SETTINGS ERROR]", error)
      await interaction.reply({
        content: "❌ حصل خطأ في الإعدادات",
        ephemeral: true
      })
    }
  },
}