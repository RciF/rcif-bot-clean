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
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const user = interaction.options.getUser("العضو")
      const reason = interaction.options.getString("السبب") || "بدون سبب"

      const member = await interaction.guild.members.fetch(user.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ لم يتم العثور على العضو", ephemeral: true })
      }

      if (!member.kickable) {
        return interaction.reply({ content: "❌ لا يمكن طرد هذا العضو", ephemeral: true })
      }

      await member.kick(reason)

      await interaction.reply(`👢 تم طرد ${user.username}\nالسبب: ${reason}`)

    } catch (error) {
      await interaction.reply({
        content: "❌ حصل خطأ في الطرد",
        ephemeral: true
      })
    }
  },
}