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

    const question = interaction.options.getString("سؤال")

    await interaction.deferReply()

    const answer = await aiHandler.askAI(interaction.user.id, question)

    await interaction.editReply(`🤖 ${answer}`)

  },
}