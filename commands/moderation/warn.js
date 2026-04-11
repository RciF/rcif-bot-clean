const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")
const discordLog = require("../../systems/discordLogSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تحذير")
    .setDescription("إعطاء تحذير لعضو")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName("العضو").setDescription("العضو المراد تحذيره").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("السبب").setDescription("سبب التحذير").setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحذر نفسك!", ephemeral: true })
      }

      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تحذر البوت.", ephemeral: true })
      }

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تحذر مالك السيرفر.", ephemeral: true })
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: "❌ لا تقدر تحذر عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
      }

      // ✅ إضافة التحذير
      await warningSystem.addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason)

      // ✅ جلب عدد التحذيرات بعد الإضافة
      const allWarnings     = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)
      const totalWarnings   = allWarnings?.length || 1
      const severityColor   = totalWarnings >= 5 ? 0xef4444 : totalWarnings >= 3 ? 0xf59e0b : 0x3b82f6
      const severityLabel   = totalWarnings >= 5 ? "🔴 خطير" : totalWarnings >= 3 ? "🟡 متوسط" : "🟢 عادي"

      // ✅ DM للعضو
      let dmSent = false
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(severityColor)
          .setTitle("⚠️ تلقيت تحذيراً")
          .setDescription(`تلقيت تحذيراً في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 السبب",           value: reason,        inline: true },
            { name: "📊 إجمالي تحذيراتك", value: `${totalWarnings}`, inline: true }
          )
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
        dmSent = true
      } catch {}

      const embed = new EmbedBuilder()
        .setColor(severityColor)
        .setTitle("⚠️ تم تحذير العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو",              value: `${targetUser} (\`${targetUser.username}\`)`,       inline: true  },
          { name: "🆔 ID",                 value: `\`${targetUser.id}\``,                              inline: true  },
          { name: "⚡ مستوى الخطورة",     value: severityLabel,                                       inline: true  },
          { name: "📝 السبب",              value: reason,                                              inline: false },
          { name: "📊 إجمالي التحذيرات",  value: `${totalWarnings} تحذير`,                           inline: true  },
          { name: "📩 إشعار خاص",         value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال",  inline: true  },
          { name: "👮 بواسطة",            value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false }
        )
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

      // ✅ LOG
      discordLog.logWarn(interaction.guild, {
        moderator: interaction.user,
        target: targetUser,
        reason,
        totalWarnings
      }).catch(() => {})

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