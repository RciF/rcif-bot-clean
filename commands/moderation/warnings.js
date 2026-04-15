const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("التحذيرات")
    .setDescription("عرض تحذيرات عضو محدد أو كل الأعضاء المحذرين في السيرفر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("عضو محدد (اتركه فاضي لعرض كل المحذرين)")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("الترتيب")
        .setDescription("طريقة ترتيب النتائج عند عرض الكل")
        .setRequired(false)
        .addChoices(
          { name: "🔴 الأكثر تحذيراً أولاً | Most Warned",  value: "desc" },
          { name: "🟢 الأقل تحذيراً أولاً | Least Warned",  value: "asc"  }
        )
    ),

  async execute(interaction) {
    try {
      // ✅ Check: inside a guild only
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const sortOrder  = interaction.options.getString("الترتيب") || "desc"

      // ════════════════════════════════════════
      // 👤 عضو محدد
      // ════════════════════════════════════════
      if (targetUser) {
        const warnings = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)

        if (!warnings || warnings.length === 0) {
          const cleanEmbed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ سجل نظيف")
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
            .setDescription(`${targetUser} ما عنده أي تحذيرات في هذا السيرفر.`)
            .setFooter({ text: `الآيدي: ${targetUser.id}` })
            .setTimestamp()

          return interaction.reply({ embeds: [cleanEmbed] })
        }

        // Color based on count
        const color = warnings.length >= 5 ? 0xef4444
                    : warnings.length >= 3 ? 0xf59e0b
                    : 0x3b82f6

        // Severity level
        const severity = warnings.length >= 5 ? "🔴 خطير — يُنصح باتخاذ إجراء فوري"
                       : warnings.length >= 3 ? "🟡 متوسط — العضو قارب الحد"
                       : "🟢 عادي"

        // Build warning list
        let warningList = ""
        for (let i = 0; i < warnings.length; i++) {
          const w = warnings[i]
          const date = w.created_at
            ? new Date(w.created_at).toLocaleDateString("ar-SA", {
                year: "numeric", month: "short", day: "numeric"
              })
            : "غير معروف"
          const moderator = w.moderator_id ? `<@${w.moderator_id}>` : "غير معروف"

          warningList += `**${i + 1}.** ${w.reason || "بدون سبب"}\n`
          warningList += `   📅 ${date} — 👮 ${moderator}\n\n`
        }

        if (warningList.length > 1024) {
          warningList = warningList.slice(0, 1000) + "\n... وغيرها"
        }

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`⚠️ تحذيرات ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "👤 العضو",          value: `${targetUser} (\`${targetUser.username}\`)`, inline: true  },
            { name: "📊 المجموع",        value: `**${warnings.length}** تحذير`,              inline: true  },
            { name: "⚡ مستوى الخطورة", value: severity,                                      inline: true  },
            { name: "📋 السجل",          value: warningList,                                  inline: false }
          )
          .setFooter({ text: `الآيدي: ${targetUser.id} | استخدم /مسح_التحذيرات لمسح الكل` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

      // ════════════════════════════════════════
      // 👥 كل المحذرين في السيرفر
      // ════════════════════════════════════════
      await interaction.deferReply()

      const allWarnings = await warningSystem.getAllWarnings(interaction.guild.id)

      if (!allWarnings || allWarnings.length === 0) {
        const cleanEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ السيرفر نظيف")
          .setDescription("ما فيه أي عضو عنده تحذيرات في هذا السيرفر.")
          .setTimestamp()

        return interaction.editReply({ embeds: [cleanEmbed] })
      }

      // ✅ Group warnings by user
      const grouped = {}
      for (const w of allWarnings) {
        if (!grouped[w.user_id]) grouped[w.user_id] = []
        grouped[w.user_id].push(w)
      }

      // ✅ Sort entries
      let entries = Object.entries(grouped)
      entries = sortOrder === "desc"
        ? entries.sort((a, b) => b[1].length - a[1].length)
        : entries.sort((a, b) => a[1].length - b[1].length)

      // ✅ Stats
      const totalWarnings   = allWarnings.length
      const totalMembers    = entries.length
      const dangerous       = entries.filter(([, w]) => w.length >= 5).length
      const medium          = entries.filter(([, w]) => w.length >= 3 && w.length < 5).length
      const normal          = entries.filter(([, w]) => w.length < 3).length

      // ✅ Build members list (max 15 to avoid embed limit)
      const displayEntries = entries.slice(0, 15)
      let membersList = ""

      for (const [userId, warns] of displayEntries) {
        const count  = warns.length
        const icon   = count >= 5 ? "🔴" : count >= 3 ? "🟡" : "🟢"
        const latest = warns[warns.length - 1]
        const date   = latest?.created_at
          ? new Date(latest.created_at).toLocaleDateString("ar-SA", {
              year: "numeric", month: "short", day: "numeric"
            })
          : "غير معروف"

        membersList += `${icon} <@${userId}> — **${count}** تحذير | آخر تحذير: ${date}\n`
      }

      if (entries.length > 15) {
        membersList += `\n... و **${entries.length - 15}** عضو آخر`
      }

      // ✅ Overall color
      const overallColor = dangerous > 0 ? 0xef4444
                         : medium   > 0 ? 0xf59e0b
                         : 0x3b82f6

      const embed = new EmbedBuilder()
        .setColor(overallColor)
        .setTitle("📋 سجل التحذيرات — كل السيرفر")
        .setDescription(membersList)
        .addFields(
          { name: "👥 إجمالي المحذرين", value: `**${totalMembers}** عضو`,    inline: true },
          { name: "⚠️ إجمالي التحذيرات", value: `**${totalWarnings}** تحذير`, inline: true },
          { name: "📊 الترتيب", value: sortOrder === "desc" ? "🔴 الأكثر أولاً" : "🟢 الأقل أولاً", inline: true },
          {
            name: "📈 توزيع الخطورة",
            value: `🔴 خطير (5+): **${dangerous}**\n🟡 متوسط (3-4): **${medium}**\n🟢 عادي (1-2): **${normal}**`,
            inline: false
          }
        )
        .setFooter({ text: `${interaction.guild.name} | استخدم /التحذيرات @عضو لتفاصيل عضو محدد` })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (err) {
      console.error("[WARNINGS ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء عرض التحذيرات.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء عرض التحذيرات.", ephemeral: true })
    }
  },
}