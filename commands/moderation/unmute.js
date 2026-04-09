const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فك_الكتم")
    .setDescription("فك كتم عضو مكتوم (إزالة الـ Timeout)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد فك كتمه")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب فك الكتم (اختياري)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ Check: inside a guild only
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ Fetch member
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت أجد هذا العضو.", ephemeral: true })
      }

      // ✅ Check: bot can moderate this member
      if (!member.moderatable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يعدل على هذا العضو. تأكد إن رتبة البوت أعلى منه.", ephemeral: true })
      }

      // ✅ Check: member is actually muted
      if (!member.isCommunicationDisabled()) {
        return interaction.reply({ content: "⚠️ هذا العضو غير مكتوم أصلاً.", ephemeral: true })
      }

      // ✅ Save old timeout info before removing
      const oldTimeout   = member.communicationDisabledUntil
      const oldTimestamp = Math.floor(oldTimeout.getTime() / 1000)

      // ✅ Execute unmute (timeout = null)
      await member.timeout(null, `${reason} | بواسطة: ${interaction.user.username}`)

      // ✅ Success embed
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🔊 تم فك كتم العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو",          value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
          { name: "📝 السبب",          value: reason,                                                   inline: true  },
          { name: "⏰ كان مكتوم حتى", value: `<t:${oldTimestamp}:F> (<t:${oldTimestamp}:R>)`,          inline: false },
          { name: "👮 بواسطة",         value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  }
        )
        .setFooter({ text: `الآيدي: ${targetUser.id}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // ✅ Try to DM the member
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
        // DMs are closed — ignore
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