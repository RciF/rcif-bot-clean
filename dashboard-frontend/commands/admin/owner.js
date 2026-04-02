const { SlashCommandBuilder } = require("discord.js")
const { requireOwner } = require("../../systems/commandGuardSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("owner")
    .setDescription("اختبار صلاحية مالك البوت"),

  async execute(interaction) {
    try {
      const isOwner = await requireOwner(interaction)

      if (!isOwner) {
        return interaction.reply({
          content: "❌ هذا الأمر مخصص لمالك البوت فقط",
          ephemeral: true,
        })
      }

      await interaction.reply("✅ تم التحقق من صلاحية مالك البوت")
    } catch (error) {
      await interaction.reply("❌ حصل خطأ في التحقق من الصلاحيات")
    }
  },
}