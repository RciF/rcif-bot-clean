const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("حظر")
    .setDescription("حظر عضو من السيرفر")
    .addUserOption(option =>
      option.setName("العضو")
        .setDescription("العضو المراد حظره")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("السبب")
        .setDescription("سبب الحظر")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {

    const member = interaction.options.getUser("العضو")
    const reason = interaction.options.getString("السبب") || "بدون سبب"

    const target = await interaction.guild.members.fetch(member.id)

    await target.ban({ reason })

    await interaction.reply(`🚫 تم حظر ${member.username}\nالسبب: ${reason}`)

  },
}