const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لقب")
    .setDescription("تغيير أو إزالة لقب عضو في السيرفر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(option =>
      option.setName("العضو").setDescription("العضو المراد تغيير لقبه").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("اللقب").setDescription("اللقب الجديد (اتركه فاضي لإزالة اللقب)").setRequired(false).setMaxLength(32)
    )
    .addStringOption(option =>
      option.setName("السبب").setDescription("سبب تغيير اللقب (اختياري)").setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["nick", "nickname", "لقب"],
    description: "تغيير أو إزالة لقب عضو في السيرفر",
    options: [
      { name: "العضو", description: "العضو المراد تغيير لقبه", required: true },
      { name: "اللقب", description: "اللقب الجديد (اتركه فاضي لإزالة اللقب)", required: false },
      { name: "السبب", description: "سبب التغيير", required: false }
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ManageNicknames"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: [],
    examples: [
      "/لقب العضو:@أحمد اللقب:محمد",
      "/لقب العضو:@أحمد (يزيل اللقب)"
    ],
    notes: [
      "الحد الأقصى 32 حرف للقب (قيد من Discord)",
      "ما تقدر تغير لقب صاحب السيرفر إلا لو أنت صاحبه",
      "البوت يحتاج رتبته أعلى من رتبة العضو"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const targetUser  = interaction.options.getUser("العضو")
      const newNickname = interaction.options.getString("اللقب") || null
      const reason      = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت أجد هذا العضو.", ephemeral: true })
      }

      if (member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تغير لقب مالك السيرفر.", ephemeral: true })
      }

      if (targetUser.id !== interaction.user.id) {
        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
          return interaction.reply({ content: "❌ لا تقدر تغير لقب عضو رتبته أعلى منك أو مساوية لك.", ephemeral: true })
        }
      }

      if (!member.manageable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يغير لقب هذا العضو. تأكد إن رتبة البوت أعلى منه.", ephemeral: true })
      }

      const oldNickname = member.nickname || member.user.username
      const isRemoving  = newNickname === null

      if (!isRemoving && newNickname === member.nickname) {
        return interaction.reply({ content: "⚠️ هذا اللقب هو نفسه اللقب الحالي!", ephemeral: true })
      }

      await member.setNickname(newNickname, `${reason} | بواسطة: ${interaction.user.username}`)

      const embed = new EmbedBuilder()
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .setFooter({ text: `الآيدي: ${targetUser.id}` })
        .setTimestamp()

      if (isRemoving) {
        embed.setColor(0xf59e0b)
        embed.setTitle("📝 تم إزالة لقب العضو")
        embed.addFields(
          { name: "👤 العضو",        value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
          { name: "🏷️ اللقب القديم", value: `\`${oldNickname}\``,                                    inline: true  },
          { name: "🔄 الاسم الحالي", value: `\`${targetUser.username}\` (الاسم الأصلي)`,             inline: false },
          { name: "📝 السبب",        value: reason,                                                   inline: false },
          { name: "👮 بواسطة",       value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  }
        )
      } else {
        embed.setColor(0x3b82f6)
        embed.setTitle("📝 تم تغيير لقب العضو")
        embed.addFields(
          { name: "👤 العضو",        value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
          { name: "🏷️ اللقب القديم", value: `\`${oldNickname}\``,                                    inline: true  },
          { name: "🆕 اللقب الجديد", value: `\`${newNickname}\``,                                    inline: true  },
          { name: "📝 السبب",        value: reason,                                                   inline: false },
          { name: "👮 بواسطة",       value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  }
        )
      }

      // ✅ LOG
      discordLog.logNickname(interaction.guild, {
        moderator: interaction.user,
        target:    targetUser,
        oldNick:   member.nickname || null,
        newNick:   newNickname
      }).catch(() => {})

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[NICKNAME ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تغيير اللقب.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تغيير اللقب.", ephemeral: true })
    }
  },
}