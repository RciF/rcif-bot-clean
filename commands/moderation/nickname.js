const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لقب")
    .setDescription("تغيير أو إزالة لقب عضو في السيرفر")
    .setNameLocalizations({ "en-US": "nickname", "en-GB": "nickname" })
    .setDescriptionLocalizations({
      "en-US": "Change or remove a member's nickname",
      "en-GB": "Change or remove a member's nickname"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد تغيير لقبه")
        .setNameLocalizations({ "en-US": "member", "en-GB": "member" })
        .setDescriptionLocalizations({ "en-US": "The member to change nickname for", "en-GB": "The member to change nickname for" })
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("اللقب")
        .setDescription("اللقب الجديد (اتركه فاضي لإزالة اللقب)")
        .setNameLocalizations({ "en-US": "name", "en-GB": "name" })
        .setDescriptionLocalizations({ "en-US": "New nickname (leave empty to remove)", "en-GB": "New nickname (leave empty to remove)" })
        .setRequired(false)
        .setMaxLength(32)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب تغيير اللقب (اختياري)")
        .setNameLocalizations({ "en-US": "reason", "en-GB": "reason" })
        .setDescriptionLocalizations({ "en-US": "Reason for nickname change (optional)", "en-GB": "Reason for nickname change (optional)" })
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ تحقق: داخل سيرفر فقط
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const newNickname = interaction.options.getString("اللقب") || null
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ جلب العضو
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      // ✅ تحقق: لا تغير لقب مالك السيرفر (إلا لو أنت المالك)
      if (member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تغير لقب مالك السيرفر.", ephemeral: true })
      }

      // ✅ تحقق: رتبة المنفذ أعلى من الهدف (إلا لو يغير لقب نفسه)
      if (targetUser.id !== interaction.user.id) {
        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
          return interaction.reply({ content: "❌ لا تقدر تغير لقب عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
        }
      }

      // ✅ تحقق: البوت يقدر يغير لقبه
      if (!member.manageable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يغير لقب هذا العضو. تأكد إن رتبة البوت أعلى.", ephemeral: true })
      }

      // ✅ حفظ اللقب القديم
      const oldNickname = member.nickname || member.user.username
      const isRemoving = newNickname === null

      // ✅ تحقق: اللقب الجديد نفس القديم
      if (!isRemoving && newNickname === member.nickname) {
        return interaction.reply({ content: "⚠️ هذا اللقب نفسه الحالي!", ephemeral: true })
      }

      // ✅ تنفيذ تغيير اللقب
      await member.setNickname(newNickname, `${reason} | بواسطة: ${interaction.user.username}`)

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

      if (isRemoving) {
        embed.setColor(0xf59e0b)
        embed.setTitle("📝 تم إزالة لقب العضو")
        embed.addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "🏷️ اللقب القديم", value: `\`${oldNickname}\``, inline: true },
          { name: "🔄 الحالي", value: `\`${targetUser.username}\` (الاسم الأصلي)`, inline: false },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
        )
      } else {
        embed.setColor(0x3b82f6)
        embed.setTitle("📝 تم تغيير لقب العضو")
        embed.addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "🏷️ اللقب القديم", value: `\`${oldNickname}\``, inline: true },
          { name: "🆕 اللقب الجديد", value: `\`${newNickname}\``, inline: true },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
        )
      }

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[NICKNAME ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تغيير اللقب.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تغيير اللقب.", ephemeral: true })
    }
  },
}