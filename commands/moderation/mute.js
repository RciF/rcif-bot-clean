const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("كتم")
    .setDescription("كتم عضو مؤقتاً باستخدام Timeout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((opt) =>
      opt.setName("member").setDescription("العضو المراد كتمه").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("duration")
        .setDescription("مدة الكتم بالدقائق (1 - 40320)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("سبب الكتم").setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("member")
      const duration = interaction.options.getInteger("duration")
      const reason = interaction.options.getString("reason") || "لم يتم تحديد سبب"

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تكتم نفسك!", ephemeral: true })
      }

      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تكتم البوت.", ephemeral: true })
      }

      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تكتم مالك السيرفر.", ephemeral: true })
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: "❌ لا تقدر تكتم عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
      }

      if (!member.moderatable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يكتم هذا العضو. تأكد إن رتبة البوت أعلى.", ephemeral: true })
      }

      if (member.isCommunicationDisabled()) {
        return interaction.reply({ content: "⚠️ هذا العضو مكتوم بالفعل.", ephemeral: true })
      }

      const durationMs = duration * 60 * 1000

      // محاولة إرسال رسالة خاصة قبل الكتم
      await member
        .send(`🔇 تم كتمك في سيرفر **${interaction.guild.name}** لمدة **${duration} دقيقة**.\n📝 السبب: ${reason}`)
        .catch(() => null)

      await member.timeout(durationMs, `${reason} | By: ${interaction.user.tag}`)

      const embed = new EmbedBuilder()
        .setTitle("🔇 تم كتم العضو")
        .setColor(0xff9900)
        .addFields(
          { name: "👤 العضو", value: `${targetUser} (${targetUser.tag})`, inline: true },
          { name: "⏱️ المدة", value: `${duration} دقيقة`, inline: true },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "🛡️ المشرف", value: `${interaction.user} (${interaction.user.tag})`, inline: false }
        )
        .setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[MUTE ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء محاولة كتم العضو.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء محاولة كتم العضو.", ephemeral: true })
    }
  },
}
