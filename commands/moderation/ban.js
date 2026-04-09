const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("حظر")
    .setDescription("حظر عضو من السيرفر نهائياً")
    .setNameLocalizations({ "en-US": "ban", "en-GB": "ban" })
    .setDescriptionLocalizations({
      "en-US": "Ban a member from the server permanently",
      "en-GB": "Ban a member from the server permanently"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد حظره")
        .setNameLocalizations({ "en-US": "member", "en-GB": "member" })
        .setDescriptionLocalizations({ "en-US": "The member to ban", "en-GB": "The member to ban" })
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب الحظر")
        .setNameLocalizations({ "en-US": "reason", "en-GB": "reason" })
        .setDescriptionLocalizations({ "en-US": "Reason for ban", "en-GB": "Reason for ban" })
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("حذف_الرسائل")
        .setDescription("حذف رسائل العضو السابقة")
        .setNameLocalizations({ "en-US": "delete_messages", "en-GB": "delete_messages" })
        .setDescriptionLocalizations({ "en-US": "Delete member's previous messages", "en-GB": "Delete member's previous messages" })
        .setRequired(false)
        .addChoices(
          { name: "❌ لا تحذف شيء", value: "0" },
          { name: "🕐 آخر ساعة", value: "3600" },
          { name: "📅 آخر يوم", value: "86400" },
          { name: "📅 آخر 3 أيام", value: "259200" },
          { name: "📅 آخر أسبوع (الحد الأقصى)", value: "604800" }
        )
    ),

  async execute(interaction) {
    try {
      // ✅ تحقق: داخل سيرفر فقط
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"
      const deleteSeconds = parseInt(interaction.options.getString("حذف_الرسائل") || "0")

      // ✅ تحقق: لا تحظر نفسك
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحظر نفسك!", ephemeral: true })
      }

      // ✅ تحقق: لا تحظر البوت
      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحظر البوت.", ephemeral: true })
      }

      // ✅ جلب العضو (ممكن يكون مو في السيرفر)
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      // ✅ لو العضو موجود في السيرفر — تحقق من الصلاحيات
      if (member) {
        // لا تحظر مالك السيرفر
        if (member.id === interaction.guild.ownerId) {
          return interaction.reply({ content: "❌ لا تقدر تحظر مالك السيرفر.", ephemeral: true })
        }

        // رتبة المنفذ لازم تكون أعلى
        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
          return interaction.reply({ content: "❌ لا تقدر تحظر عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
        }

        // البوت يقدر يحظره
        if (!member.bannable) {
          return interaction.reply({ content: "❌ البوت ما يقدر يحظر هذا العضو. تأكد إن رتبة البوت أعلى.", ephemeral: true })
        }
      }

      // ✅ تحقق: العضو محظور بالفعل
      const existingBan = await interaction.guild.bans.fetch(targetUser.id).catch(() => null)
      if (existingBan) {
        return interaction.reply({ content: "⚠️ هذا العضو محظور بالفعل.", ephemeral: true })
      }

      // ✅ محاولة إرسال رسالة خاصة قبل الحظر
      let dmSent = false
      if (member) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🚫 تم حظرك")
            .setDescription(`تم حظرك من سيرفر **${interaction.guild.name}**`)
            .addFields(
              { name: "📝 السبب", value: reason, inline: true }
            )
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTimestamp()

          await targetUser.send({ embeds: [dmEmbed] })
          dmSent = true
        } catch {
          // العضو مقفل الخاص
        }
      }

      // ✅ تنفيذ الحظر
      await interaction.guild.members.ban(targetUser, {
        deleteMessageSeconds: deleteSeconds,
        reason: `${reason} | بواسطة: ${interaction.user.username}`
      })

      // ✅ وصف حذف الرسائل
      const deleteLabels = {
        "0": "ما تم حذف شيء",
        "3600": "آخر ساعة",
        "86400": "آخر يوم",
        "259200": "آخر 3 أيام",
        "604800": "آخر أسبوع"
      }

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("🚫 تم حظر العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "🆔 ID", value: `\`${targetUser.id}\``, inline: true },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "🗑️ حذف الرسائل", value: deleteLabels[String(deleteSeconds)] || "لا", inline: true },
          { name: "📩 إشعار خاص", value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال", inline: true },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false }
        )
        .setFooter({ text: `استخدم /فك_الحظر لإلغاء الحظر لاحقاً` })
        .setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[BAN ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء حظر العضو.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء حظر العضو.", ephemeral: true })
    }
  },
}