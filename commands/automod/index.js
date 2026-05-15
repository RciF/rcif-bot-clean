// ══════════════════════════════════════════════════════════════════
//  /إشراف — نظام AutoMod الكامل
//  المسار: commands/automod/index.js
//
//  Subcommands:
//   - حالة     : عرض الإعدادات الحالية
//   - تفعيل    : تشغيل/إيقاف النظام كاملاً
//   - فلتر     : تفعيل/إيقاف فلتر معيّن
//   - كلمة     : إضافة/حذف كلمة من القائمة المخصصة
//   - استثناء  : إضافة/حذف رتبة من الـ whitelist
//   - لوق      : تعيين قناة اللوق
//   - سجل      : عرض آخر المخالفات
// ══════════════════════════════════════════════════════════════════

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js")

const automodSystem = require("../../systems/automodSystem")
const databaseSystem = require("../../systems/databaseSystem")
const { COLORS, FILTER_LABELS, FILTER_KEYS } = require("./_shared")

// ══════════════════════════════════════════════════════════════════
//  COMMAND DATA
// ══════════════════════════════════════════════════════════════════

const FILTER_CHOICES = FILTER_KEYS.map(key => ({
  name: FILTER_LABELS[key].replace(/^[^\s]+\s/, ""), // شيل الإيموجي من البداية
  value: key
}))

module.exports = {
  data: new SlashCommandBuilder()
    .setName("إشراف")
    .setDescription("نظام الإشراف التلقائي (AutoMod)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    // ── حالة ──
    .addSubcommand(sub =>
      sub.setName("حالة")
        .setDescription("عرض إعدادات AutoMod الحالية")
    )

    // ── تفعيل ──
    .addSubcommand(sub =>
      sub.setName("تفعيل")
        .setDescription("تشغيل أو إيقاف النظام كاملاً")
        .addStringOption(o =>
          o.setName("الحالة")
            .setDescription("تشغيل أو إيقاف")
            .setRequired(true)
            .addChoices(
              { name: "✅ تشغيل", value: "on" },
              { name: "❌ إيقاف", value: "off" }
            )
        )
    )

    // ── فلتر ──
    .addSubcommand(sub =>
      sub.setName("فلتر")
        .setDescription("تفعيل أو إيقاف فلتر معيّن")
        .addStringOption(o =>
          o.setName("النوع")
            .setDescription("الفلتر المطلوب")
            .setRequired(true)
            .addChoices(...FILTER_CHOICES)
        )
        .addStringOption(o =>
          o.setName("الحالة")
            .setDescription("تشغيل أو إيقاف")
            .setRequired(true)
            .addChoices(
              { name: "✅ تشغيل", value: "on" },
              { name: "❌ إيقاف", value: "off" }
            )
        )
    )

    // ── كلمة ──
    .addSubcommand(sub =>
      sub.setName("كلمة")
        .setDescription("إضافة أو حذف كلمة من القائمة المحظورة")
        .addStringOption(o =>
          o.setName("الإجراء")
            .setDescription("إضافة أو حذف")
            .setRequired(true)
            .addChoices(
              { name: "➕ إضافة", value: "add" },
              { name: "➖ حذف", value: "remove" }
            )
        )
        .addStringOption(o =>
          o.setName("الكلمة")
            .setDescription("الكلمة")
            .setRequired(true)
            .setMaxLength(100)
        )
    )

    // ── استثناء ──
    .addSubcommand(sub =>
      sub.setName("استثناء")
        .setDescription("إضافة أو حذف رتبة/قناة من الاستثناءات")
        .addStringOption(o =>
          o.setName("الإجراء")
            .setDescription("إضافة أو حذف")
            .setRequired(true)
            .addChoices(
              { name: "➕ إضافة", value: "add" },
              { name: "➖ حذف", value: "remove" }
            )
        )
        .addRoleOption(o =>
          o.setName("الرتبة")
            .setDescription("الرتبة المستثناة")
            .setRequired(false)
        )
        .addChannelOption(o =>
          o.setName("القناة")
            .setDescription("القناة المستثناة")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )

    // ── لوق ──
    .addSubcommand(sub =>
      sub.setName("لوق")
        .setDescription("تعيين قناة سجل المخالفات")
        .addChannelOption(o =>
          o.setName("القناة")
            .setDescription("القناة (اتركها فاضية للإلغاء)")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )

    // ── سجل ──
    .addSubcommand(sub =>
      sub.setName("سجل")
        .setDescription("عرض آخر المخالفات")
        .addUserOption(o =>
          o.setName("العضو")
            .setDescription("فلترة حسب عضو معيّن")
            .setRequired(false)
        )
    ),

  helpMeta: {
    category: "automod",
    description: "نظام الإشراف التلقائي",
    requirements: {
      userPermissions: ["ManageGuild"],
      subscriptionTier: "silver"
    },
    examples: [
      "/إشراف حالة",
      "/إشراف تفعيل الحالة:on",
      "/إشراف فلتر النوع:bad_words الحالة:on",
      "/إشراف كلمة الإجراء:add الكلمة:كلمة_سيئة",
      "/إشراف استثناء الإجراء:add الرتبة:@VIP",
      "/إشراف لوق القناة:#automod-log",
      "/إشراف سجل"
    ]
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand()
    const guildId = interaction.guild.id

    try {
      if (sub === "حالة")    return await handleStatus(interaction, guildId)
      if (sub === "تفعيل")   return await handleEnable(interaction, guildId)
      if (sub === "فلتر")    return await handleFilter(interaction, guildId)
      if (sub === "كلمة")    return await handleWord(interaction, guildId)
      if (sub === "استثناء") return await handleWhitelist(interaction, guildId)
      if (sub === "لوق")     return await handleLog(interaction, guildId)
      if (sub === "سجل")     return await handleHistory(interaction, guildId)
    } catch (err) {
      console.error("[AUTOMOD CMD ERROR]", err)
      const msg = "❌ حدث خطأ غير متوقع، حاول مرة ثانية."
      if (interaction.deferred) return interaction.editReply({ content: msg }).catch(() => {})
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════════════════════════════════
//  HANDLERS
// ══════════════════════════════════════════════════════════════════

// ─── حالة ───
async function handleStatus(interaction, guildId) {
  await interaction.deferReply({ ephemeral: true })

  const settings = await automodSystem.getSettings(guildId)
  const words = await automodSystem.getCustomWords(guildId)

  const enabledFilters = []
  const disabledFilters = []

  for (const key of FILTER_KEYS) {
    const f = settings.filters?.[key]
    if (f?.enabled) {
      enabledFilters.push(`✅ ${FILTER_LABELS[key]}`)
    } else {
      disabledFilters.push(`⚪ ${FILTER_LABELS[key]}`)
    }
  }

  const wl = settings.whitelist || {}
  const wlText = []
  if (wl.roles?.length) wlText.push(`📛 رتب: ${wl.roles.length}`)
  if (wl.channels?.length) wlText.push(`📌 قنوات: ${wl.channels.length}`)
  if (wl.users?.length) wlText.push(`👥 أعضاء: ${wl.users.length}`)

  const embed = new EmbedBuilder()
    .setColor(settings.enabled ? COLORS.success : COLORS.neutral)
    .setTitle("🛡️ AutoMod — حالة النظام")
    .setDescription(
      `**الحالة:** ${settings.enabled ? "🟢 مفعّل" : "🔴 معطّل"}\n` +
      `**قناة اللوق:** ${settings.log_channel ? `<#${settings.log_channel}>` : "❌ غير محدد"}\n` +
      `**الكلمات المخصصة:** ${words.length} كلمة\n` +
      `**الاستثناءات:** ${wlText.join(" • ") || "لا يوجد"}`
    )

  if (enabledFilters.length > 0) {
    embed.addFields({
      name: `🟢 الفلاتر المفعّلة (${enabledFilters.length})`,
      value: enabledFilters.join("\n"),
      inline: false
    })
  }

  if (disabledFilters.length > 0) {
    embed.addFields({
      name: `⚪ الفلاتر المعطّلة (${disabledFilters.length})`,
      value: disabledFilters.join("\n"),
      inline: false
    })
  }

  embed.setFooter({ text: "لتفاصيل أكثر استخدم لوحة التحكم rcif-dashboard.onrender.com" })
  embed.setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}

// ─── تفعيل ───
async function handleEnable(interaction, guildId) {
  await interaction.deferReply({ ephemeral: true })

  const enabled = interaction.options.getString("الحالة") === "on"
  const current = await automodSystem.getSettings(guildId)

  await automodSystem.saveSettings(guildId, {
    ...current,
    enabled
  })

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(enabled ? COLORS.success : COLORS.danger)
      .setTitle(`🛡️ AutoMod — ${enabled ? "✅ تم التفعيل" : "❌ تم الإيقاف"}`)
      .setDescription(enabled
        ? "النظام الآن يفحص الرسائل تلقائياً. لا تنسى تفعيل الفلاتر المطلوبة بـ `/إشراف فلتر`."
        : "تم إيقاف النظام كاملاً.")
      .setTimestamp()]
  })
}

// ─── فلتر ───
async function handleFilter(interaction, guildId) {
  await interaction.deferReply({ ephemeral: true })

  const filterKey = interaction.options.getString("النوع")
  const enabled = interaction.options.getString("الحالة") === "on"

  const current = await automodSystem.getSettings(guildId)
  const filters = { ...(current.filters || {}) }

  filters[filterKey] = {
    ...(filters[filterKey] || {}),
    enabled
  }

  await automodSystem.saveSettings(guildId, {
    ...current,
    filters
  })

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(enabled ? COLORS.success : COLORS.warning)
      .setDescription(
        `${enabled ? "✅" : "❌"} **${FILTER_LABELS[filterKey]}** ${enabled ? "تم تفعيله" : "تم إيقافه"}\n\n` +
        (current.enabled ? "" : "⚠️ النظام الرئيسي معطّل! فعّله بـ `/إشراف تفعيل الحالة:on`")
      )]
  })
}

// ─── كلمة ───
async function handleWord(interaction, guildId) {
  await interaction.deferReply({ ephemeral: true })

  const action = interaction.options.getString("الإجراء")
  const word = interaction.options.getString("الكلمة")?.trim()

  if (!word) {
    return interaction.editReply({ content: "❌ الكلمة فاضية." })
  }

  try {
    if (action === "add") {
      await automodSystem.addCustomWord(guildId, word, "banned")
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.success)
          .setDescription(`✅ تمت إضافة الكلمة: \`${word}\``)]
      })
    } else {
      // delete by word lookup
      const result = await databaseSystem.query(
        "DELETE FROM automod_words WHERE guild_id = $1 AND word = $2 RETURNING id",
        [guildId, word.toLowerCase()]
      )

      if (result.rows.length === 0) {
        return interaction.editReply({ content: `❌ الكلمة \`${word}\` غير موجودة في القائمة.` })
      }

      automodSystem.invalidateCache(guildId)

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.warning)
          .setDescription(`✅ تم حذف الكلمة: \`${word}\``)]
      })
    }
  } catch (err) {
    return interaction.editReply({ content: `❌ ${err.message}` })
  }
}

// ─── استثناء ───
async function handleWhitelist(interaction, guildId) {
  await interaction.deferReply({ ephemeral: true })

  const action = interaction.options.getString("الإجراء")
  const role = interaction.options.getRole("الرتبة")
  const channel = interaction.options.getChannel("القناة")

  if (!role && !channel) {
    return interaction.editReply({ content: "❌ لازم تحدد رتبة أو قناة." })
  }

  const current = await automodSystem.getSettings(guildId)
  const whitelist = {
    roles: Array.isArray(current.whitelist?.roles) ? [...current.whitelist.roles] : [],
    channels: Array.isArray(current.whitelist?.channels) ? [...current.whitelist.channels] : [],
    users: Array.isArray(current.whitelist?.users) ? [...current.whitelist.users] : []
  }

  const changes = []

  if (role) {
    if (action === "add") {
      if (!whitelist.roles.includes(role.id)) {
        whitelist.roles.push(role.id)
        changes.push(`✅ تمت إضافة رتبة ${role} للاستثناءات`)
      } else {
        changes.push(`⚠️ الرتبة ${role} موجودة مسبقاً`)
      }
    } else {
      const idx = whitelist.roles.indexOf(role.id)
      if (idx !== -1) {
        whitelist.roles.splice(idx, 1)
        changes.push(`✅ تم حذف رتبة ${role} من الاستثناءات`)
      } else {
        changes.push(`⚠️ الرتبة ${role} ما هي في القائمة`)
      }
    }
  }

  if (channel) {
    if (action === "add") {
      if (!whitelist.channels.includes(channel.id)) {
        whitelist.channels.push(channel.id)
        changes.push(`✅ تمت إضافة قناة ${channel} للاستثناءات`)
      } else {
        changes.push(`⚠️ القناة ${channel} موجودة مسبقاً`)
      }
    } else {
      const idx = whitelist.channels.indexOf(channel.id)
      if (idx !== -1) {
        whitelist.channels.splice(idx, 1)
        changes.push(`✅ تم حذف قناة ${channel} من الاستثناءات`)
      } else {
        changes.push(`⚠️ القناة ${channel} ما هي في القائمة`)
      }
    }
  }

  await automodSystem.saveSettings(guildId, {
    ...current,
    whitelist
  })

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setDescription(changes.join("\n"))]
  })
}

// ─── لوق ───
async function handleLog(interaction, guildId) {
  await interaction.deferReply({ ephemeral: true })

  const channel = interaction.options.getChannel("القناة")
  const current = await automodSystem.getSettings(guildId)

  await automodSystem.saveSettings(guildId, {
    ...current,
    log_channel: channel?.id || null
  })

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(channel ? COLORS.success : COLORS.warning)
      .setDescription(channel
        ? `✅ تم تعيين قناة اللوق: ${channel}`
        : "✅ تم إلغاء قناة اللوق")]
  })
}

// ─── سجل ───
async function handleHistory(interaction, guildId) {
  await interaction.deferReply({ ephemeral: true })

  const user = interaction.options.getUser("العضو")
  const violations = await automodSystem.getViolations(guildId, {
    userId: user?.id,
    limit: 15
  })

  if (violations.length === 0) {
    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle("🎉 لا توجد مخالفات")
        .setDescription(user
          ? `${user} ما عنده أي مخالفات.`
          : "السيرفر نظيف! لا توجد مخالفات.")]
    })
  }

  const lines = violations.map(v => {
    const ts = Math.floor(new Date(v.created_at).getTime() / 1000)
    const actionEmoji = v.action === "mute" ? "🔇" : "⚠️"
    return `${actionEmoji} <@${v.user_id}> • <t:${ts}:R>\n└ \`${v.filter_type}\``
  })

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(user ? `📋 مخالفات ${user.username}` : "📋 آخر المخالفات")
    .setDescription(lines.join("\n\n"))
    .setFooter({ text: `إجمالي: ${violations.length}` })

  return interaction.editReply({ embeds: [embed] })
}