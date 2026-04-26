const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("حظر")
    .setDescription("حظر عضو من السيرفر نهائياً")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد حظره")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب الحظر")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("حذف_الرسائل")
        .setDescription("حذف رسائل العضو السابقة")
        .setRequired(false)
        .addChoices(
          { name: "❌ لا تحذف شيء | No Delete",        value: "0" },
          { name: "🕐 آخر ساعة | Last Hour",            value: "3600" },
          { name: "📅 آخر يوم | Last Day",              value: "86400" },
          { name: "📅 آخر 3 أيام | Last 3 Days",        value: "259200" },
          { name: "📅 آخر أسبوع | Last Week (Max)",     value: "604800" }
        )
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["ban", "حظر"],
    description: "حظر عضو من السيرفر نهائياً مع إمكانية حذف رسائله السابقة",
    options: [
      { name: "العضو", description: "العضو المراد حظره", required: true },
      { name: "السبب", description: "سبب الحظر (يظهر في رسالة الحظر والـ logs)", required: false },
      { name: "حذف_الرسائل", description: "اختيار مدة حذف رسائله السابقة (من ساعة لأسبوع)", required: false }
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["BanMembers"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["فك_الحظر", "طرد", "تحذير", "اسكت"],
    examples: [
      "/حظر العضو:@أحمد",
      "/حظر العضو:@أحمد السبب:مخالفة القوانين",
      "/حظر العضو:@أحمد السبب:سبام حذف_الرسائل:آخر يوم"
    ],
    notes: [
      "البوت لا يقدر يحظر صاحب السيرفر",
      "لازم تكون رتبتك أعلى من رتبة العضو",
      "العضو يستلم إشعار خاص لو الـ DM مفتوح",
      "الحظر دائم حتى يتم رفعه يدوياً عبر /فك_الحظر"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const targetUser    = interaction.options.getUser("العضو")
      const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"
      const deleteSeconds = parseInt(interaction.options.getString("حذف_الرسائل") || "0")

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحظر نفسك!", ephemeral: true })
      }

      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحظر البوت.", ephemeral: true })
      }

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (member) {
        if (member.id === interaction.guild.ownerId) {
          return interaction.reply({ content: "❌ لا تقدر تحظر مالك السيرفر.", ephemeral: true })
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
          return interaction.reply({ content: "❌ لا تقدر تحظر عضو رتبته أعلى منك أو مساوية لك.", ephemeral: true })
        }

        if (!member.bannable) {
          return interaction.reply({ content: "❌ البوت ما يقدر يحظر هذا العضو. تأكد إن رتبة البوت أعلى منه.", ephemeral: true })
        }
      }

      const existingBan = await interaction.guild.bans.fetch(targetUser.id).catch(() => null)
      if (existingBan) {
        return interaction.reply({ content: "⚠️ هذا العضو محظور بالفعل.", ephemeral: true })
      }

      let dmSent = false
      if (member) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🚫 تم حظرك")
            .setDescription(`تم حظرك من سيرفر **${interaction.guild.name}**`)
            .addFields({ name: "📝 السبب", value: reason, inline: true })
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTimestamp()

          await targetUser.send({ embeds: [dmEmbed] })
          dmSent = true
        } catch {}
      }

      await interaction.guild.members.ban(targetUser, {
        deleteMessageSeconds: deleteSeconds,
        reason: `${reason} | بواسطة: ${interaction.user.username}`
      })

      const deleteLabels = {
        "0":      "ما تم حذف شيء",
        "3600":   "آخر ساعة",
        "86400":  "آخر يوم",
        "259200": "آخر 3 أيام",
        "604800": "آخر أسبوع"
      }

      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("🚫 تم حظر العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو",        value: `${targetUser} (\`${targetUser.username}\`)`,                    inline: true  },
          { name: "🆔 الآيدي",       value: `\`${targetUser.id}\``,                                          inline: true  },
          { name: "📝 السبب",        value: reason,                                                           inline: false },
          { name: "🗑️ حذف الرسائل", value: deleteLabels[String(deleteSeconds)] || "لا شيء",                 inline: true  },
          { name: "📩 إشعار خاص",   value: dmSent ? "✅ تم إرسال الإشعار" : "❌ لم يتم الإرسال (الخاص مغلق)", inline: true  },
          { name: "👮 بواسطة",       value: `${interaction.user} (\`${interaction.user.username}\`)`,         inline: false }
        )
        .setFooter({ text: "استخدم /فك_الحظر لإلغاء الحظر لاحقاً" })
        .setTimestamp()

      // ✅ LOG
      discordLog.logBan(interaction.guild, {
        moderator: interaction.user,
        target: targetUser,
        reason,
        deleteMessages: deleteLabels[String(deleteSeconds)] || "لا شيء"
      }).catch(() => {})

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[BAN ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تنفيذ الحظر.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تنفيذ الحظر.", ephemeral: true })
    }
  },
}