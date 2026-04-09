const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("مسح_التحذيرات")
    .setDescription("مسح جميع تحذيرات عضو")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد مسح تحذيراته")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب مسح التحذيرات (اختياري)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ جلب التحذيرات قبل المسح
      const warnings = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)
      const count = warnings?.length || 0

      if (count === 0) {
        const cleanEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ سجل نظيف")
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .setDescription(`${targetUser} ما عنده أي تحذيرات أصلاً.`)
          .setFooter({ text: `ID: ${targetUser.id}` })
          .setTimestamp()

        return interaction.reply({ embeds: [cleanEmbed], ephemeral: true })
      }

      // ✅ تنفيذ المسح
      await warningSystem.clearWarnings(interaction.guild.id, targetUser.id)

      // ✅ محاولة إرسال رسالة خاصة
      let dmSent = false
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("🧹 تم مسح تحذيراتك")
          .setDescription(`تم مسح جميع تحذيراتك في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "📊 عدد التحذيرات المحذوفة", value: `**${count}** تحذير`, inline: true },
            { name: "📝 السبب", value: reason, inline: true }
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
        .setColor(0x22c55e)
        .setTitle("🧹 تم مسح التحذيرات")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "🆔 ID", value: `\`${targetUser.id}\``, inline: true },
          { name: "📊 عدد التحذيرات المحذوفة", value: `**${count}** تحذير`, inline: true },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "📩 إشعار خاص", value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال", inline: true },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
        )
        .setFooter({ text: `سجل العضو الآن نظيف` })
        .setTimestamp()

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[CLEARWARNS ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء مسح التحذيرات.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء مسح التحذيرات.", ephemeral: true })
    }
  },
}