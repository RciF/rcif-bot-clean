const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("طرد")
    .setDescription("طرد عضو من السيرفر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد طرده")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب الطرد")
        .setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["kick", "طرد"],
    description: "طرد عضو من السيرفر — يقدر يرجع لو دخل من رابط دعوة جديد",
    options: [
      { name: "العضو", description: "العضو المراد طرده", required: true },
      { name: "السبب", description: "سبب الطرد", required: false }
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["KickMembers"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["حظر", "اسكت", "تحذير"],
    examples: [
      "/طرد العضو:@أحمد",
      "/طرد العضو:@أحمد السبب:سبام في القنوات"
    ],
    notes: [
      "الطرد ما يمنع العضو من الرجوع — للمنع الدائم استخدم /حظر",
      "العضو يستلم إشعار خاص لو الـ DM مفتوح",
      "البوت لا يقدر يطرد صاحب السيرفر أو من رتبته أعلى من البوت"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تطرد نفسك!", ephemeral: true })
      }

      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تطرد البوت.", ephemeral: true })
      }

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تطرد مالك السيرفر.", ephemeral: true })
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: "❌ لا تقدر تطرد عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
      }

      if (!member.kickable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يطرد هذا العضو. تأكد إن رتبة البوت أعلى.", ephemeral: true })
      }

      let dmSent = false
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("👢 تم طردك")
          .setDescription(`تم طردك من سيرفر **${interaction.guild.name}**`)
          .addFields({ name: "📝 السبب", value: reason, inline: true })
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
        dmSent = true
      } catch {}

      await member.kick(`${reason} | بواسطة: ${interaction.user.username}`)

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("👢 تم طرد العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو",    value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
          { name: "🆔 ID",       value: `\`${targetUser.id}\``,                                    inline: true  },
          { name: "📝 السبب",    value: reason,                                                    inline: false },
          { name: "📩 إشعار خاص", value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال",       inline: true  },
          { name: "👮 بواسطة",   value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  }
        )
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

      // ✅ LOG
      discordLog.logKick(interaction.guild, {
        moderator: interaction.user,
        target: targetUser,
        reason
      }).catch(() => {})

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[KICK ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء طرد العضو.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء طرد العضو.", ephemeral: true })
    }
  },
}