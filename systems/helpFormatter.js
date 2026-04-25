// ══════════════════════════════════════════════════════════════════
//  HELP FORMATTER — تنسيق كل الـ Embeds للـ /help
//  المسار: systems/helpFormatter.js
//
//  المسؤوليات:
//   1) بناء Embed الصفحة الرئيسية (قائمة الفئات)
//   2) بناء Embed فئة معينة (قائمة الأوامر داخلها)
//   3) بناء Embed تفصيلي لأمر معين (كل المعلومات)
//   4) بناء Select Menus والأزرار
//
//  كل الـ Embeds تستخدم نفس الهوية البصرية (ألوان، إيموجي، تنسيق).
// ══════════════════════════════════════════════════════════════════

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const helpSystem = require("./helpSystem")

// ══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════════

const COLORS = {
  primary:   0x5865f2,
  success:   0x22c55e,
  warning:   0xf59e0b,
  danger:    0xef4444,
  muted:     0x64748b,
  info:      0x06b6d4,
  premium:   0xfbbf24,
  diamond:   0x60a5fa
}

// رابط الاشتراك (يُستبدل لاحقاً بالرابط الحقيقي للداشبورد)
const SUBSCRIPTION_URL = "https://rcif-dashboard.onrender.com/#subscriptions"

// أيقونات صلاحيات Discord المعروفة
const PERMISSION_LABELS = {
  Administrator:           "👑 مدير (Administrator)",
  ManageGuild:             "⚙️ إدارة السيرفر",
  ManageRoles:             "🎭 إدارة الرتب",
  ManageChannels:          "📁 إدارة القنوات",
  ManageMessages:          "💬 إدارة الرسائل",
  ManageNicknames:         "✏️ إدارة الأسماء المستعارة",
  ManageWebhooks:          "🪝 إدارة Webhooks",
  ManageEmojisAndStickers: "😀 إدارة الإيموجي والملصقات",
  ManageThreads:           "🧵 إدارة الـ Threads",
  ManageEvents:            "🎉 إدارة الفعاليات",
  KickMembers:             "👢 طرد الأعضاء",
  BanMembers:              "🔨 حظر الأعضاء",
  ModerateMembers:         "🔇 كتم الأعضاء (Timeout)",
  MentionEveryone:         "📢 منشن @everyone",
  ViewAuditLog:            "📜 عرض سجل التدقيق",
  ViewChannel:             "👁️ رؤية القناة",
  SendMessages:            "✉️ إرسال الرسائل",
  EmbedLinks:              "🔗 تضمين الروابط",
  AttachFiles:             "📎 إرفاق الملفات",
  AddReactions:            "👍 إضافة تفاعلات",
  UseExternalEmojis:       "🌐 استخدام إيموجي خارجي",
  Connect:                 "🔌 الاتصال بالقنوات الصوتية",
  Speak:                   "🎤 التحدث",
  MuteMembers:             "🔇 كتم الصوت",
  DeafenMembers:           "🔕 إصمام الأعضاء",
  MoveMembers:             "↔️ نقل الأعضاء"
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

/**
 * تحويل اسم صلاحية Discord لاسم بشري بالعربي
 */
function formatPermission(perm) {
  return PERMISSION_LABELS[perm] || `🔧 ${perm}`
}

/**
 * إيموجي مستوى الاشتراك
 */
function tierEmoji(tier) {
  const meta = helpSystem.getTierMeta(tier)
  return meta.emoji
}

/**
 * تسمية مستوى الاشتراك
 */
function tierLabel(tier) {
  const meta = helpSystem.getTierMeta(tier)
  return meta.label
}

/**
 * هل المستخدم يقدر يستخدم هذا المستوى؟
 */
function canAccessTier(currentTier, requiredTier) {
  const tiers = ["free", "silver", "gold", "diamond"]
  const currentLevel  = tiers.indexOf(currentTier || "free")
  const requiredLevel = tiers.indexOf(requiredTier || "free")
  return currentLevel >= requiredLevel
}

/**
 * تنسيق اسم الأمر مع شارة الاشتراك
 * مجاني → ✅ /حظر
 * فضي    → 🥈 /لوق
 * ذهبي   → 💎 /تذاكر
 * ماسي   → 🔒 /إبداعي
 */
function formatCommandName(entry) {
  const tier = entry.subscriptionTier || "free"
  const badges = {
    free:    "✅",
    silver:  "🥈",
    gold:    "💎",
    diamond: "🔒"
  }
  return `${badges[tier] || "✅"} \`/${entry.name}\``
}

/**
 * تقصير نص لو طويل
 */
function truncate(text, max = 100) {
  if (!text) return ""
  if (text.length <= max) return text
  return text.slice(0, max - 3) + "..."
}

// ══════════════════════════════════════════════════════════════════
//  MAIN PAGE — الصفحة الرئيسية
// ══════════════════════════════════════════════════════════════════

/**
 * بناء Embed الصفحة الرئيسية
 */
function buildMainEmbed(client, visibleCategories, stats) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("📚 دليل أوامر البوت")
    .setDescription([
      "**أهلاً بك في دليل الأوامر الكامل**",
      "",
      "اختر فئة من القائمة بالأسفل لاستعراض أوامرها، أو ابحث عن أمر معين باستخدام `/help [اسم_الأمر]`.",
      "",
      "**🏷️ شارات الاشتراك:**",
      "✅ متاح للجميع · 🥈 فضي فأعلى · 💎 ذهبي فأعلى · 🔒 ماسي فقط",
      ""
    ].join("\n"))

  // ✨ عرض الفئات في fields (3 أعمدة)
  for (const cat of visibleCategories) {
    embed.addFields({
      name: `${cat.icon} ${cat.label}`,
      value: `\`${cat.count}\` ${cat.count === 1 ? "أمر" : "أوامر"}`,
      inline: true
    })
  }

  embed.setFooter({
    text: `${stats.totalCommands} أمر · ${visibleCategories.length} فئة · استخدم القائمة بالأسفل`,
    iconURL: client.user.displayAvatarURL({ dynamic: true })
  })

  embed.setTimestamp()

  return embed
}

/**
 * Select Menu لاختيار الفئة
 */
function buildCategorySelectMenu(visibleCategories, selectedCategoryId = null) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help:category")
    .setPlaceholder("📂 اختر فئة لعرض أوامرها...")
    .setMinValues(1)
    .setMaxValues(1)

  // أقصى 25 خيار في Discord
  const options = visibleCategories.slice(0, 25).map(cat => {
    const opt = {
      label: cat.label,
      value: cat.id,
      description: `${cat.count} ${cat.count === 1 ? "أمر" : "أوامر"} في هذه الفئة`,
      emoji: cat.icon
    }

    if (selectedCategoryId === cat.id) {
      opt.default = true
    }

    return opt
  })

  menu.addOptions(options)

  return new ActionRowBuilder().addComponents(menu)
}

// ══════════════════════════════════════════════════════════════════
//  CATEGORY PAGE — صفحة الفئة
// ══════════════════════════════════════════════════════════════════

/**
 * بناء Embed لفئة معينة (قائمة الأوامر داخلها)
 */
function buildCategoryEmbed(client, categoryId, commands, userTier = "free") {
  const meta = helpSystem.getCategoryMeta(categoryId) || {
    label: categoryId,
    icon: "📁",
    color: COLORS.primary
  }

  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(`${meta.icon} فئة: ${meta.label}`)
    .setDescription([
      `**${commands.length}** ${commands.length === 1 ? "أمر متاح" : "أمر متاح"} في هذه الفئة.`,
      "",
      "اختر أمراً من القائمة بالأسفل لعرض تفاصيله الكاملة (الخيارات، الصلاحيات، الأمثلة).",
      ""
    ].join("\n"))

  // ✨ عرض الأوامر (مجمّعة حسب مستوى الاشتراك)
  const grouped = {
    free: [],
    silver: [],
    gold: [],
    diamond: []
  }

  for (const cmd of commands) {
    const tier = cmd.subscriptionTier || "free"
    if (grouped[tier]) {
      grouped[tier].push(cmd)
    }
  }

  const tierOrder = ["free", "silver", "gold", "diamond"]
  const tierHeaders = {
    free:    "✅ مجاني — متاح للجميع",
    silver:  "🥈 فضي فأعلى",
    gold:    "💎 ذهبي فأعلى",
    diamond: "🔒 ماسي فقط"
  }

  for (const tier of tierOrder) {
    const list = grouped[tier]
    if (list.length === 0) continue

    const lines = list.map(cmd => {
      const desc = truncate(cmd.description, 70)
      return `\`/${cmd.name}\` — ${desc}`
    }).join("\n")

    embed.addFields({
      name: tierHeaders[tier],
      value: lines || "—",
      inline: false
    })
  }

  embed.setFooter({
    text: `استخدم القائمة بالأسفل لعرض تفاصيل أي أمر`,
    iconURL: client.user.displayAvatarURL({ dynamic: true })
  })

  embed.setTimestamp()

  return embed
}

/**
 * Select Menu لاختيار أمر داخل فئة
 */
function buildCommandSelectMenu(categoryId, commands) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`help:command:${categoryId}`)
    .setPlaceholder("🔍 اختر أمراً لعرض تفاصيله...")
    .setMinValues(1)
    .setMaxValues(1)

  // أقصى 25 خيار
  const options = commands.slice(0, 25).map(cmd => {
    const tier = cmd.subscriptionTier || "free"
    const tierEmojis = {
      free:    "✅",
      silver:  "🥈",
      gold:    "💎",
      diamond: "🔒"
    }

    return {
      label: `/${cmd.name}`.slice(0, 100),
      value: cmd.name.slice(0, 100),
      description: truncate(cmd.description, 100),
      emoji: tierEmojis[tier] || "✅"
    }
  })

  menu.addOptions(options)

  return new ActionRowBuilder().addComponents(menu)
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DETAIL PAGE — تفاصيل أمر معين
// ══════════════════════════════════════════════════════════════════

/**
 * بناء Embed تفصيلي لأمر معين
 *
 * @param {Object} client       - Discord client
 * @param {Object} entry        - Help entry للأمر
 * @param {string} userTier     - مستوى اشتراك السيرفر الحالي
 * @param {Object} botContext   - { botRolePosition, requiredAbove } للفحص الديناميكي
 */
function buildCommandDetailEmbed(client, entry, userTier = "free", botContext = null) {
  const categoryMeta = helpSystem.getCategoryMeta(entry.category) || {
    label: entry.category,
    icon: "📁",
    color: COLORS.primary
  }

  const tier = entry.subscriptionTier || "free"
  const tierMeta = helpSystem.getTierMeta(tier)
  const isAccessible = canAccessTier(userTier, tier)

  // ✨ لون الـ embed يعكس مستوى الاشتراك ولكن مع توهين لو غير متاح
  const embedColor = isAccessible ? tierMeta.color : COLORS.muted

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${categoryMeta.icon} الأمر: \`/${entry.name}\``)
    .setDescription(entry.description)

  // ── الفئة + مستوى الاشتراك (في نفس السطر) ──
  embed.addFields(
    {
      name: "📂 الفئة",
      value: `${categoryMeta.icon} ${categoryMeta.label}`,
      inline: true
    },
    {
      name: "💎 مستوى الاشتراك",
      value: `${tierMeta.emoji} ${tierMeta.label}`,
      inline: true
    },
    {
      name: "⏱️ الكولداون",
      value: entry.cooldown > 0 ? `${entry.cooldown} ثانية` : "بدون",
      inline: true
    }
  )

  // ── الخيارات ──
  if (entry.options && entry.options.length > 0) {
    const optionLines = entry.options.map(opt => {
      const required = opt.required ? "🔴" : "⚪"
      const desc = opt.description ? ` — ${opt.description}` : ""
      return `${required} \`${opt.name}\`${desc}`
    }).join("\n")

    embed.addFields({
      name: `📝 الخيارات (${entry.options.length})`,
      value: optionLines + "\n\n🔴 = إجباري · ⚪ = اختياري",
      inline: false
    })
  }

  // ── متطلبات المستخدم (الصلاحيات) ──
  if (entry.userPermissions && entry.userPermissions.length > 0) {
    const permsList = entry.userPermissions.map(p => `• ${formatPermission(p)}`).join("\n")
    embed.addFields({
      name: "👤 صلاحيات المستخدم المطلوبة",
      value: permsList,
      inline: false
    })
  }

  // ── ترتيب رتبة البوت (ديناميكي إذا متوفر) ──
  if (entry.botRoleHierarchy) {
    let hierarchyText

    if (botContext && typeof botContext.botRolePosition === "number") {
      // عرض ديناميكي
      hierarchyText = [
        `**ترتيب رتبة البوت في السيرفر:** \`#${botContext.botRolePosition}\``,
        `⚠️ لازم تكون **رتبة البوت أعلى** من رتبة العضو المستهدف عشان الأمر يشتغل.`,
        `لو الأمر فشل، ارفع رتبة البوت لأعلى من رتبة الهدف من إعدادات السيرفر.`
      ].join("\n")
    } else {
      // عرض ثابت (fallback)
      hierarchyText = "⚠️ لازم تكون **رتبة البوت أعلى** من رتبة العضو المستهدف عشان الأمر يشتغل."
    }

    embed.addFields({
      name: "🤖 ترتيب رتبة البوت",
      value: hierarchyText,
      inline: false
    })
  }

  // ── الأمثلة ──
  if (entry.examples && entry.examples.length > 0) {
    const examplesList = entry.examples.map(ex => `\`${ex}\``).join("\n")
    embed.addFields({
      name: "💡 أمثلة استخدام",
      value: examplesList,
      inline: false
    })
  }

  // ── الملاحظات ──
  if (entry.notes && entry.notes.length > 0) {
    const notesList = entry.notes.map(n => `• ${n}`).join("\n")
    embed.addFields({
      name: "📌 ملاحظات",
      value: notesList,
      inline: false
    })
  }

  // ── الأوامر المرتبطة ──
  if (entry.relatedCommands && entry.relatedCommands.length > 0) {
    const relatedList = entry.relatedCommands.map(c => `\`/${c}\``).join(" · ")
    embed.addFields({
      name: "🔗 أوامر ذات صلة",
      value: relatedList,
      inline: false
    })
  }

  // ── حالة الوصول (للأوامر المدفوعة لما المستخدم ما يقدر) ──
  if (!isAccessible) {
    embed.addFields({
      name: "🔒 هذا الأمر غير متاح في خطتك الحالية",
      value: [
        `هذا الأمر يحتاج اشتراك **${tierMeta.emoji} ${tierMeta.label}** فأعلى.`,
        `خطة سيرفرك الحالية: **${tierEmoji(userTier)} ${tierLabel(userTier)}**`,
        ``,
        `لاستخدام هذا الأمر، رقّ خطة السيرفر من الداشبورد.`
      ].join("\n"),
      inline: false
    })
  }

  embed.setFooter({
    text: `استخدم \`/help\` للرجوع للقائمة الرئيسية`,
    iconURL: client.user.displayAvatarURL({ dynamic: true })
  })

  embed.setTimestamp()

  return embed
}

/**
 * بناء أزرار التنقل لصفحة تفاصيل الأمر
 */
function buildCommandDetailButtons(entry, isAccessible) {
  const row = new ActionRowBuilder()

  // ── زر "رجوع للفئة" ──
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`help:back-to-category:${entry.category}`)
      .setLabel("رجوع للفئة")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
  )

  // ── زر "القائمة الرئيسية" ──
  row.addComponents(
    new ButtonBuilder()
      .setCustomId("help:home")
      .setLabel("القائمة الرئيسية")
      .setEmoji("🏠")
      .setStyle(ButtonStyle.Secondary)
  )

  // ── زر اشتراك (لو الأمر مقفل) ──
  if (!isAccessible) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel("ترقية الاشتراك")
        .setEmoji("💎")
        .setStyle(ButtonStyle.Link)
        .setURL(SUBSCRIPTION_URL)
    )
  }

  return row
}

// ══════════════════════════════════════════════════════════════════
//  ERROR EMBEDS
// ══════════════════════════════════════════════════════════════════

/**
 * Embed لأمر غير موجود
 */
function buildNotFoundEmbed(query) {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("❌ أمر غير موجود")
    .setDescription([
      `ما لقيت أي أمر بالاسم: \`${query}\``,
      "",
      "**جرّب:**",
      "• استخدم `/help` بدون اسم لتصفح كل الأوامر",
      "• تأكد من كتابة الاسم بالعربي أو الإنجليزي بدون أخطاء",
      "• الأوامر الفرعية تُكتب كذا: `/help تذاكر إعداد`"
    ].join("\n"))
    .setTimestamp()
}

/**
 * Embed لما الفئة المختارة فاضية
 */
function buildEmptyCategoryEmbed(categoryId) {
  const meta = helpSystem.getCategoryMeta(categoryId) || {
    label: categoryId,
    icon: "📁"
  }

  return new EmbedBuilder()
    .setColor(COLORS.muted)
    .setTitle(`${meta.icon} ${meta.label}`)
    .setDescription("ما فيه أوامر متاحة في هذه الفئة حالياً.")
    .setTimestamp()
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = {
  // Main page
  buildMainEmbed,
  buildCategorySelectMenu,

  // Category page
  buildCategoryEmbed,
  buildCommandSelectMenu,

  // Command detail page
  buildCommandDetailEmbed,
  buildCommandDetailButtons,

  // Error states
  buildNotFoundEmbed,
  buildEmptyCategoryEmbed,

  // Helpers (للوصول من handler)
  formatPermission,
  formatCommandName,
  canAccessTier,
  tierEmoji,
  tierLabel,

  // Constants
  COLORS,
  SUBSCRIPTION_URL
}