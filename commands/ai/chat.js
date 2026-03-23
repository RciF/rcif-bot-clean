const { SlashCommandBuilder } = require("discord.js")
const aiHandler = require("../../systems/aiHandler")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ذكاء")
    .setDescription("اسأل الذكاء الاصطناعي")
    .addStringOption(option =>
      option.setName("سؤال")
        .setDescription("اكتب سؤالك")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const question = interaction.options.getString("سؤال")

      await interaction.deferReply()

      const answer = await aiHandler.askAI?.(interaction.user.id, question)

      if (!answer) {
        return interaction.editReply("❌ ماقدرت أجيب رد حالياً")
      }

      await interaction.editReply(`🤖 ${answer}`)
    } catch (error) {
      try {
        await interaction.editReply("❌ حصل خطأ في الذكاء الاصطناعي")
      } catch {
        await interaction.reply("❌ حصل خطأ في الذكاء الاصطناعي")
      }
    }
  },
}