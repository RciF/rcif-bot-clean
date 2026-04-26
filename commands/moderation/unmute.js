const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فك_الكتم")
    .setDescription("فك كتم عضو مكتوم (إزالة الـ Timeout)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName("العضو").setDescription("العضو المراد فك كتمه").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("السبب").setDescription("سبب فك الكتم (اختياري)").setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["unmute", "فك_الكتم"],
    description: "فك كتم عضو مكتوم (إزالة الـ Timeout) قبل انتهاء مدته",
    options: [
      { name: "العضو", description: "العضو المراد فك كتمه", required: true },
      { name: "السبب", description: "سبب فك الكتم (اختياري)", required: false }
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ModerateMembers"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["اسكت"],
    examples: [
      "/فك_الكتم العضو:@أحمد",
      "/فك_الكتم العضو:@أحمد السبب:تم العفو"
    ],
    notes: [
      "البوت يفحص لو العضو مكتوم فعلاً قبل التنفيذ",
      "العضو يستلم إشعار خاص بفك الكتم"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت أجد هذا العضو.", ephemeral: true })
      }

      if (!member.moderatable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يعدل على هذا العضو. تأكد إن رتبة البوت أعلى منه.", ephemeral: true })
      }

      if (!member.isCommunicationDisabled()) {
        return interaction.reply({ content: "⚠️ هذا العضو غير مكتوم أصلاً.", ephemeral: true })
      }

      const oldTimeout   = member.communicationDisabledUntil
      const oldTimestamp = Math.floor(oldTimeout.getTime() / 1000)

      await member.timeout(null, `${reason} | بواسطة: ${interaction.user.username}`)

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🔊 تم فك كتم العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو",          value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
          { name: "📝 السبب",          value: reason,                                                   inline: true  },
          { name: "⏰ كان مكتوم حتى", value: `<t:${oldTimestamp}:F> (<t:${oldTimestamp}:R>)`,          inline: false },
          { name: "👮 بواسطة",         value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  }
        )
        .setFooter({ text: `الآيدي: ${targetUser.id}` })
        .setTimestamp()

      // ✅ LOG
      discordLog.logUnmute(interaction.guild, {
        moderator: interaction.user,
        target: targetUser,
        reason
      }).catch(() => {})

      await interaction.reply({ embeds: [embed] })

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("🔊 تم فك كتمك")
          .setDescription(`تم فك كتمك في سيرفر **${interaction.guild.name}**`)
          .addFields({ name: "📝 السبب", value: reason, inline: true })
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
      } catch {}

    } catch (err) {
      console.error("[UNMUTE ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء فك كتم العضو.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء فك كتم العضو.", ephemeral: true })
    }
  },
}