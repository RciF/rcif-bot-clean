const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js")
const warningSystem = require("../../systems/warningSystem")
const discordLog = require("../../systems/discordLogSystem")

// ════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════

const TIME_UNITS = {
  ثانية: 1000,
  دقيقة: 60 * 1000,
  ساعة: 60 * 60 * 1000,
  يوم: 24 * 60 * 60 * 1000,
  اسبوع: 7 * 24 * 60 * 60 * 1000,
  شهر: 28 * 24 * 60 * 60 * 1000,
}

const UNIT_DISPLAY = {
  ثانية: { one: "ثانية", two: "ثانيتين", plural: "ثواني" },
  دقيقة: { one: "دقيقة", two: "دقيقتين", plural: "دقائق" },
  ساعة:  { one: "ساعة",  two: "ساعتين",  plural: "ساعات"  },
  يوم:   { one: "يوم",   two: "يومين",   plural: "أيام"   },
  اسبوع: { one: "أسبوع", two: "أسبوعين", plural: "أسابيع"},
  شهر:   { one: "شهر",   two: "شهرين",   plural: "أشهر"   },
}

const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000

function getUnitLabel(unit, amount) {
  const labels = UNIT_DISPLAY[unit]
  if (!labels) return unit
  if (amount === 1) return labels.one
  if (amount === 2) return labels.two
  return labels.plural
}

function formatMuteDuration(ms) {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sc = s % 60
  const parts = []
  if (d > 0) parts.push(`${d} ${getUnitLabel("يوم", d)}`)
  if (h > 0) parts.push(`${h} ${getUnitLabel("ساعة", h)}`)
  if (m > 0) parts.push(`${m} ${getUnitLabel("دقيقة", m)}`)
  if (sc > 0 && d === 0) parts.push(`${sc} ${getUnitLabel("ثانية", sc)}`)
  return parts.join(" و ") || "0 ثانية"
}

function formatSlowmode(seconds) {
  if (seconds === 0)   return "مغلق"
  if (seconds < 60)    return `${seconds} ثانية`
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} دقيقة`
  return `${Math.floor(seconds / 3600)} ساعة`
}

const SLOWMODE_MAP = {
  "0": 0, "5s": 5, "10s": 10, "15s": 15, "30s": 30,
  "1m": 60, "2m": 120, "5m": 300, "10m": 600,
  "15m": 900, "30m": 1800, "1h": 3600, "2h": 7200, "6h": 21600,
}

// ════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("اشراف")
    .setDescription("أوامر الإشراف والإدارة")
    .setDMPermission(false)

    // ─── حظر ───
    .addSubcommand(sub =>
      sub.setName("حظر").setDescription("حظر عضو من السيرفر نهائياً")
        .addUserOption(o => o.setName("العضو").setDescription("العضو المراد حظره").setRequired(true))
        .addStringOption(o => o.setName("السبب").setDescription("سبب الحظر").setRequired(false))
        .addStringOption(o =>
          o.setName("حذف_الرسائل").setDescription("حذف رسائل العضو السابقة").setRequired(false)
            .addChoices(
              { name: "❌ لا تحذف شيء | No Delete",    value: "0"      },
              { name: "🕐 آخر ساعة | Last Hour",        value: "3600"   },
              { name: "📅 آخر يوم | Last Day",          value: "86400"  },
              { name: "📅 آخر 3 أيام | Last 3 Days",    value: "259200" },
              { name: "📅 آخر أسبوع | Last Week (Max)", value: "604800" },
            )
        )
    )

    // ─── فك_الحظر ───
    .addSubcommand(sub =>
      sub.setName("فك_الحظر").setDescription("فك حظر عضو من السيرفر")
        .addStringOption(o => o.setName("الآيدي").setDescription("آيدي العضو المراد فك حظره").setRequired(true))
        .addStringOption(o => o.setName("السبب").setDescription("سبب فك الحظر (اختياري)").setRequired(false))
    )

    // ─── طرد ───
    .addSubcommand(sub =>
      sub.setName("طرد").setDescription("طرد عضو من السيرفر")
        .addUserOption(o => o.setName("العضو").setDescription("العضو المراد طرده").setRequired(true))
        .addStringOption(o => o.setName("السبب").setDescription("سبب الطرد").setRequired(false))
    )

    // ─── اسكت ───
    .addSubcommand(sub =>
      sub.setName("اسكت").setDescription("كتم عضو (Timeout) لمدة محددة")
        .addUserOption(o => o.setName("العضو").setDescription("العضو المراد كتمه").setRequired(true))
        .addIntegerOption(o => o.setName("المدة").setDescription("مدة الكتم (رقم)").setRequired(true).setMinValue(1).setMaxValue(672))
        .addStringOption(o =>
          o.setName("الوحدة").setDescription("وحدة الوقت").setRequired(true)
            .addChoices(
              { name: "ثانية | Second",        value: "ثانية"  },
              { name: "دقيقة | Minute",        value: "دقيقة"  },
              { name: "ساعة | Hour",           value: "ساعة"   },
              { name: "يوم | Day",             value: "يوم"    },
              { name: "أسبوع | Week",          value: "اسبوع"  },
              { name: "شهر | Month (28 يوم)",  value: "شهر"    },
            )
        )
        .addStringOption(o => o.setName("السبب").setDescription("سبب الكتم").setRequired(false))
    )

    // ─── فك_كتم ───
    .addSubcommand(sub =>
      sub.setName("فك_كتم").setDescription("فك كتم عضو مكتوم")
        .addUserOption(o => o.setName("العضو").setDescription("العضو المراد فك كتمه").setRequired(true))
        .addStringOption(o => o.setName("السبب").setDescription("سبب فك الكتم (اختياري)").setRequired(false))
    )

    // ─── تحذير ───
    .addSubcommand(sub =>
      sub.setName("تحذير").setDescription("إعطاء تحذير لعضو")
        .addUserOption(o => o.setName("العضو").setDescription("العضو المراد تحذيره").setRequired(true))
        .addStringOption(o => o.setName("السبب").setDescription("سبب التحذير").setRequired(false))
    )

    // ─── تحذيرات ───
    .addSubcommand(sub =>
      sub.setName("تحذيرات").setDescription("عرض تحذيرات عضو محدد أو كل الأعضاء المحذرين")
        .addUserOption(o => o.setName("العضو").setDescription("عضو محدد (اتركه فاضي لعرض الكل)").setRequired(false))
        .addStringOption(o =>
          o.setName("الترتيب").setDescription("طريقة ترتيب النتائج عند عرض الكل").setRequired(false)
            .addChoices(
              { name: "🔴 الأكثر تحذيراً أولاً | Most Warned", value: "desc" },
              { name: "🟢 الأقل تحذيراً أولاً | Least Warned", value: "asc"  },
            )
        )
    )

    // ─── مسح_تحذيرات ───
    .addSubcommand(sub =>
      sub.setName("مسح_تحذيرات").setDescription("مسح تحذير محدد أو جميع تحذيرات عضو")
        .addUserOption(o => o.setName("العضو").setDescription("العضو المراد مسح تحذيراته").setRequired(true))
        .addIntegerOption(o => o.setName("رقم_التحذير").setDescription("رقم التحذير المراد مسحه (اتركه فاضي لمسح الكل)").setRequired(false).setMinValue(1))
        .addStringOption(o => o.setName("السبب").setDescription("سبب مسح التحذيرات (اختياري)").setRequired(false))
    )

    // ─── مسح ───
    .addSubcommand(sub =>
      sub.setName("مسح").setDescription("مسح رسائل من القناة الحالية مع فلاتر متقدمة")
        .addIntegerOption(o => o.setName("العدد").setDescription("عدد الرسائل المراد مسحها (1 - 100)").setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName("العضو").setDescription("مسح رسائل عضو معين فقط (اختياري)").setRequired(false))
        .addStringOption(o =>
          o.setName("الفلتر").setDescription("فلتر نوع الرسائل (اختياري)").setRequired(false)
            .addChoices(
              { name: "🤖 رسائل البوتات فقط",             value: "bots"        },
              { name: "👤 رسائل البشر فقط",                value: "humans"      },
              { name: "🔗 رسائل فيها روابط",               value: "links"       },
              { name: "📎 رسائل فيها مرفقات",              value: "attachments" },
              { name: "📌 رسائل فيها إمبد",                value: "embeds"      },
              { name: "📢 رسائل فيها منشنات",              value: "mentions"    },
            )
        )
        .addStringOption(o => o.setName("السبب").setDescription("سبب المسح (اختياري)").setRequired(false))
    )

    // ─── لقب ───
    .addSubcommand(sub =>
      sub.setName("لقب").setDescription("تغيير أو إزالة لقب عضو في السيرفر")
        .addUserOption(o => o.setName("العضو").setDescription("العضو المراد تغيير لقبه").setRequired(true))
        .addStringOption(o => o.setName("اللقب").setDescription("اللقب الجديد (اتركه فاضي لإزالة اللقب)").setRequired(false).setMaxLength(32))
        .addStringOption(o => o.setName("السبب").setDescription("سبب تغيير اللقب (اختياري)").setRequired(false))
    )

    // ─── بطيء ───
    .addSubcommand(sub =>
      sub.setName("بطيء").setDescription("تفعيل أو تعطيل السلو مود في القناة")
        .addStringOption(o =>
          o.setName("المدة").setDescription("مدة الانتظار بين كل رسالة").setRequired(true)
            .addChoices(
              { name: "❌ إيقاف",           value: "0"   },
              { name: "⏱️ 5 ثواني",        value: "5s"  },
              { name: "⏱️ 10 ثواني",       value: "10s" },
              { name: "⏱️ 15 ثانية",       value: "15s" },
              { name: "⏱️ 30 ثانية",       value: "30s" },
              { name: "🕐 دقيقة",          value: "1m"  },
              { name: "🕐 دقيقتين",        value: "2m"  },
              { name: "🕐 5 دقائق",        value: "5m"  },
              { name: "🕐 10 دقائق",       value: "10m" },
              { name: "🕐 15 دقيقة",       value: "15m" },
              { name: "🕐 30 دقيقة",       value: "30m" },
              { name: "🕑 ساعة",           value: "1h"  },
              { name: "🕑 ساعتين",         value: "2h"  },
              { name: "🕑 6 ساعات (أقصى)", value: "6h"  },
            )
        )
        .addChannelOption(o => o.setName("القناة").setDescription("القناة المراد تعديلها (الحالية إذا ما حددت)").setRequired(false).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum))
        .addStringOption(o => o.setName("السبب").setDescription("سبب تغيير السلو مود (اختياري)").setRequired(false))
    )

    // ─── قفل ───
    .addSubcommand(sub =>
      sub.setName("قفل").setDescription("قفل قناة ومنع الأعضاء من الكتابة فيها")
        .addChannelOption(o => o.setName("القناة").setDescription("القناة المراد قفلها (الحالية إذا ما حددت)").setRequired(false).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum))
        .addStringOption(o => o.setName("السبب").setDescription("سبب قفل القناة (اختياري)").setRequired(false))
    )

    // ─── فتح ───
    .addSubcommand(sub =>
      sub.setName("فتح").setDescription("فتح قناة مقفلة والسماح للأعضاء بالكتابة")
        .addChannelOption(o => o.setName("القناة").setDescription("القناة المراد فتحها (الحالية إذا ما حددت)").setRequired(false).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum))
        .addStringOption(o => o.setName("السبب").setDescription("سبب فتح القناة (اختياري)").setRequired(false))
    )

    // ─── رتبة ───
    .addSubcommand(sub =>
      sub.setName("رتبة").setDescription("إعطاء أو سحب رتبة من عضو أو مجموعة أعضاء")
        .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة المراد إعطاؤها أو سحبها").setRequired(true))
        .addStringOption(o =>
          o.setName("الإجراء").setDescription("إعطاء أو سحب الرتبة").setRequired(true)
            .addChoices(
              { name: "➕ إعطاء الرتبة | Add Role",   value: "add"    },
              { name: "➖ سحب الرتبة | Remove Role",   value: "remove" },
            )
        )
        .addStringOption(o =>
          o.setName("الهدف").setDescription("لمين تبي تعدل الرتبة؟").setRequired(true)
            .addChoices(
              { name: "👤 عضو محدد | Single Member",      value: "single"     },
              { name: "👥 كل الأعضاء البشر | All Humans", value: "all_humans" },
              { name: "🤖 كل البوتات | All Bots",         value: "all_bots"   },
              { name: "🌐 الكل بشر وبوتات | Everyone",    value: "everyone"   },
            )
        )
        .addUserOption(o => o.setName("العضو").setDescription("العضو المحدد (مطلوب فقط إذا اخترت عضو محدد)").setRequired(false))
        .addStringOption(o => o.setName("السبب").setDescription("سبب تعديل الرتبة (اختياري)").setRequired(false))
    ),

  // ════════════════════════════════════════════════════════
  //  EXECUTE
  // ════════════════════════════════════════════════════════

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
    }

    const sub = interaction.options.getSubcommand()

    try {
      switch (sub) {
        case "حظر":           return await handleBan(interaction)
        case "فك_الحظر":      return await handleUnban(interaction)
        case "طرد":           return await handleKick(interaction)
        case "اسكت":          return await handleMute(interaction)
        case "فك_كتم":        return await handleUnmute(interaction)
        case "تحذير":         return await handleWarn(interaction)
        case "تحذيرات":       return await handleWarnings(interaction)
        case "مسح_تحذيرات":  return await handleClearWarns(interaction)
        case "مسح":           return await handleClear(interaction)
        case "لقب":           return await handleNickname(interaction)
        case "بطيء":          return await handleSlowmode(interaction)
        case "قفل":           return await handleLock(interaction)
        case "فتح":           return await handleUnlock(interaction)
        case "رتبة":          return await handleRole(interaction)
      }
    } catch (err) {
      console.error(`[MODERATION/${sub} ERROR]`, err)
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تنفيذ الأمر.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تنفيذ الأمر.", ephemeral: true })
    }
  },
}

// ════════════════════════════════════════════════════════
//  BAN
// ════════════════════════════════════════════════════════

async function handleBan(interaction) {
  const targetUser    = interaction.options.getUser("العضو")
  const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"
  const deleteSeconds = parseInt(interaction.options.getString("حذف_الرسائل") || "0")

  if (targetUser.id === interaction.user.id)
    return interaction.reply({ content: "❌ لا تقدر تحظر نفسك!", ephemeral: true })
  if (targetUser.id === interaction.client.user.id)
    return interaction.reply({ content: "❌ لا تقدر تحظر البوت.", ephemeral: true })

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

  if (member) {
    if (member.id === interaction.guild.ownerId)
      return interaction.reply({ content: "❌ لا تقدر تحظر مالك السيرفر.", ephemeral: true })
    if (interaction.member.roles.highest.position <= member.roles.highest.position)
      return interaction.reply({ content: "❌ لا تقدر تحظر عضو رتبته أعلى منك أو مساوية لك.", ephemeral: true })
    if (!member.bannable)
      return interaction.reply({ content: "❌ البوت ما يقدر يحظر هذا العضو.", ephemeral: true })
  }

  const existingBan = await interaction.guild.bans.fetch(targetUser.id).catch(() => null)
  if (existingBan)
    return interaction.reply({ content: "⚠️ هذا العضو محظور بالفعل.", ephemeral: true })

  let dmSent = false
  if (member) {
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder().setColor(0xef4444).setTitle("🚫 تم حظرك")
            .setDescription(`تم حظرك من سيرفر **${interaction.guild.name}**`)
            .addFields({ name: "📝 السبب", value: reason, inline: true })
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTimestamp()
        ]
      })
      dmSent = true
    } catch {}
  }

  await interaction.guild.members.ban(targetUser, {
    deleteMessageSeconds: deleteSeconds,
    reason: `${reason} | بواسطة: ${interaction.user.username}`,
  })

  const deleteLabels = {
    "0": "ما تم حذف شيء", "3600": "آخر ساعة", "86400": "آخر يوم",
    "259200": "آخر 3 أيام", "604800": "آخر أسبوع",
  }

  const embed = new EmbedBuilder().setColor(0xef4444).setTitle("🚫 تم حظر العضو")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 العضو",          value: `${targetUser} (\`${targetUser.username}\`)`,                    inline: true  },
      { name: "🆔 الآيدي",         value: `\`${targetUser.id}\``,                                          inline: true  },
      { name: "📝 السبب",          value: reason,                                                           inline: false },
      { name: "🗑️ حذف الرسائل",  value: deleteLabels[String(deleteSeconds)] || "لا شيء",                 inline: true  },
      { name: "📩 إشعار خاص",     value: dmSent ? "✅ تم إرسال الإشعار" : "❌ لم يتم الإرسال",            inline: true  },
      { name: "👮 بواسطة",         value: `${interaction.user} (\`${interaction.user.username}\`)`,         inline: false },
    )
    .setFooter({ text: "استخدم /اشراف فك_الحظر لإلغاء الحظر لاحقاً" })
    .setTimestamp()

  discordLog.logBan(interaction.guild, { moderator: interaction.user, target: targetUser, reason, deleteMessages: deleteLabels[String(deleteSeconds)] || "لا شيء" }).catch(() => {})

  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  UNBAN
// ════════════════════════════════════════════════════════

async function handleUnban(interaction) {
  const userId = interaction.options.getString("الآيدي").trim()
  const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  if (!/^\d{17,20}$/.test(userId))
    return interaction.reply({ content: "❌ الآيدي غير صحيح. تأكد إنه رقم صحيح.", ephemeral: true })
  if (userId === interaction.user.id)
    return interaction.reply({ content: "❌ ما تقدر تفك حظر نفسك!", ephemeral: true })

  await interaction.deferReply()

  const banEntry = await interaction.guild.bans.fetch(userId).catch(() => null)
  if (!banEntry) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(0xf59e0b).setTitle("⚠️ العضو غير محظور")
          .setDescription(`ما وجدت أي حظر للآيدي \`${userId}\` في هذا السيرفر.`)
          .setTimestamp()
      ]
    })
  }

  const targetUser = banEntry.user
  const banReason  = banEntry.reason || "لم يتم تحديد سبب عند الحظر"

  await interaction.guild.members.unban(userId, `${reason} | بواسطة: ${interaction.user.username}`)

  let dmSent = false
  try {
    await targetUser.send({
      embeds: [
        new EmbedBuilder().setColor(0x22c55e).setTitle("✅ تم فك حظرك")
          .setDescription(`تم فك حظرك من سيرفر **${interaction.guild.name}**`)
          .addFields({ name: "📝 السبب", value: reason, inline: true })
          .setTimestamp()
      ]
    })
    dmSent = true
  } catch {}

  const embed = new EmbedBuilder().setColor(0x22c55e).setTitle("✅ تم فك الحظر")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 العضو",             value: `${targetUser} (\`${targetUser.username}\`)`,          inline: true  },
      { name: "🆔 الآيدي",           value: `\`${targetUser.id}\``,                                  inline: true  },
      { name: "📝 سبب الحظر السابق", value: banReason,                                               inline: false },
      { name: "📝 سبب فك الحظر",     value: reason,                                                  inline: false },
      { name: "📩 إشعار خاص",        value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال",      inline: true  },
      { name: "👮 بواسطة",           value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  },
    )
    .setFooter({ text: `الآيدي: ${targetUser.id}` }).setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  KICK
// ════════════════════════════════════════════════════════

async function handleKick(interaction) {
  const targetUser = interaction.options.getUser("العضو")
  const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  if (targetUser.id === interaction.user.id)
    return interaction.reply({ content: "❌ لا تقدر تطرد نفسك!", ephemeral: true })
  if (targetUser.id === interaction.client.user.id)
    return interaction.reply({ content: "❌ لا تقدر تطرد البوت.", ephemeral: true })

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
  if (!member) return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })

  if (member.id === interaction.guild.ownerId)
    return interaction.reply({ content: "❌ لا تقدر تطرد مالك السيرفر.", ephemeral: true })
  if (interaction.member.roles.highest.position <= member.roles.highest.position)
    return interaction.reply({ content: "❌ لا تقدر تطرد عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
  if (!member.kickable)
    return interaction.reply({ content: "❌ البوت ما يقدر يطرد هذا العضو.", ephemeral: true })

  let dmSent = false
  try {
    await targetUser.send({
      embeds: [
        new EmbedBuilder().setColor(0xf59e0b).setTitle("👢 تم طردك")
          .setDescription(`تم طردك من سيرفر **${interaction.guild.name}**`)
          .addFields({ name: "📝 السبب", value: reason, inline: true })
          .setTimestamp()
      ]
    })
    dmSent = true
  } catch {}

  await member.kick(`${reason} | بواسطة: ${interaction.user.username}`)

  const embed = new EmbedBuilder().setColor(0xf59e0b).setTitle("👢 تم طرد العضو")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 العضو",    value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
      { name: "🆔 ID",       value: `\`${targetUser.id}\``,                                    inline: true  },
      { name: "📝 السبب",    value: reason,                                                    inline: false },
      { name: "📩 إشعار خاص", value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال",       inline: true  },
      { name: "👮 بواسطة",   value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  },
    )
    .setFooter({ text: `ID: ${targetUser.id}` }).setTimestamp()

  discordLog.logKick(interaction.guild, { moderator: interaction.user, target: targetUser, reason }).catch(() => {})
  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  MUTE
// ════════════════════════════════════════════════════════

async function handleMute(interaction) {
  const targetUser = interaction.options.getUser("العضو")
  const duration   = interaction.options.getInteger("المدة")
  const unit       = interaction.options.getString("الوحدة")
  const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  if (targetUser.id === interaction.user.id)
    return interaction.reply({ content: "❌ لا تقدر تكتم نفسك!", ephemeral: true })
  if (targetUser.id === interaction.client.user.id)
    return interaction.reply({ content: "❌ لا تقدر تكتم البوت.", ephemeral: true })

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
  if (!member) return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })

  if (member.id === interaction.guild.ownerId)
    return interaction.reply({ content: "❌ لا تقدر تكتم مالك السيرفر.", ephemeral: true })
  if (interaction.member.roles.highest.position <= member.roles.highest.position)
    return interaction.reply({ content: "❌ لا تقدر تكتم عضو رتبته أعلى منك أو تساويك.", ephemeral: true })
  if (!member.moderatable)
    return interaction.reply({ content: "❌ البوت ما يقدر يكتم هذا العضو.", ephemeral: true })

  if (member.isCommunicationDisabled()) {
    const ts = Math.floor(member.communicationDisabledUntil.getTime() / 1000)
    return interaction.reply({ content: `⚠️ هذا العضو مكتوم بالفعل.\n⏰ ينتهي: <t:${ts}:R>`, ephemeral: true })
  }

  const multiplier = TIME_UNITS[unit]
  const totalMs    = duration * multiplier

  if (totalMs > MAX_TIMEOUT)
    return interaction.reply({ content: `❌ الحد الأقصى للكتم هو **28 يوم**`, ephemeral: true })
  if (totalMs < 1000)
    return interaction.reply({ content: "❌ الحد الأدنى للكتم هو **1 ثانية**.", ephemeral: true })

  const expiresTs  = Math.floor((Date.now() + totalMs) / 1000)
  const durationTx = `${duration} ${getUnitLabel(unit, duration)}`

  let dmSent = false
  try {
    await targetUser.send({
      embeds: [
        new EmbedBuilder().setColor(0xf59e0b).setTitle("🔇 تم كتمك")
          .setDescription(`تم كتمك في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "⏱ المدة", value: durationTx, inline: true },
            { name: "📝 السبب", value: reason, inline: true },
            { name: "⏰ ينتهي الكتم", value: `<t:${expiresTs}:R>`, inline: false },
          ).setTimestamp()
      ]
    })
    dmSent = true
  } catch {}

  await member.timeout(totalMs, `${reason} | بواسطة: ${interaction.user.username}`)

  const embed = new EmbedBuilder().setColor(0xf59e0b).setTitle("🔇 تم كتم العضو")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 العضو",          value: `${targetUser} (\`${targetUser.username}\`)`,               inline: true  },
      { name: "⏱ المدة",           value: durationTx,                                                 inline: true  },
      { name: "🕐 المدة الفعلية",  value: formatMuteDuration(totalMs),                                inline: true  },
      { name: "📝 السبب",          value: reason,                                                     inline: false },
      { name: "⏰ ينتهي الكتم",    value: `<t:${expiresTs}:R> — <t:${expiresTs}:F>`,                 inline: false },
      { name: "👮 بواسطة",         value: `${interaction.user} (\`${interaction.user.username}\`)`,   inline: true  },
      { name: "📩 إشعار خاص",     value: dmSent ? "✅ تم إرسال إشعار" : "❌ العضو مقفل الخاص",       inline: true  },
    )
    .setFooter({ text: `ID: ${targetUser.id}` }).setTimestamp()

  discordLog.logMute(interaction.guild, { moderator: interaction.user, target: targetUser, reason, duration: durationTx }).catch(() => {})
  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  UNMUTE
// ════════════════════════════════════════════════════════

async function handleUnmute(interaction) {
  const targetUser = interaction.options.getUser("العضو")
  const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
  if (!member) return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
  if (!member.moderatable) return interaction.reply({ content: "❌ البوت ما يقدر يعدل على هذا العضو.", ephemeral: true })
  if (!member.isCommunicationDisabled()) return interaction.reply({ content: "⚠️ هذا العضو غير مكتوم أصلاً.", ephemeral: true })

  const oldTs = Math.floor(member.communicationDisabledUntil.getTime() / 1000)
  await member.timeout(null, `${reason} | بواسطة: ${interaction.user.username}`)

  const embed = new EmbedBuilder().setColor(0x22c55e).setTitle("🔊 تم فك كتم العضو")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 العضو",          value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
      { name: "📝 السبب",          value: reason,                                                   inline: true  },
      { name: "⏰ كان مكتوم حتى", value: `<t:${oldTs}:F>`,                                         inline: false },
      { name: "👮 بواسطة",         value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  },
    )
    .setFooter({ text: `الآيدي: ${targetUser.id}` }).setTimestamp()

  discordLog.logUnmute(interaction.guild, { moderator: interaction.user, target: targetUser, reason }).catch(() => {})
  await interaction.reply({ embeds: [embed] })

  try {
    await targetUser.send({
      embeds: [
        new EmbedBuilder().setColor(0x22c55e).setTitle("🔊 تم فك كتمك")
          .setDescription(`تم فك كتمك في سيرفر **${interaction.guild.name}**`)
          .addFields({ name: "📝 السبب", value: reason, inline: true }).setTimestamp()
      ]
    })
  } catch {}
}

// ════════════════════════════════════════════════════════
//  WARN
// ════════════════════════════════════════════════════════

async function handleWarn(interaction) {
  const targetUser = interaction.options.getUser("العضو")
  const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  if (targetUser.id === interaction.user.id)
    return interaction.reply({ content: "❌ لا تقدر تحذر نفسك!", ephemeral: true })
  if (targetUser.id === interaction.client.user.id)
    return interaction.reply({ content: "❌ لا تقدر تحذر البوت.", ephemeral: true })

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
  if (!member) return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
  if (member.id === interaction.guild.ownerId)
    return interaction.reply({ content: "❌ لا تقدر تحذر مالك السيرفر.", ephemeral: true })
  if (interaction.member.roles.highest.position <= member.roles.highest.position)
    return interaction.reply({ content: "❌ لا تقدر تحذر عضو رتبته أعلى منك.", ephemeral: true })

  await warningSystem.addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason)

  const allWarnings   = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)
  const total         = allWarnings?.length || 1
  const color         = total >= 5 ? 0xef4444 : total >= 3 ? 0xf59e0b : 0x3b82f6
  const severityLabel = total >= 5 ? "🔴 خطير" : total >= 3 ? "🟡 متوسط" : "🟢 عادي"

  let dmSent = false
  try {
    await targetUser.send({
      embeds: [
        new EmbedBuilder().setColor(color).setTitle("⚠️ تلقيت تحذيراً")
          .setDescription(`تلقيت تحذيراً في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "📝 السبب", value: reason, inline: true },
            { name: "📊 إجمالي تحذيراتك", value: `${total}`, inline: true },
          ).setTimestamp()
      ]
    })
    dmSent = true
  } catch {}

  const embed = new EmbedBuilder().setColor(color).setTitle("⚠️ تم تحذير العضو")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 العضو",             value: `${targetUser} (\`${targetUser.username}\`)`,       inline: true  },
      { name: "🆔 ID",               value: `\`${targetUser.id}\``,                              inline: true  },
      { name: "⚡ مستوى الخطورة",    value: severityLabel,                                       inline: true  },
      { name: "📝 السبب",             value: reason,                                              inline: false },
      { name: "📊 إجمالي التحذيرات", value: `${total} تحذير`,                                   inline: true  },
      { name: "📩 إشعار خاص",        value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال",  inline: true  },
      { name: "👮 بواسطة",            value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false },
    )
    .setFooter({ text: `ID: ${targetUser.id}` }).setTimestamp()

  discordLog.logWarn(interaction.guild, { moderator: interaction.user, target: targetUser, reason, totalWarnings: total }).catch(() => {})
  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  WARNINGS
// ════════════════════════════════════════════════════════

async function handleWarnings(interaction) {
  const targetUser = interaction.options.getUser("العضو")
  const sortOrder  = interaction.options.getString("الترتيب") || "desc"

  // ─── عضو محدد ───
  if (targetUser) {
    const warnings = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)
    if (!warnings || warnings.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor(0x22c55e).setTitle("✅ سجل نظيف")
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
            .setDescription(`${targetUser} ما عنده أي تحذيرات في هذا السيرفر.`)
            .setFooter({ text: `الآيدي: ${targetUser.id}` }).setTimestamp()
        ]
      })
    }

    const color    = warnings.length >= 5 ? 0xef4444 : warnings.length >= 3 ? 0xf59e0b : 0x3b82f6
    const severity = warnings.length >= 5 ? "🔴 خطير" : warnings.length >= 3 ? "🟡 متوسط" : "🟢 عادي"

    let warningList = ""
    for (let i = 0; i < warnings.length; i++) {
      const w    = warnings[i]
      const date = w.created_at ? new Date(w.created_at).toLocaleDateString("ar-SA") : "غير معروف"
      const mod  = w.moderator_id ? `<@${w.moderator_id}>` : "غير معروف"
      warningList += `**${i + 1}.** ${w.reason || "بدون سبب"}\n   📅 ${date} — 👮 ${mod}\n\n`
    }
    if (warningList.length > 1024) warningList = warningList.slice(0, 1000) + "\n... وغيرها"

    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(color).setTitle(`⚠️ تحذيرات ${targetUser.username}`)
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "👤 العضو",          value: `${targetUser} (\`${targetUser.username}\`)`, inline: true  },
            { name: "📊 المجموع",        value: `**${warnings.length}** تحذير`,               inline: true  },
            { name: "⚡ مستوى الخطورة", value: severity,                                      inline: true  },
            { name: "📋 السجل",          value: warningList,                                  inline: false },
          )
          .setFooter({ text: `الآيدي: ${targetUser.id}` }).setTimestamp()
      ]
    })
  }

  // ─── كل السيرفر ───
  await interaction.deferReply()
  const allWarnings = await warningSystem.getAllWarnings(interaction.guild.id)

  if (!allWarnings || allWarnings.length === 0) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(0x22c55e).setTitle("✅ السيرفر نظيف")
          .setDescription("ما فيه أي عضو عنده تحذيرات في هذا السيرفر.").setTimestamp()
      ]
    })
  }

  const grouped = {}
  for (const w of allWarnings) {
    if (!grouped[w.user_id]) grouped[w.user_id] = []
    grouped[w.user_id].push(w)
  }

  let entries = Object.entries(grouped)
  entries = sortOrder === "desc"
    ? entries.sort((a, b) => b[1].length - a[1].length)
    : entries.sort((a, b) => a[1].length - b[1].length)

  const total     = allWarnings.length
  const totalMem  = entries.length
  const dangerous = entries.filter(([, w]) => w.length >= 5).length
  const medium    = entries.filter(([, w]) => w.length >= 3 && w.length < 5).length
  const normal    = entries.filter(([, w]) => w.length < 3).length

  let membersList = ""
  for (const [userId, warns] of entries.slice(0, 15)) {
    const count  = warns.length
    const icon   = count >= 5 ? "🔴" : count >= 3 ? "🟡" : "🟢"
    const latest = warns[warns.length - 1]
    const date   = latest?.created_at ? new Date(latest.created_at).toLocaleDateString("ar-SA") : "غير معروف"
    membersList += `${icon} <@${userId}> — **${count}** تحذير | آخر تحذير: ${date}\n`
  }
  if (entries.length > 15) membersList += `\n... و **${entries.length - 15}** عضو آخر`

  const overallColor = dangerous > 0 ? 0xef4444 : medium > 0 ? 0xf59e0b : 0x3b82f6

  return interaction.editReply({
    embeds: [
      new EmbedBuilder().setColor(overallColor).setTitle("📋 سجل التحذيرات — كل السيرفر")
        .setDescription(membersList)
        .addFields(
          { name: "👥 إجمالي المحذرين",   value: `**${totalMem}** عضو`,    inline: true },
          { name: "⚠️ إجمالي التحذيرات", value: `**${total}** تحذير`,      inline: true },
          { name: "📊 الترتيب",           value: sortOrder === "desc" ? "🔴 الأكثر أولاً" : "🟢 الأقل أولاً", inline: true },
          { name: "📈 توزيع الخطورة",     value: `🔴 خطير (5+): **${dangerous}**\n🟡 متوسط (3-4): **${medium}**\n🟢 عادي (1-2): **${normal}**`, inline: false },
        )
        .setFooter({ text: `${interaction.guild.name}` }).setTimestamp()
    ]
  })
}

// ════════════════════════════════════════════════════════
//  CLEAR WARNINGS
// ════════════════════════════════════════════════════════

async function handleClearWarns(interaction) {
  const targetUser    = interaction.options.getUser("العضو")
  const warningNumber = interaction.options.getInteger("رقم_التحذير")
  const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  const warnings = await warningSystem.getWarnings(interaction.guild.id, targetUser.id)
  const count    = warnings?.length || 0

  if (count === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(0x22c55e).setTitle("✅ سجل نظيف")
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .setDescription(`${targetUser} ما عنده أي تحذيرات أصلاً.`)
          .setFooter({ text: `ID: ${targetUser.id}` }).setTimestamp()
      ],
      ephemeral: true
    })
  }

  if (warningNumber !== null) {
    if (warningNumber > count)
      return interaction.reply({ content: `❌ رقم التحذير غير صحيح. ${targetUser.username} عنده **${count}** تحذير فقط.`, ephemeral: true })

    const toDelete = warnings[warningNumber - 1]
    if (!toDelete?.id)
      return interaction.reply({ content: "❌ ما قدرت أحدد التحذير. حاول مرة ثانية.", ephemeral: true })

    await warningSystem.deleteWarning(toDelete.id)
    const date = toDelete.created_at ? new Date(toDelete.created_at).toLocaleDateString("ar-SA") : "غير معروف"

    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(0x3b82f6).setTitle("🗑️ تم مسح التحذير")
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "👤 العضو",               value: `${targetUser} (\`${targetUser.username}\`)`, inline: true  },
            { name: "🔢 رقم التحذير",         value: `#${warningNumber} من ${count}`,             inline: true  },
            { name: "📝 محتوى التحذير",       value: toDelete.reason || "بدون سبب",               inline: false },
            { name: "📅 تاريخ التحذير",       value: date,                                         inline: true  },
            { name: "📊 التحذيرات المتبقية",  value: `**${count - 1}** تحذير`,                    inline: true  },
            { name: "👮 بواسطة",              value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false },
          ).setTimestamp()
      ]
    })
  }

  await warningSystem.clearWarnings(interaction.guild.id, targetUser.id)

  let dmSent = false
  try {
    await targetUser.send({
      embeds: [
        new EmbedBuilder().setColor(0x22c55e).setTitle("🧹 تم مسح تحذيراتك")
          .setDescription(`تم مسح جميع تحذيراتك في سيرفر **${interaction.guild.name}**`)
          .addFields(
            { name: "📊 عدد التحذيرات المحذوفة", value: `**${count}** تحذير`, inline: true },
            { name: "📝 السبب", value: reason, inline: true },
          ).setTimestamp()
      ]
    })
    dmSent = true
  } catch {}

  return interaction.reply({
    embeds: [
      new EmbedBuilder().setColor(0x22c55e).setTitle("🧹 تم مسح جميع التحذيرات")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: "👤 العضو",                  value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
          { name: "📊 عدد التحذيرات المحذوفة", value: `**${count}** تحذير`,                                    inline: true  },
          { name: "📝 السبب",                  value: reason,                                                   inline: false },
          { name: "📩 إشعار خاص",             value: dmSent ? "✅ تم إرسال إشعار" : "❌ ما تم الإرسال",        inline: true  },
          { name: "👮 بواسطة",                 value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  },
        )
        .setFooter({ text: "سجل العضو الآن نظيف" }).setTimestamp()
    ]
  })
}

// ════════════════════════════════════════════════════════
//  CLEAR MESSAGES
// ════════════════════════════════════════════════════════

async function handleClear(interaction) {
  const amount     = interaction.options.getInteger("العدد")
  const targetUser = interaction.options.getUser("العضو")
  const filter     = interaction.options.getString("الفلتر")
  const reason     = interaction.options.getString("السبب") || "بدون سبب"
  const MAX_AGE    = 14 * 24 * 60 * 60 * 1000

  if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages))
    return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة الرسائل** في هذي القناة.", ephemeral: true })

  await interaction.deferReply({ ephemeral: true })

  let fetched
  try {
    fetched = await interaction.channel.messages.fetch({ limit: 100 })
  } catch {
    return interaction.editReply({ content: "❌ ما قدرت أجلب الرسائل من القناة." })
  }

  const now  = Date.now()
  let filtered = fetched.filter(msg => (now - msg.createdTimestamp) < MAX_AGE)

  if (targetUser)              filtered = filtered.filter(msg => msg.author.id === targetUser.id)
  if (filter === "bots")       filtered = filtered.filter(msg => msg.author.bot)
  if (filter === "humans")     filtered = filtered.filter(msg => !msg.author.bot)
  if (filter === "links")      filtered = filtered.filter(msg => /https?:\/\/[^\s]+/i.test(msg.content))
  if (filter === "attachments") filtered = filtered.filter(msg => msg.attachments.size > 0)
  if (filter === "embeds")     filtered = filtered.filter(msg => msg.embeds.length > 0)
  if (filter === "mentions")   filtered = filtered.filter(msg => msg.mentions.users.size > 0 || msg.mentions.roles.size > 0 || msg.mentions.everyone)

  const toDelete = [...filtered.values()].slice(0, amount)
  if (toDelete.length === 0)
    return interaction.editReply({ content: "⚠️ ما لقيت رسائل تطابق الفلتر أو كلها أقدم من 14 يوم." })

  let deleted
  try {
    deleted = await interaction.channel.bulkDelete(toDelete, true)
  } catch {
    return interaction.editReply({ content: "❌ فشل حذف الرسائل. تأكد إن الرسائل ما تكون أقدم من 14 يوم." })
  }

  const del = [...deleted.values()]
  const embed = new EmbedBuilder().setColor(0x22c55e).setTitle("🗑️ تم مسح الرسائل")
    .addFields(
      { name: "📊 الإجمالي", value: `**${deleted.size}** رسالة`, inline: true },
      { name: "👤 بشر",      value: `${del.filter(m => m.author && !m.author.bot).length}`, inline: true },
      { name: "🤖 بوتات",    value: `${del.filter(m => m.author?.bot).length}`, inline: true },
      { name: "📝 السبب",    value: reason, inline: false },
      { name: "👮 بواسطة",   value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true },
      { name: "📍 القناة",   value: `${interaction.channel}`, inline: true },
    )
    .setFooter({ text: "هذه الرسالة تختفي بعد 6 ثواني" }).setTimestamp()

  discordLog.logClear(interaction.guild, { moderator: interaction.user, channel: interaction.channel, count: deleted.size, filter }).catch(() => {})
  await interaction.editReply({ embeds: [embed] })

  try {
    const pub = await interaction.channel.send({
      embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription(`🗑️ **${interaction.user.username}** مسح **${deleted.size}** رسالة.`)]
    })
    setTimeout(() => pub.delete().catch(() => {}), 6000)
  } catch {}
}

// ════════════════════════════════════════════════════════
//  NICKNAME
// ════════════════════════════════════════════════════════

async function handleNickname(interaction) {
  const targetUser  = interaction.options.getUser("العضو")
  const newNickname = interaction.options.getString("اللقب") || null
  const reason      = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
  if (!member) return interaction.reply({ content: "❌ ما قدرت أجد هذا العضو.", ephemeral: true })

  if (member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId)
    return interaction.reply({ content: "❌ لا تقدر تغير لقب مالك السيرفر.", ephemeral: true })

  if (targetUser.id !== interaction.user.id && interaction.member.roles.highest.position <= member.roles.highest.position)
    return interaction.reply({ content: "❌ لا تقدر تغير لقب عضو رتبته أعلى منك.", ephemeral: true })

  if (!member.manageable)
    return interaction.reply({ content: "❌ البوت ما يقدر يغير لقب هذا العضو.", ephemeral: true })

  if (newNickname && newNickname === member.nickname)
    return interaction.reply({ content: "⚠️ هذا اللقب هو نفسه اللقب الحالي!", ephemeral: true })

  const oldNickname = member.nickname || member.user.username
  const isRemoving  = newNickname === null

  await member.setNickname(newNickname, `${reason} | بواسطة: ${interaction.user.username}`)

  const embed = new EmbedBuilder()
    .setColor(isRemoving ? 0xf59e0b : 0x3b82f6)
    .setTitle(isRemoving ? "📝 تم إزالة لقب العضو" : "📝 تم تغيير لقب العضو")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 العضو",        value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
      { name: "🏷️ اللقب القديم", value: `\`${oldNickname}\``,                                    inline: true  },
      { name: isRemoving ? "🔄 الاسم الحالي" : "🆕 اللقب الجديد", value: isRemoving ? `\`${targetUser.username}\`` : `\`${newNickname}\``, inline: true  },
      { name: "📝 السبب",        value: reason,                                                   inline: false },
      { name: "👮 بواسطة",       value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  },
    )
    .setFooter({ text: `الآيدي: ${targetUser.id}` }).setTimestamp()

  discordLog.logNickname(interaction.guild, { moderator: interaction.user, target: targetUser, oldNick: member.nickname || null, newNick: newNickname }).catch(() => {})
  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  SLOWMODE
// ════════════════════════════════════════════════════════

async function handleSlowmode(interaction) {
  const durationKey   = interaction.options.getString("المدة")
  const targetChannel = interaction.options.getChannel("القناة") || interaction.channel
  const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"
  const seconds       = SLOWMODE_MAP[durationKey]

  if (!targetChannel.isTextBased() || targetChannel.isVoiceBased())
    return interaction.reply({ content: "❌ السلو مود يشتغل على القنوات النصية فقط.", ephemeral: true })

  if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels))
    return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة القنوات** في هذي القناة.", ephemeral: true })

  const oldSlowmode = targetChannel.rateLimitPerUser || 0
  const isDisabling = seconds === 0

  if (oldSlowmode === seconds)
    return interaction.reply({ content: isDisabling ? "⚠️ السلو مود مغلق أصلاً." : `⚠️ السلو مود بالفعل **${formatSlowmode(seconds)}**.`, ephemeral: true })

  await targetChannel.setRateLimitPerUser(seconds, `${reason} | بواسطة: ${interaction.user.username}`)

  const embed = new EmbedBuilder()
    .setColor(isDisabling ? 0x22c55e : 0xf59e0b)
    .setTitle(isDisabling ? "⚡ تم إيقاف السلو مود" : "🐌 تم تفعيل السلو مود")
    .addFields(
      { name: "📍 القناة",  value: `${targetChannel}`,                                         inline: true },
      { name: "🕐 كان",     value: formatSlowmode(oldSlowmode),                                 inline: true },
      { name: "🆕 الآن",    value: isDisabling ? "مغلق" : formatSlowmode(seconds),             inline: true },
      { name: "📝 السبب",   value: reason,                                                      inline: false },
      { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,    inline: true },
    )
    .setTimestamp()

  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  LOCK
// ════════════════════════════════════════════════════════

async function handleLock(interaction) {
  const targetChannel = interaction.options.getChannel("القناة") || interaction.channel
  const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels))
    return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة القنوات** في هذي القناة.", ephemeral: true })

  const everyoneRole = interaction.guild.roles.everyone
  const currentPerms = targetChannel.permissionOverwrites.cache.get(everyoneRole.id)
  if (currentPerms?.deny?.has(PermissionFlagsBits.SendMessages))
    return interaction.reply({ content: "⚠️ هذي القناة مقفلة بالفعل.", ephemeral: true })

  await targetChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: false }, { reason: `${reason} | بواسطة: ${interaction.user.username}` })

  const embed = new EmbedBuilder().setColor(0xef4444).setTitle("🔒 تم قفل القناة")
    .addFields(
      { name: "📢 القناة",  value: `${targetChannel}`,                                          inline: true  },
      { name: "📝 السبب",   value: reason,                                                       inline: false },
      { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,     inline: true  },
    )
    .setFooter({ text: "استخدم /اشراف فتح لفتح القناة مجدداً" }).setTimestamp()

  discordLog.logLock(interaction.guild, { moderator: interaction.user, channel: targetChannel, reason }).catch(() => {})
  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  UNLOCK
// ════════════════════════════════════════════════════════

async function handleUnlock(interaction) {
  const targetChannel = interaction.options.getChannel("القناة") || interaction.channel
  const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels))
    return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة القنوات** في هذي القناة.", ephemeral: true })

  const everyoneRole = interaction.guild.roles.everyone
  const currentPerms = targetChannel.permissionOverwrites.cache.get(everyoneRole.id)
  const isLocked     = currentPerms?.deny?.has(PermissionFlagsBits.SendMessages)

  if (!isLocked)
    return interaction.reply({ content: "⚠️ هذي القناة مفتوحة أصلاً وليست مقفلة.", ephemeral: true })

  await targetChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: null }, { reason: `${reason} | بواسطة: ${interaction.user.username}` })

  const embed = new EmbedBuilder().setColor(0x22c55e).setTitle("🔓 تم فتح القناة")
    .addFields(
      { name: "📢 القناة",  value: `${targetChannel}`,                                          inline: true  },
      { name: "📝 السبب",   value: reason,                                                       inline: false },
      { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,     inline: true  },
    )
    .setFooter({ text: "استخدم /اشراف قفل لقفل القناة مجدداً" }).setTimestamp()

  discordLog.logUnlock(interaction.guild, { moderator: interaction.user, channel: targetChannel, reason }).catch(() => {})
  return interaction.reply({ embeds: [embed] })
}

// ════════════════════════════════════════════════════════
//  ROLE
// ════════════════════════════════════════════════════════

async function handleRole(interaction) {
  const role       = interaction.options.getRole("الرتبة")
  const action     = interaction.options.getString("الإجراء")
  const target     = interaction.options.getString("الهدف")
  const targetUser = interaction.options.getUser("العضو")
  const reason     = interaction.options.getString("السبب") || "لم يتم تحديد سبب"
  const isAdding   = action === "add"
  const actionText = isAdding ? "إعطاء" : "سحب"

  if (role.id === interaction.guild.id)
    return interaction.reply({ content: "❌ ما تقدر تعدل رتبة @everyone.", ephemeral: true })
  if (role.managed)
    return interaction.reply({ content: "❌ هذي رتبة مُدارة (تابعة لبوت) وما تقدر تتحكم فيها.", ephemeral: true })
  if (role.position >= interaction.guild.members.me.roles.highest.position)
    return interaction.reply({ content: "❌ رتبة البوت أقل من أو تساوي هذي الرتبة.", ephemeral: true })
  if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId)
    return interaction.reply({ content: "❌ ما تقدر تعدل رتبة أعلى منك أو تساويك.", ephemeral: true })

  // ─── عضو محدد ───
  if (target === "single") {
    if (!targetUser)
      return interaction.reply({ content: "❌ لازم تحدد العضو لما تختار **عضو محدد**.", ephemeral: true })

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
    if (!member) return interaction.reply({ content: "❌ ما قدرت أجد هذا العضو.", ephemeral: true })

    const hasRole = member.roles.cache.has(role.id)
    if (isAdding && hasRole)   return interaction.reply({ content: `⚠️ ${targetUser} يملك رتبة ${role} بالفعل.`, ephemeral: true })
    if (!isAdding && !hasRole) return interaction.reply({ content: `⚠️ ${targetUser} لا يملك رتبة ${role} أصلاً.`, ephemeral: true })

    if (isAdding) await member.roles.add(role, `${reason} | بواسطة: ${interaction.user.username}`)
    else          await member.roles.remove(role, `${reason} | بواسطة: ${interaction.user.username}`)

    const embed = new EmbedBuilder()
      .setColor(isAdding ? 0x22c55e : 0xef4444)
      .setTitle(isAdding ? "➕ تم إعطاء الرتبة" : "➖ تم سحب الرتبة")
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
      .addFields(
        { name: "👤 العضو",      value: `${targetUser} (\`${targetUser.username}\`)`,             inline: true  },
        { name: "🏷️ الرتبة",    value: `${role}`,                                                inline: true  },
        { name: "🎨 لون الرتبة", value: role.hexColor,                                            inline: true  },
        { name: "📝 السبب",      value: reason,                                                    inline: false },
        { name: "👮 بواسطة",     value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true  },
      )
      .setFooter({ text: `آيدي العضو: ${targetUser.id}` }).setTimestamp()

    if (isAdding) discordLog.logRoleAdd(interaction.guild, { moderator: interaction.user, target: targetUser, role }).catch(() => {})
    else          discordLog.logRoleRemove(interaction.guild, { moderator: interaction.user, target: targetUser, role }).catch(() => {})

    return interaction.reply({ embeds: [embed] })
  }

  // ─── جماعي ───
  await interaction.deferReply()
  await interaction.guild.members.fetch()

  let targetMembers = interaction.guild.members.cache

  if (target === "all_humans") targetMembers = targetMembers.filter(m => !m.user.bot)
  else if (target === "all_bots") targetMembers = targetMembers.filter(m => m.user.bot)

  targetMembers = isAdding
    ? targetMembers.filter(m => !m.roles.cache.has(role.id))
    : targetMembers.filter(m => m.roles.cache.has(role.id))

  const totalMembers  = targetMembers.size
  const targetLabels  = { all_humans: "كل الأعضاء (البشر)", all_bots: "كل البوتات", everyone: "الكل (بشر + بوتات)" }

  if (totalMembers === 0) {
    const msg = isAdding ? `⚠️ كل الأعضاء يملكون رتبة ${role} بالفعل.` : `⚠️ لا أحد يملك رتبة ${role} أصلاً.`
    return interaction.editReply({ content: msg })
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder().setColor(0xf59e0b).setTitle(`⏳ جاري ${actionText} الرتبة...`)
        .setDescription(`🎯 الهدف: **${targetLabels[target]}**\n🏷️ الرتبة: ${role}\n👥 العدد: **${totalMembers}** عضو`)
        .setTimestamp()
    ]
  })

  let success = 0, failed = 0
  const members = [...targetMembers.values()]

  for (const member of members) {
    try {
      if (isAdding) await member.roles.add(role, `${reason} | جماعي بواسطة: ${interaction.user.username}`)
      else          await member.roles.remove(role, `${reason} | جماعي بواسطة: ${interaction.user.username}`)
      success++
    } catch { failed++ }
    if (success % 5 === 0) await new Promise(r => setTimeout(r, 300))
  }

  const resultEmbed = new EmbedBuilder()
    .setColor(isAdding ? 0x22c55e : 0xef4444)
    .setTitle(isAdding ? "➕ تم إعطاء الرتبة (جماعي)" : "➖ تم سحب الرتبة (جماعي)")
    .addFields(
      { name: "🏷️ الرتبة",  value: `${role}`,                inline: true  },
      { name: "🎯 الهدف",    value: targetLabels[target],      inline: true  },
      { name: "✅ نجح",      value: `**${success}** عضو`,      inline: true  },
      { name: "❌ فشل",      value: `**${failed}** عضو`,       inline: true  },
      { name: "📊 الإجمالي", value: `**${totalMembers}** عضو`, inline: true  },
      { name: "📝 السبب",    value: reason,                    inline: false },
      { name: "👮 بواسطة",   value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true },
    )
    .setFooter({ text: `آيدي الرتبة: ${role.id}` }).setTimestamp()

  return interaction.editReply({ embeds: [resultEmbed] })
}
