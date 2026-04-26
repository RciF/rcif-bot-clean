const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فك_الحظر")
    .setDescription("فك حظر عضو من السيرفر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName("الآيدي")
        .setDescription("آيدي العضو المراد فك حظره")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب فك الحظر (اختياري)")
        .setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["unban", "فك_الحظر"],
    description: "فك حظر عضو من السيرفر باستخدام معرف Discord الخاص به",
    options: [
      { name: "الآيدي", description: "آيدي Discord للعضو المحظور (17-20 رقم)", required: true },
      { name: "السبب", description: "سبب فك الحظر (اختياري)", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: ["BanMembers"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["حظر"],
    examples: [
      "/فك_الحظر الآيدي:123456789012345678",
      "/فك_الحظر الآيدي:123456789012345678 السبب:تم العفو"
    ],
    notes: [
      "تحتاج آيدي Discord الخاص بالعضو (مو اسمه)",
      "البوت يفحص لو العضو فعلاً محظور قبل التنفيذ",
      "إن أمكن، البوت يرسل DM للعضو يبشّره بفك الحظر"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const userId = interaction.options.getString("الآيدي").trim()
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ تحقق: الآيدي رقم صحيح
      if (!/^\d{17,20}$/.test(userId)) {
        return interaction.reply({
          content: "❌ الآيدي غير صحيح. تأكد إنه رقم صحيح مثل: `123456789012345678`",
          ephemeral: true
        })
      }

      // ✅ لا تفك حظر نفسك
      if (userId === interaction.user.id) {
        return interaction.reply({
          content: "❌ ما تقدر تفك حظر نفسك!",
          ephemeral: true
        })
      }

      await interaction.deferReply()

      // ✅ تحقق: هل العضو محظور فعلاً؟
      const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null)

      if (!banEntry) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf59e0b)
              .setTitle("⚠️ العضو غير محظور")
              .setDescription(`ما وجدت أي حظر للآيدي \`${userId}\` في هذا السيرفر.`)
              .setTimestamp()
          ]
        })
      }

      // ✅ جلب معلومات المستخدم
      const targetUser = banEntry.user
      const banReason  = banEntry.reason || "لم يتم تحديد سبب عند الحظر"

      // ✅ تنفيذ فك الحظر
      await interaction.guild.members.unban(
        userId,
        `${reason} | بواسطة: ${interaction.user.username}`
      )

      // ✅ محاولة إرسال DM بعد فك الحظر
      let dmSent = false
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ تم فك حظرك")
          .setDescription(`تم فك حظرك من سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 السبب", value: reason, inline: true }
          )
          .setFooter({
            text: interaction.guild.name,
            iconURL: interaction.guild.iconURL({ dynamic: true })
          })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
        dmSent = true
      } catch {
        // العضو مقفل الخاص أو ما يقبل رسائل
      }

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ تم فك الحظر")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          {
            name: "👤 العضو",
            value: `${targetUser} (\`${targetUser.username}\`)`,
            inline: true
          },
          {
            name: "🆔 الآيدي",
            value: `\`${targetUser.id}\``,
            inline: true
          },
          {
            name: "📝 سبب الحظر السابق",
            value: banReason,
            inline: false
          },
          {
            name: "📝 سبب فك الحظر",
            value: reason,
            inline: false
          },
          {
            name: "📩 إشعار خاص",
            value: dmSent ?
              "✅ تم إرسال إشعار" : "❌ ما تم الإرسال (الخاص مغلق)",
            inline: true
          },
          {
            name: "👮 بواسطة",
            value: `${interaction.user} (\`${interaction.user.username}\`)`,
            inline: true
          }
        )
        .setFooter({ text: `الآيدي: ${targetUser.id}` })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (error) {
      console.error("[UNBAN ERROR]", error)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حصل خطأ أثناء فك الحظر" })
      }
      return interaction.reply({
        content: "❌ حصل خطأ أثناء فك الحظر",
        ephemeral: true
      })
    }
  },
}