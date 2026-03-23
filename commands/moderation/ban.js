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

      if (!member.bannable) {
        return interaction.reply({ content: "❌ لا يمكن حظر هذا العضو", ephemeral: true })
      }

      await member.ban({ reason })

      await interaction.reply(`🚫 تم حظر ${user.username}\nالسبب: ${reason}`)

    } catch (error) {
      await interaction.reply({
        content: "❌ حصل خطأ في الحظر",
        ephemeral: true
      })
    }
  },
}