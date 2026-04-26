const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("مسح_التحذيرات")
    .setDescription("مسح تحذير محدد أو جميع تحذيرات عضو")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد مسح تحذيراته")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("رقم_التحذير")
        .setDescription("رقم التحذير المراد مسحه (اتركه فاضي لمسح الكل)")
        .setRequired(false)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب مسح التحذيرات (اختياري)")
        .setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["clearwarns", "delwarn", "مسح_التحذيرات"],
    description: "مسح تحذير محدد بالرقم أو جميع تحذيرات عضو",
    options: [
      { name: "العضو", description: "العضو المراد مسح تحذيراته", required: true },
      { name: "رقم_التحذير", description: "رقم التحذير المراد مسحه (اتركه فاضي لمسح الكل)", required: false },
      { name: "السبب", description: "سبب مسح التحذيرات", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: ["ModerateMembers"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["تحذير", "التحذيرات"],
    examples: [
      "/مسح_التحذيرات العضو:@أحمد رقم_التحذير:2",
      "/مسح_التحذيرات العضو:@أحمد (يمسح الكل)"
    ],
    notes: [
      "للحصول على رقم التحذير، استخدم /التحذيرات أولاً",
      "العضو يستلم إشعار بمسح تحذيراته",
      "العملية لا تُلغى — لا يوجد استرداد"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const warningNumber = interaction.options.getInteger("رقم_التحذير")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ جلب التحذيرات الحالية
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

      // ✅ مسح تحذير واحد بالرقم
      if (warningNumber !== null) {
        if (warningNumber > count) {
          return interaction.reply({
            content: `❌ رقم التحذير غير صحيح. ${targetUser.username} عنده **${count}** تحذير فقط.`,
            ephemeral: true
          })
        }

        // التحذير المراد حذفه (الأحدث أولاً — index 0)
        const warningToDelete = warnings[warningNumber - 1]

        if (!warningToDelete?.id) {
          return interaction.reply({
            content: "❌ ما قدرت أحدد التحذير. حاول مرة ثانية.",
            ephemeral: true
          })
        }

        // ✅ حذف تحذير واحد من قاعدة البيانات
        await warningSystem.deleteWarning(warningToDelete.id)

        const date = warningToDelete.created_at
          ? new Date(warningToDelete.created_at).toLocaleDateString("ar-SA")
          : "غير معروف"

        const embed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle("🗑️ تم مسح التحذير")
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
            { name: "🔢 رقم التحذير", value: `#${warningNumber} من ${count}`, inline: true },
            { name: "📝 محتوى التحذير", value: warningToDelete.reason || "بدون سبب", inline: false },
            { name: "📅 تاريخ التحذير", value: date, inline: true },
            { name: "📊 التحذيرات المتبقية", value: `**${count - 1}** تحذير`, inline: true },
            { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false }
          )
          .setFooter({ text: `استخدم /مسح_التحذيرات بدون رقم لمسح الكل` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

      // ✅ مسح جميع التحذيرات (السلوك القديم)
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

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🧹 تم مسح جميع التحذيرات")
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