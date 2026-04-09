const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("التحذيرات")
    .setDescription("عرض تحذيرات عضو بالتفصيل")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد عرض تحذيراته")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")

      // ✅ جلب التحذيرات
      const warnings = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)

      if (!warnings || warnings.length === 0) {
        const cleanEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ سجل نظيف")
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .setDescription(`${targetUser} ما عنده أي تحذيرات.`)
          .setFooter({ text: `ID: ${targetUser.id}` })
          .setTimestamp()

        return interaction.reply({ embeds: [cleanEmbed] })
      }

      // ✅ تحديد لون حسب العدد
      let color
      if (warnings.length >= 5) {
        color = 0xef4444
      } else if (warnings.length >= 3) {
        color = 0xf59e0b
      } else {
        color = 0x3b82f6
      }

      // ✅ بناء قائمة التحذيرات
      let warningList = ""
      for (let i = 0; i < warnings.length; i++) {
        const w = warnings[i]
        const date = w.created_at
          ? new Date(w.created_at).toLocaleDateString("ar-SA", {
              year: "numeric",
              month: "short",
              day: "numeric"
            })
          : "غير معروف"

        const moderator = w.moderator_id
          ? `<@${w.moderator_id}>`
          : "غير معروف"

        warningList += `**${i + 1}.** ${w.reason || "بدون سبب"}\n`
        warningList += `   📅 ${date} — 👮 ${moderator}\n\n`
      }

      // ✅ تقسيم لو طويلة (حد Discord 1024 حرف للفيلد)
      if (warningList.length > 1024) {
        warningList = warningList.slice(0, 1000) + "\n... وغيرها"
      }

      // ✅ مستوى الخطورة
      let severity
      if (warnings.length >= 5) {
        severity = "🔴 خطير — يُنصح باتخاذ إجراء فوري"
      } else if (warnings.length >= 3) {
        severity = "🟡 متوسط — العضو قارب الحد"
      } else {
        severity = "🟢 عادي"
      }

      // ✅ Embed
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`⚠️ تحذيرات ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "📊 المجموع", value: `**${warnings.length}** تحذير`, inline: true },
          { name: "⚡ مستوى الخطورة", value: severity, inline: true },
          { name: "📋 السجل", value: warningList, inline: false }
        )
        .setFooter({ text: `ID: ${targetUser.id} | استخدم /مسح_التحذيرات لمسح الكل` })
        .setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[WARNINGS ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء عرض التحذيرات.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء عرض التحذيرات.", ephemeral: true })
    }
  },
}