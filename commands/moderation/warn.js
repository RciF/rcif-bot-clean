const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تحذير")
    .setDescription("إعطاء تحذير لعضو")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد تحذيره")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب التحذير")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ لا تحذر نفسك
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحذر نفسك!", ephemeral: true })
      }

      // ✅ لا تحذر البوت
      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحذر البوت.", ephemeral: true })
      }

      // ✅ جلب العضو
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      // ✅ لا تحذر مالك السيرفر
      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تحذر مالك السيرفر.", ephemeral: true })
      }

      // ✅ رتبة المنفذ أعلى
      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: "❌ لا تقدر تحذر عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
      }

      // ✅ تسجيل التحذير
      await warningSystem.addWarning(
        interaction.guild.id,
        targetUser.id,
        interaction.user.id,
        reason
      )

      // ✅ جلب عدد التحذيرات بعد الإضافة
      const warnings = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)
      const totalWarnings = warnings?.length || 1

      // ✅ تحديد لون ومستوى الخطورة
      let color, severity
      if (totalWarnings >= 5) {
        color = 0xef4444
        severity = "🔴 خطير — يُنصح باتخاذ إجراء"
      } else if (totalWarnings >= 3) {
        color = 0xf59e0b
        severity = "🟡 متوسط — العضو قارب الحد"
      } else {
        color = 0x3b82f6
        severity = "🟢 عادي"
      }

      // ✅ محاولة إرسال رسالة خاصة
      let dmSent = false
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(color)
          .setTitle("⚠️ تم تحذيرك")
          .setDescription(`تم تحذيرك في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 السبب", value: reason, inline: true },
            { name: "📊 مجموع تحذيراتك", value: `**${totalWarnings}** تحذير`, inline: true }
          )
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
        dmSent = true
      } catch {
        // العضو مقفل الخاص
      }

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle("⚠️ تم تحذير العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "🆔 ID", value: `\`${targetUser.id}\``, inline: true },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "📊 مجموع التحذيرات", value: `**${totalWarnings}** تحذير`, inline: true },
          { name: "⚡ مستوى الخطورة", value: severity, inline: true },
          { name: "📩 إشعار خاص", value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال", inline: true },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false }
        )
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[WARN ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تحذير العضو.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تحذير العضو.", ephemeral: true })
    }
  },
}