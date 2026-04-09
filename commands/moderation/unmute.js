const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فك_الكتم")
    .setDescription("فك كتم عضو مكتوم (إزالة الـ Timeout)")
    .setNameLocalizations({ "en-US": "unmute", "en-GB": "unmute" })
    .setDescriptionLocalizations({
      "en-US": "Remove timeout from a muted member",
      "en-GB": "Remove timeout from a muted member"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد فك كتمه")
        .setNameLocalizations({ "en-US": "member", "en-GB": "member" })
        .setDescriptionLocalizations({ "en-US": "The member to unmute", "en-GB": "The member to unmute" })
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب فك الكتم (اختياري)")
        .setNameLocalizations({ "en-US": "reason", "en-GB": "reason" })
        .setDescriptionLocalizations({ "en-US": "Reason for unmute (optional)", "en-GB": "Reason for unmute (optional)" })
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ تحقق: داخل سيرفر فقط
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ جلب العضو
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      // ✅ تحقق: البوت يقدر يعدل عليه
      if (!member.moderatable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يعدل على هذا العضو. تأكد إن رتبة البوت أعلى.", ephemeral: true })
      }

      // ✅ تحقق: العضو مكتوم فعلاً
      if (!member.isCommunicationDisabled()) {
        return interaction.reply({ content: "⚠️ هذا العضو مو مكتوم أصلاً.", ephemeral: true })
      }

      // ✅ حفظ معلومات الكتم القديم قبل الإزالة
      const oldTimeout = member.communicationDisabledUntil
      const oldTimestamp = Math.floor(oldTimeout.getTime() / 1000)

      // ✅ تنفيذ فك الكتم (timeout = null)
      await member.timeout(null, `${reason} | بواسطة: ${interaction.user.username}`)

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🔊 تم فك كتم العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "📝 السبب", value: reason, inline: true },
          { name: "⏰ كان مكتوم حتى", value: `<t:${oldTimestamp}:F> (<t:${oldTimestamp}:R>)`, inline: false },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
        )
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // ✅ محاولة إرسال رسالة خاصة للعضو
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("🔊 تم فك كتمك")
          .setDescription(`تم فك كتمك في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 السبب", value: reason, inline: true }
          )
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
      } catch {
        // العضو مقفل الخاص — نتجاهل
      }

    } catch (err) {
      console.error("[UNMUTE ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء فك كتم العضو.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء فك كتم العضو.", ephemeral: true })
    }
  },
}