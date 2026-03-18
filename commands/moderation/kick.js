const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("طرد")
    .setDescription("طرد عضو من السيرفر")
    .addUserOption(option =>
      option.setName("العضو")
        .setDescription("العضو المراد طرده")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("السبب")
        .setDescription("سبب الطرد")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {

    const member = interaction.options.getUser("العضو")
    const reason = interaction.options.getString("السبب") || "بدون سبب"

    const target = await interaction.guild.members.fetch(member.id)

    await target.kick(reason)

    await interaction.reply(`👢 تم طرد ${member.username}\nالسبب: ${reason}`)

  },
}