const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("معلومات")
    .setDescription("عرض معلومات تفصيلية عن عضو")
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("اختر العضو (اتركه فاضي لعرض معلوماتك)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      await interaction.deferReply()

      const targetUser = interaction.options.getUser("العضو") || interaction.user
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.editReply({
          content: "❌ لم يتم العثور على العضو في هذا السيرفر"
        })
      }

      // ✅ Timestamps
      const createdTimestamp = Math.floor(targetUser.createdAt.getTime() / 1000)
      const joinedTimestamp  = member.joinedAt
        ? Math.floor(member.joinedAt.getTime() / 1000)
        : null

      // ✅ الرتب — بدون @everyone، مرتبة من الأعلى
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)

      const rolesText = roles.size > 0
        ? roles.map(r => `${r}`).slice(0, 10).join(" ") +
          (roles.size > 10 ? `\n... و **${roles.size - 10}** رتبة أخرى` : "")
        : "لا توجد رتب"

      // ✅ حالة الاتصال
      const statusMap = {
        online:  "🟢 متصل",
        idle:    "🌙 غائب",
        dnd:     "⛔ مشغول",
        offline: "⚫ غير متصل"
      }
      const status     = member.presence?.status || "offline"
      const statusText = statusMap[status] || "⚫ غير متصل"

      // ✅ بادجات ديسكورد
      const badgeMap = {
        Staff:                  "👨‍💼 موظف ديسكورد",
        Partner:                "🤝 شريك",
        BugHunterLevel1:        "🐛 صياد بق",
        BugHunterLevel2:        "🐛 صياد بق ذهبي",
        PremiumEarlySupporter:  "⭐ داعم مبكر",
        ActiveDeveloper:        "💻 مطور نشط",
        VerifiedBotDeveloper:   "✅ مطور بوتات",
        CertifiedModerator:     "🛡️ مشرف معتمد",
        HypeSquadOnlineHouse1:  "🏠 Bravery",
        HypeSquadOnlineHouse2:  "🏠 Brilliance",
        HypeSquadOnlineHouse3:  "🏠 Balance",
      }
      const flags     = targetUser.flags?.toArray() || []
      const badges    = flags.filter(f => badgeMap[f]).map(f => badgeMap[f])
      const badgeText = badges.length > 0 ? badges.join("\n") : null

      // ✅ حالة الكتم
      const muteText = member.isCommunicationDisabled()
        ? `🔇 مكتوم حتى <t:${Math.floor(member.communicationDisabledUntil.getTime() / 1000)}:R>`
        : null

      // ✅ لون الـ Embed من أعلى رتبة
      const embedColor = member.roles.highest?.color || 0x5865f2

      // ✅ بناء الـ Embed
      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`👤 معلومات ${member.displayName}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          {
            name: "🏷️ الاسم",
            value: [
              `**المستخدم:** ${targetUser.username}`,
              member.displayName !== targetUser.username
                ? `**الكنية:** ${member.displayName}`
                : null,
              targetUser.bot ? "**النوع:** 🤖 بوت" : null,
            ].filter(Boolean).join("\n"),
            inline: true
          },
          {
            name: "🆔 المعرّف",
            value: `\`${targetUser.id}\``,
            inline: true
          },
          {
            name: "📡 الحالة",
            value: [statusText, muteText].filter(Boolean).join("\n"),
            inline: true
          },
          {
            name: "📅 انضم إلى ديسكورد",
            value: `<t:${createdTimestamp}:D>\n<t:${createdTimestamp}:R>`,
            inline: true
          },
          {
            name: "📅 انضم إلى السيرفر",
            value: joinedTimestamp
              ? `<t:${joinedTimestamp}:D>\n<t:${joinedTimestamp}:R>`
              : "غير معروف",
            inline: true
          },
          {
            name: `🎭 الرتب (${roles.size})`,
            value: rolesText,
            inline: false
          }
        )

      // ✅ بادجات — فقط لو عنده
      if (badgeText) {
        embed.addFields({ name: "🏅 البادجات", value: badgeText, inline: false })
      }

      // ✅ بانر العضو لو عنده
      const bannerURL = targetUser.bannerURL?.({ size: 512 })
      if (bannerURL) embed.setImage(bannerURL)

      embed
        .setFooter({
          text: `طلب من: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (error) {
      console.error("[USERINFO ERROR]", error)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حصل خطأ في عرض معلومات العضو" })
      }
      return interaction.reply({
        content: "❌ حصل خطأ في عرض معلومات العضو",
        ephemeral: true
      })
    }
  },
}