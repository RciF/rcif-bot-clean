const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000

const TIME_UNITS = {
  ثانية: 1000,
  دقيقة: 60 * 1000,
  ساعة: 60 * 60 * 1000,
  يوم: 24 * 60 * 60 * 1000,
  اسبوع: 7 * 24 * 60 * 60 * 1000,
  شهر: 28 * 24 * 60 * 60 * 1000
}

const UNIT_DISPLAY = {
  ثانية: { one: "ثانية", two: "ثانيتين", plural: "ثواني" },
  دقيقة: { one: "دقيقة", two: "دقيقتين", plural: "دقائق" },
  ساعة: { one: "ساعة", two: "ساعتين", plural: "ساعات" },
  يوم: { one: "يوم", two: "يومين", plural: "أيام" },
  اسبوع: { one: "أسبوع", two: "أسبوعين", plural: "أسابيع" },
  شهر: { one: "شهر", two: "شهرين", plural: "أشهر" }
}

function getUnitLabel(unit, amount) {
  const labels = UNIT_DISPLAY[unit]
  if (!labels) return unit
  if (amount === 1) return labels.one
  if (amount === 2) return labels.two
  return labels.plural
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const parts = []
  if (days > 0) parts.push(`${days} ${getUnitLabel("يوم", days)}`)
  if (hours > 0) parts.push(`${hours} ${getUnitLabel("ساعة", hours)}`)
  if (minutes > 0) parts.push(`${minutes} ${getUnitLabel("دقيقة", minutes)}`)
  if (seconds > 0 && days === 0) parts.push(`${seconds} ${getUnitLabel("ثانية", seconds)}`)

  return parts.join(" و ") || "0 ثانية"
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("اسكت")
    .setDescription("كتم عضو (Timeout) لمدة محددة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName("العضو").setDescription("العضو المراد كتمه").setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("المدة").setDescription("مدة الكتم (رقم)").setRequired(true).setMinValue(1).setMaxValue(672)
    )
    .addStringOption(option =>
      option
        .setName("الوحدة")
        .setDescription("وحدة الوقت")
        .setRequired(true)
        .addChoices(
          { name: "ثانية | Second", value: "ثانية" },
          { name: "دقيقة | Minute", value: "دقيقة" },
          { name: "ساعة | Hour",    value: "ساعة"  },
          { name: "يوم | Day",      value: "يوم"   },
          { name: "أسبوع | Week",   value: "اسبوع" },
          { name: "شهر | Month (28 يوم)", value: "شهر" }
        )
    )
    .addStringOption(option =>
      option.setName("السبب").setDescription("سبب الكتم").setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["mute", "timeout", "اسكت", "كتم"],
    description: "كتم عضو (Discord Timeout) لمدة محددة — يمنعه من الكتابة والتحدث الصوتي",
    options: [
      { name: "العضو", description: "العضو المراد كتمه", required: true },
      { name: "المدة", description: "مدة الكتم بالأرقام (مثلاً: 5)", required: true },
      { name: "الوحدة", description: "وحدة الوقت (ثانية / دقيقة / ساعة / يوم / أسبوع / شهر)", required: true },
      { name: "السبب", description: "سبب الكتم", required: false }
    ],
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ModerateMembers"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["فك_الكتم", "تحذير", "طرد"],
    examples: [
      "/اسكت العضو:@أحمد المدة:1 الوحدة:ساعة",
      "/اسكت العضو:@أحمد المدة:30 الوحدة:دقيقة السبب:إزعاج",
      "/اسكت العضو:@أحمد المدة:1 الوحدة:يوم"
    ],
    notes: [
      "الحد الأقصى للكتم هو 28 يوم (قيد من Discord)",
      "العضو يقدر يقرأ الرسائل لكن ما يقدر يرد",
      "ينتهي الكتم تلقائياً، أو استخدم /فك_الكتم لإنهائه مبكراً"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const duration   = interaction.options.getInteger("المدة")
      const unit       = interaction.options.getString("الوحدة")
      const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تكتم نفسك!", ephemeral: true })
      }

      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تكتم البوت.", ephemeral: true })
      }

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تكتم مالك السيرفر.", ephemeral: true })
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: "❌ لا تقدر تكتم عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
      }

      if (!member.moderatable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يكتم هذا العضو. تأكد إن رتبة البوت أعلى.", ephemeral: true })
      }

      if (member.isCommunicationDisabled()) {
        const currentTimestamp = Math.floor(member.communicationDisabledUntil.getTime() / 1000)
        return interaction.reply({
          content: `⚠️ هذا العضو مكتوم بالفعل.\n⏰ ينتهي الكتم: <t:${currentTimestamp}:R> — <t:${currentTimestamp}:F>`,
          ephemeral: true
        })
      }

      const multiplier = TIME_UNITS[unit]
      if (!multiplier) {
        return interaction.reply({ content: "❌ وحدة وقت غير صحيحة.", ephemeral: true })
      }

      const totalMs = duration * multiplier

      if (totalMs > MAX_TIMEOUT) {
        return interaction.reply({
          content: `❌ الحد الأقصى للكتم هو **28 يوم** (قيد من Discord)\n⏱ أنت طلبت: **${duration} ${getUnitLabel(unit, duration)}** = **${formatDuration(totalMs)}**`,
          ephemeral: true
        })
      }

      if (totalMs < 1000) {
        return interaction.reply({ content: "❌ الحد الأدنى للكتم هو **1 ثانية**.", ephemeral: true })
      }

      const expiresAt        = new Date(Date.now() + totalMs)
      const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000)
      const durationText     = `${duration} ${getUnitLabel(unit, duration)}`
      const durationFormatted = formatDuration(totalMs)

      let dmSent = false
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("🔇 تم كتمك")
          .setDescription(`تم كتمك في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "⏱ المدة",       value: durationText,                                              inline: true  },
            { name: "📝 السبب",       value: reason,                                                    inline: true  },
            { name: "⏰ ينتهي الكتم", value: `<t:${expiresTimestamp}:R> — <t:${expiresTimestamp}:F>`, inline: false }
          )
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
        dmSent = true
      } catch {}

      await member.timeout(totalMs, `${reason} | بواسطة: ${interaction.user.username}`)

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("🔇 تم كتم العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو",        value: `${targetUser} (\`${targetUser.username}\`)`,               inline: true  },
          { name: "⏱ المدة",         value: durationText,                                               inline: true  },
          { name: "🕐 المدة الفعلية", value: durationFormatted,                                          inline: true  },
          { name: "📝 السبب",         value: reason,                                                     inline: false },
          { name: "⏰ ينتهي الكتم",   value: `<t:${expiresTimestamp}:R> — <t:${expiresTimestamp}:F>`,  inline: false },
          { name: "👮 بواسطة",        value: `${interaction.user} (\`${interaction.user.username}\`)`,  inline: true  },
          { name: "📩 إشعار خاص",    value: dmSent ? "✅ تم إرسال إشعار للعضو" : "❌ العضو مقفل الخاص", inline: true  }
        )
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

      // ✅ LOG
      discordLog.logMute(interaction.guild, {
        moderator: interaction.user,
        target: targetUser,
        reason,
        duration: durationText
      }).catch(() => {})

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[MUTE ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء محاولة كتم العضو.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء محاولة كتم العضو.", ephemeral: true })
    }
  },
}