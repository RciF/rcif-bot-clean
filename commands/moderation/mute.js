const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

// الحد الأقصى للتايم أوت في Discord = 28 يوم (بالميلي ثانية)
const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000

// تحويل الوحدات إلى ميلي ثانية
const TIME_UNITS = {
  ثانية: 1000,
  دقيقة: 60 * 1000,
  ساعة: 60 * 60 * 1000,
  يوم: 24 * 60 * 60 * 1000,
  اسبوع: 7 * 24 * 60 * 60 * 1000,
  شهر: 28 * 24 * 60 * 60 * 1000
}

// أسماء الوحدات للعرض
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
    .setNameLocalizations({ "en-US": "اسكات", "en-GB": "اسكات" })
    .setDescriptionLocalizations({
  "en-US": "كتم عضو لمدة محددة",
  "en-GB": "كتم عضو لمدة محددة"
})
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد كتمه")
        .setNameLocalizations({ "en-US": "العضو", "en-GB": "العضو" })
.setDescriptionLocalizations({ "en-US": "العضو المراد كتمه", "en-GB": "العضو المراد كتمه" })
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("المدة")
        .setDescription("مدة الكتم (رقم)")
        .setNameLocalizations({ "en-US": "المدة", "en-GB": "المدة" })
.setDescriptionLocalizations({ "en-US": "مدة الكتم (رقم)", "en-GB": "مدة الكتم (رقم)" })
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(672)
    )
    .addStringOption(option =>
      option
        .setName("الوحدة")
        .setDescription("وحدة الوقت")
        .setNameLocalizations({ "en-US": "الوحدة", "en-GB": "الوحدة" })
.setDescriptionLocalizations({ "en-US": "وحدة الوقت", "en-GB": "وحدة الوقت" })
        .setRequired(true)
        .addChoices(
          { name: "ثانية | Second", value: "ثانية" },
          { name: "دقيقة | Minute", value: "دقيقة" },
          { name: "ساعة | Hour", value: "ساعة" },
          { name: "يوم | Day", value: "يوم" },
          { name: "أسبوع | Week", value: "اسبوع" },
          { name: "شهر | Month (28 يوم)", value: "شهر" }
        )
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب الكتم")
        .setNameLocalizations({ "en-US": "السبب", "en-GB": "السبب" })
.setDescriptionLocalizations({ "en-US": "سبب الكتم", "en-GB": "سبب الكتم" })
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ تحقق: داخل سيرفر فقط
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const duration = interaction.options.getInteger("المدة")
      const unit = interaction.options.getString("الوحدة")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ تحقق: لا تكتم نفسك
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تكتم نفسك!", ephemeral: true })
      }

      // ✅ تحقق: لا تكتم البوت
      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({ content: "❌ لا تقدر تكتم البوت.", ephemeral: true })
      }

      // ✅ جلب العضو
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      // ✅ تحقق: لا تكتم مالك السيرفر
      if (member.id === interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ لا تقدر تكتم مالك السيرفر.", ephemeral: true })
      }

      // ✅ تحقق: رتبة المنفذ أعلى من الهدف
      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({ content: "❌ لا تقدر تكتم عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
      }

      // ✅ تحقق: البوت يقدر يكتمه
      if (!member.moderatable) {
        return interaction.reply({ content: "❌ البوت ما يقدر يكتم هذا العضو. تأكد إن رتبة البوت أعلى.", ephemeral: true })
      }

      // ✅ تحقق: العضو مكتوم بالفعل
      if (member.isCommunicationDisabled()) {
        const currentTimeout = member.communicationDisabledUntil
        const currentTimestamp = Math.floor(currentTimeout.getTime() / 1000)
        return interaction.reply({
          content: `⚠️ هذا العضو مكتوم بالفعل.\n⏰ ينتهي الكتم: <t:${currentTimestamp}:R> — <t:${currentTimestamp}:F>`,
          ephemeral: true
        })
      }

      // ✅ حساب المدة بالميلي ثانية
      const multiplier = TIME_UNITS[unit]
      if (!multiplier) {
        return interaction.reply({ content: "❌ وحدة وقت غير صحيحة.", ephemeral: true })
      }

      const totalMs = duration * multiplier

      // ✅ تحقق: الحد الأقصى 28 يوم (قيد Discord)
      if (totalMs > MAX_TIMEOUT) {
        return interaction.reply({
          content: `❌ الحد الأقصى للكتم هو **28 يوم** (قيد من Discord)\n⏱ أنت طلبت: **${duration} ${getUnitLabel(unit, duration)}** = **${formatDuration(totalMs)}**`,
          ephemeral: true
        })
      }

      // ✅ تحقق: الحد الأدنى 1 ثانية
      if (totalMs < 1000) {
        return interaction.reply({ content: "❌ الحد الأدنى للكتم هو **1 ثانية**.", ephemeral: true })
      }

      // ✅ حساب وقت الانتهاء
      const expiresAt = new Date(Date.now() + totalMs)
      const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000)
      const durationText = `${duration} ${getUnitLabel(unit, duration)}`
      const durationFormatted = formatDuration(totalMs)

      // ✅ محاولة إرسال رسالة خاصة للعضو قبل الكتم
      let dmSent = false
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("🔇 تم كتمك")
          .setDescription(`تم كتمك في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "⏱ المدة", value: durationText, inline: true },
            { name: "📝 السبب", value: reason, inline: true },
            { name: "⏰ ينتهي الكتم", value: `<t:${expiresTimestamp}:R> — <t:${expiresTimestamp}:F>`, inline: false }
          )
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
        dmSent = true
      } catch {
        // العضو مقفل الخاص — نكمل عادي
      }

      // ✅ تنفيذ الكتم
      await member.timeout(totalMs, `${reason} | بواسطة: ${interaction.user.username}`)

      // ✅ إرسال Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("🔇 تم كتم العضو")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
          { name: "⏱ المدة", value: durationText, inline: true },
          { name: "🕐 المدة الفعلية", value: durationFormatted, inline: true },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "⏰ ينتهي الكتم", value: `<t:${expiresTimestamp}:R> — <t:${expiresTimestamp}:F>`, inline: false },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true },
          { name: "📩 إشعار خاص", value: dmSent ? "✅ تم إرسال إشعار للعضو" : "❌ العضو مقفل الخاص", inline: true }
        )
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

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