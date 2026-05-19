/**
 * ═══════════════════════════════════════════════════════════
 *  /متصدرين — الأمر الموحّد الأسطوري
 *  المسار: commands/economy/leaderboard.js
 *
 *  ✨ مميزات:
 *   • 5 فئات (نفس الداشبورد):
 *      - 💵 الأغنى       (رصيد + بنك)
 *      - 💎 الثروة       (Net Worth)
 *      - 📦 الممتلكات    (عدد العناصر)
 *      - ⭐ الأعلى XP    (مجموع كل السيرفرات)
 *      - 🏆 أعلى مستوى   (Level واحد record)
 *
 *   • فلاتر زمنية:
 *      - كل الوقت / يومي / أسبوعي / شهري
 *
 *   • تصفّح صفحات:
 *      - 10 عناصر / صفحة
 *      - أزرار: ⏮ ◀ ▶ ⏭
 *
 *   • تصميم احترافي:
 *      - 🥇🥈🥉 ميداليات لأول 3
 *      - Embed ملوّن حسب الفئة
 *      - عرض ترتيبك الشخصي
 *      - زر يربط بالداشبورد
 *
 *  ⚠️ المتصدرين عالميون (الاقتصاد و XP و Level)
 *  ⚠️ يحتاج اشتراك Gold للوصول الكامل
 * ═══════════════════════════════════════════════════════════
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js")
const database = require("../../systems/databaseSystem")
const {
  ALL_ITEMS,
  formatPrice,
} = require("../../config/economyConfig")
const inventoryHelper = require("../../utils/inventoryHelper")

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const PAGE_SIZE = 10
const DASHBOARD_URL = "https://rcif-dashboard.onrender.com/dashboard/leaderboard"
const COLLECTOR_TIMEOUT_MS = 5 * 60 * 1000 // 5 دقائق

const CATEGORIES = {
  economy: {
    label: "💵 الأغنى",
    color: 0xfbbf24,
    title: "💵 المتصدرين — الأغنى عالمياً",
    description: "الأكثر فلوس (رصيد + بنك)",
    emoji: "💵",
  },
  networth: {
    label: "💎 الثروة الكاملة",
    color: 0x38bdf8,
    title: "💎 المتصدرين — الثروة الكاملة",
    description: "صافي الثروة (رصيد + بنك + قيمة الممتلكات)",
    emoji: "💎",
  },
  items: {
    label: "📦 أكثر ممتلكات",
    color: 0xf43f5e,
    title: "📦 المتصدرين — أكثر ممتلكات",
    description: "ترتيب حسب عدد عناصر الـ Inventory",
    emoji: "📦",
  },
  xp: {
    label: "⭐ الأعلى XP",
    color: 0xa855f7,
    title: "⭐ المتصدرين — الأعلى XP",
    description: "مجموع XP عبر كل السيرفرات",
    emoji: "⭐",
  },
  level: {
    label: "🏆 أعلى مستوى",
    color: 0x10b981,
    title: "🏆 المتصدرين — أعلى مستوى",
    description: "أعلى Level محقّق في سيرفر واحد",
    emoji: "🏆",
  },
}

const TIME_FILTERS = {
  all:     { label: "∞ كل الوقت", short: "كل الوقت" },
  monthly: { label: "🗓️ شهري",      short: "شهري" },
  weekly:  { label: "📆 أسبوعي",    short: "أسبوعي" },
  daily:   { label: "⚡ يومي",      short: "يومي" },
}

const MEDALS = ["🥇", "🥈", "🥉"]

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

function periodStartMs(period) {
  const now = Date.now()
  switch (period) {
    case "daily":   return now - 24 * 60 * 60 * 1000
    case "weekly":  return now - 7 * 24 * 60 * 60 * 1000
    case "monthly": return now - 30 * 24 * 60 * 60 * 1000
    default:        return 0
  }
}

function formatCompact(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B"
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (num >= 1_000)         return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
  return num.toLocaleString("ar-SA")
}

function rankPrefix(rank) {
  if (rank <= 3) return MEDALS[rank - 1]
  return `\`#${String(rank).padStart(2, "0")}\``
}

// ════════════════════════════════════════════════════════════
//  Data fetchers
// ════════════════════════════════════════════════════════════

/**
 * يجلب active user_ids للفترة المحددة (للفلاتر الزمنية على XP/Level)
 */
async function getActiveUserIds(period) {
  if (period === "all") return null

  const startMs = periodStartMs(period)
  const intervalStr =
    period === "daily" ? "1 day" :
    period === "weekly" ? "7 days" : "30 days"

  const [aiResult, ecoResult] = await Promise.allSettled([
    database.query(
      `SELECT DISTINCT user_id FROM ai_usage_log
       WHERE created_at >= NOW() - INTERVAL '${intervalStr}'`
    ),
    database.query(
      `SELECT user_id FROM economy_users
       WHERE last_daily >= $1 OR last_work >= $1`,
      [startMs]
    ),
  ])

  const ids = new Set()
  if (aiResult.status === "fulfilled") {
    for (const r of aiResult.value.rows) ids.add(r.user_id)
  }
  if (ecoResult.status === "fulfilled") {
    for (const r of ecoResult.value.rows) ids.add(r.user_id)
  }
  return ids
}

/**
 * Economy leaderboard
 */
async function fetchEconomy(period) {
  const limit = 100
  let r
  if (period === "all") {
    r = await database.query(
      `SELECT user_id,
              COALESCE(coins, 0)::bigint AS coins
       FROM economy_users
       WHERE COALESCE(coins, 0) > 0
       ORDER BY coins DESC
       LIMIT $1`,
      [limit]
    )
  } else {
    const startMs = periodStartMs(period)
    r = await database.query(
      `SELECT user_id,
              COALESCE(coins, 0)::bigint AS coins
       FROM economy_users
       WHERE COALESCE(coins, 0) > 0
         AND (last_daily >= $1 OR last_work >= $1)
       ORDER BY coins DESC
       LIMIT $2`,
      [startMs, limit]
    )
  }

  return (r.rows || []).map((row, i) => ({
    rank: i + 1,
    user_id: row.user_id,
    coins: Number(row.coins),
    bank: 0,
    total: Number(row.coins),
  }))
}

/**
 * Net Worth leaderboard
 */
async function fetchNetworth(period) {
  let sql, params
  if (period === "all") {
    sql = `SELECT user_id,
                  COALESCE(coins, 0)::bigint AS coins,
                  COALESCE(inventory, '[]'::jsonb) AS items,
           FROM economy_users
           WHERE COALESCE(coins, 0) > 0
              OR jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0`
    params = []
  } else {
    const startMs = periodStartMs(period)
    sql = `SELECT user_id,
                  COALESCE(coins, 0)::bigint AS coins,
                  COALESCE(inventory, '[]'::jsonb) AS items
           FROM economy_users
           WHERE (COALESCE(coins, 0) > 0
              OR jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0)
             AND (last_daily >= $1 OR last_work >= $1)`
    params = [startMs]
  }

  const r = await database.query(sql, params)

  const players = (r.rows || []).map((row) => {
    const coins = Number(row.coins) || 0
    const bank = 0
    const cashTotal = coins
    const items = inventoryHelper.normalize(row.items)

    let itemsValue = 0
    let totalItems = 0
    for (const asset of items) {
      const def = ALL_ITEMS[asset.item_id]
      const qty = Number(asset.quantity) || 0
      totalItems += qty
      if (def?.price) itemsValue += def.price * qty
    }

    return {
      user_id: row.user_id,
      coins,
      bank: 0,
      cash_total: cashTotal,
      items_value: itemsValue,
      total_items: totalItems,
      net_worth: cashTotal + itemsValue,
    }
  })

  players.sort((a, b) => b.net_worth - a.net_worth)
  return players.slice(0, 100).map((p, i) => ({ ...p, rank: i + 1 }))
}

/**
 * Items leaderboard
 */
async function fetchItems(period) {
  let sql, params
  if (period === "all") {
    sql = `SELECT user_id,
                  COALESCE(inventory, '[]'::jsonb) AS items,
                  (SELECT COALESCE(SUM(COALESCE((item->>'quantity')::int, 0)), 0)
                   FROM jsonb_array_elements(COALESCE(inventory, '[]'::jsonb)) AS item
                  )::int AS total_items,
                  jsonb_array_length(COALESCE(inventory, '[]'::jsonb))::int AS unique_items
           FROM economy_users
           WHERE jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0
           ORDER BY total_items DESC
           LIMIT 100`
    params = []
  } else {
    const startMs = periodStartMs(period)
    sql = `SELECT user_id,
                  COALESCE(inventory, '[]'::jsonb) AS items,
                  (SELECT COALESCE(SUM(COALESCE((item->>'quantity')::int, 0)), 0)
                   FROM jsonb_array_elements(COALESCE(inventory, '[]'::jsonb)) AS item
                  )::int AS total_items,
                  jsonb_array_length(COALESCE(inventory, '[]'::jsonb))::int AS unique_items
           FROM economy_users
           WHERE jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0
             AND (last_daily >= $1 OR last_work >= $1)
           ORDER BY total_items DESC
           LIMIT 100`
    params = [startMs]
  }

  const r = await database.query(sql, params)

  return (r.rows || []).map((row, i) => {
    const items = inventoryHelper.normalize(row.items)
    let itemsValue = 0
    for (const asset of items) {
      const def = ALL_ITEMS[asset.item_id]
      const qty = Number(asset.quantity) || 0
      if (def?.price) itemsValue += def.price * qty
    }
    return {
      rank: i + 1,
      user_id: row.user_id,
      total_items: Number(row.total_items),
      unique_items: Number(row.unique_items),
      items_value: itemsValue,
    }
  })
}

/**
 * XP leaderboard
 */
async function fetchXP(period) {
  const activeIds = await getActiveUserIds(period)

  let r
  if (!activeIds) {
    r = await database.query(
      `SELECT user_id,
              COUNT(DISTINCT guild_id)::int AS servers_count,
              SUM(level)::bigint AS total_levels,
              SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
              MAX(level)::int AS highest_level
       FROM xp
       WHERE xp > 0 OR level > 0
       GROUP BY user_id
       ORDER BY total_xp DESC
       LIMIT 100`
    )
  } else if (activeIds.size === 0) {
    return []
  } else {
    r = await database.query(
      `SELECT user_id,
              COUNT(DISTINCT guild_id)::int AS servers_count,
              SUM(level)::bigint AS total_levels,
              SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
              MAX(level)::int AS highest_level
       FROM xp
       WHERE (xp > 0 OR level > 0)
         AND user_id = ANY($1::text[])
       GROUP BY user_id
       ORDER BY total_xp DESC
       LIMIT 100`,
      [[...activeIds]]
    )
  }

  return (r.rows || []).map((row, i) => ({
    rank: i + 1,
    user_id: row.user_id,
    total_xp: Number(row.total_xp),
    total_levels: Number(row.total_levels),
    highest_level: Number(row.highest_level),
    servers_count: Number(row.servers_count),
  }))
}

/**
 * Level leaderboard
 */
async function fetchLevel(period) {
  const activeIds = await getActiveUserIds(period)

  let r
  if (!activeIds) {
    r = await database.query(
      `SELECT user_id, guild_id, level, xp,
              ((level * (level - 1) * 50) + xp)::bigint AS total_xp
       FROM xp
       WHERE level > 0
       ORDER BY level DESC, xp DESC
       LIMIT 100`
    )
  } else if (activeIds.size === 0) {
    return []
  } else {
    r = await database.query(
      `SELECT user_id, guild_id, level, xp,
              ((level * (level - 1) * 50) + xp)::bigint AS total_xp
       FROM xp
       WHERE level > 0
         AND user_id = ANY($1::text[])
       ORDER BY level DESC, xp DESC
       LIMIT 100`,
      [[...activeIds]]
    )
  }

  return (r.rows || []).map((row, i) => ({
    rank: i + 1,
    user_id: row.user_id,
    guild_id: row.guild_id,
    level: Number(row.level),
    total_xp: Number(row.total_xp),
  }))
}

async function fetchLeaderboard(category, period) {
  switch (category) {
    case "economy":  return fetchEconomy(period)
    case "networth": return fetchNetworth(period)
    case "items":    return fetchItems(period)
    case "xp":       return fetchXP(period)
    case "level":    return fetchLevel(period)
    default:         return []
  }
}

// ════════════════════════════════════════════════════════════
//  Username resolver (cached per-execution)
// ════════════════════════════════════════════════════════════

async function resolveUsernames(client, userIds) {
  const map = new Map()
  const results = await Promise.allSettled(
    userIds.map(async (id) => {
      // نحاول من cache أولاً
      const cached = client.users.cache.get(id)
      if (cached) return { id, name: cached.globalName || cached.username }

      try {
        const user = await client.users.fetch(id)
        return { id, name: user.globalName || user.username }
      } catch {
        return { id, name: null }
      }
    })
  )

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      map.set(r.value.id, r.value.name)
    }
  }

  return map
}

// ════════════════════════════════════════════════════════════
//  Format row for embed
// ════════════════════════════════════════════════════════════

function formatRow(item, category, usernames) {
  const name = usernames.get(item.user_id) || `User ${item.user_id.slice(-6)}`
  const medal = rankPrefix(item.rank)

  switch (category) {
    case "economy":
      return `${medal} **${name}** — \`${formatCompact(item.total)}\` كوين\n` +
             `      🪙 ${formatCompact(item.coins)} • 🏦 ${formatCompact(item.bank)}`

    case "networth":
      return `${medal} **${name}** — \`${formatCompact(item.net_worth)}\` ثروة\n` +
             `      💰 ${formatCompact(item.cash_total)} نقدي • 📦 ${item.total_items} عنصر`

    case "items":
      return `${medal} **${name}** — \`${item.total_items}\` عنصر\n` +
             `      🌟 ${item.unique_items} نوع • 💎 ${formatCompact(item.items_value)} قيمة`

    case "xp":
      return `${medal} **${name}** — \`${formatCompact(item.total_xp)}\` XP\n` +
             `      🎮 ${item.servers_count} سيرفر • 📈 Lv.${item.highest_level}`

    case "level":
      return `${medal} **${name}** — \`Lv.${item.level}\`\n` +
             `      ⭐ ${formatCompact(item.total_xp)} XP`

    default:
      return `${medal} ${name}`
  }
}

// ════════════════════════════════════════════════════════════
//  Build Embed
// ════════════════════════════════════════════════════════════

function buildEmbed({ category, period, page, totalPages, pageItems, allItems, myRank, usernames, guild }) {
  const cat = CATEGORIES[category]
  const periodLabel = TIME_FILTERS[period]?.short || "كل الوقت"

  const embed = new EmbedBuilder()
    .setColor(cat.color)
    .setTitle(cat.title)
    .setDescription(`${cat.description}\n📅 الفترة: **${periodLabel}** • 📄 الصفحة **${page}/${totalPages}**`)

  if (pageItems.length === 0) {
    embed.addFields({
      name: "📊 الترتيب",
      value: "🏜️ ما فيه بيانات في هذه الفترة.\nاستخدموا `/يومي` و `/عمل` لتبدأون!",
      inline: false,
    })
  } else {
    const lines = pageItems.map((item) => formatRow(item, category, usernames))
    embed.addFields({
      name: `📊 الترتيب (${pageItems[0].rank} - ${pageItems[pageItems.length - 1].rank})`,
      value: lines.join("\n\n"),
      inline: false,
    })
  }

  // إحصائيات إضافية
  embed.addFields(
    { name: "👥 إجمالي اللاعبين", value: `${allItems.length}`, inline: true },
    { name: "📍 ترتيبك", value: myRank || "غير مصنّف", inline: true },
    { name: "🌐 شامل", value: "كل السيرفرات", inline: true }
  )

  embed.setFooter({
    text: `${guild.name} • Lyn Bot — متصدرين عالميين`,
    iconURL: guild.iconURL({ dynamic: true }) || undefined,
  })
  embed.setTimestamp()

  return embed
}

// ════════════════════════════════════════════════════════════
//  Build Components (buttons + select menu)
// ════════════════════════════════════════════════════════════

function buildCategorySelect(currentCategory) {
  const select = new StringSelectMenuBuilder()
    .setCustomId("lb_category")
    .setPlaceholder("اختر الفئة...")
    .addOptions(
      Object.entries(CATEGORIES).map(([key, cfg]) => ({
        label: cfg.label,
        value: key,
        description: cfg.description.slice(0, 100),
        emoji: cfg.emoji,
        default: key === currentCategory,
      }))
    )

  return new ActionRowBuilder().addComponents(select)
}

function buildPeriodSelect(currentPeriod) {
  const select = new StringSelectMenuBuilder()
    .setCustomId("lb_period")
    .setPlaceholder("اختر الفترة...")
    .addOptions(
      Object.entries(TIME_FILTERS).map(([key, cfg]) => ({
        label: cfg.label,
        value: key,
        default: key === currentPeriod,
      }))
    )

  return new ActionRowBuilder().addComponents(select)
}

function buildPaginationButtons(page, totalPages, sessionId) {
  const canPrev = page > 1
  const canNext = page < totalPages

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_first:${sessionId}`)
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canPrev),

    new ButtonBuilder()
      .setCustomId(`lb_prev:${sessionId}`)
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canPrev),

    new ButtonBuilder()
      .setCustomId(`lb_page_indicator:${sessionId}`)
      .setLabel(`${page} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId(`lb_next:${sessionId}`)
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!canNext),

    new ButtonBuilder()
      .setCustomId(`lb_last:${sessionId}`)
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canNext)
  )
}

function buildExtraButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("الداشبورد")
      .setStyle(ButtonStyle.Link)
      .setURL(DASHBOARD_URL)
      .setEmoji("🌐"),

    new ButtonBuilder()
      .setCustomId("lb_refresh")
      .setLabel("تحديث")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔄")
  )
}

// ════════════════════════════════════════════════════════════
//  Find user's rank in full list
// ════════════════════════════════════════════════════════════

function findMyRank(allItems, userId) {
  const idx = allItems.findIndex((x) => x.user_id === userId)
  if (idx === -1) return null
  return `#${idx + 1} من ${allItems.length}`
}

// ════════════════════════════════════════════════════════════
//  Main Command
// ════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("متصدرين")
    .setDescription("عرض المتصدرين العالميين — 5 فئات + فلاتر زمنية")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("النوع")
        .setDescription("نوع الترتيب")
        .setRequired(false)
        .addChoices(
          { name: "💵 الأغنى (رصيد + بنك)", value: "economy" },
          { name: "💎 الثروة الكاملة", value: "networth" },
          { name: "📦 أكثر ممتلكات", value: "items" },
          { name: "⭐ الأعلى XP", value: "xp" },
          { name: "🏆 أعلى مستوى", value: "level" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("الفترة")
        .setDescription("الفترة الزمنية")
        .setRequired(false)
        .addChoices(
          { name: "∞ كل الوقت", value: "all" },
          { name: "🗓️ شهري", value: "monthly" },
          { name: "📆 أسبوعي", value: "weekly" },
          { name: "⚡ يومي", value: "daily" }
        )
    ),

  helpMeta: {
    category: "economy",
    aliases: ["leaderboard", "top", "rich", "متصدرين"],
    description: "عرض المتصدرين العالميين — 5 فئات + فلاتر زمنية + تصفّح",
    options: [
      { name: "النوع", description: "الأغنى / الثروة / الممتلكات / XP / Level", required: false },
      { name: "الفترة", description: "كل الوقت / يومي / أسبوعي / شهري", required: false },
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "gold",
    },
    cooldown: 0,
    relatedCommands: ["رصيد", "ممتلكاتي", "مستوى"],
    examples: [
      "/متصدرين",
      "/متصدرين النوع:💎 الثروة الكاملة",
      "/متصدرين النوع:⭐ الأعلى XP الفترة:📆 أسبوعي",
    ],
    notes: [
      "المتصدرين عالميون — كل السيرفرات في مكان واحد",
      "5 فئات: الأغنى، الثروة، الممتلكات، XP، Level",
      "فلاتر زمنية: كل الوقت، يومي، أسبوعي، شهري",
      "تصفّح صفحات (10 / صفحة)",
      "زر للداشبورد للعرض الكامل",
    ],
  },

  async execute(interaction, client) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true,
        })
      }

      await interaction.deferReply()

      // ─── Initial state ───
      const state = {
        category: interaction.options.getString("النوع") || "economy",
        period: interaction.options.getString("الفترة") || "all",
        page: 1,
        allItems: [],
        usernames: new Map(),
      }

      const sessionId = `${interaction.user.id}_${Date.now()}`

      // ─── Render function ───
      const render = async () => {
        // 1) جلب البيانات
        state.allItems = await fetchLeaderboard(state.category, state.period)

        // 2) حساب الصفحات
        const totalPages = Math.max(1, Math.ceil(state.allItems.length / PAGE_SIZE))
        if (state.page > totalPages) state.page = totalPages

        const startIdx = (state.page - 1) * PAGE_SIZE
        const pageItems = state.allItems.slice(startIdx, startIdx + PAGE_SIZE)

        // 3) جلب الأسماء (للصفحة الحالية فقط — للأداء)
        const idsToResolve = pageItems.map((x) => x.user_id)
        const newNames = await resolveUsernames(client, idsToResolve)
        for (const [id, name] of newNames) state.usernames.set(id, name)

        // 4) ترتيب المستخدم الحالي
        const myRank = findMyRank(state.allItems, interaction.user.id)

        // 5) Build embed + components
        const embed = buildEmbed({
          category: state.category,
          period: state.period,
          page: state.page,
          totalPages,
          pageItems,
          allItems: state.allItems,
          myRank,
          usernames: state.usernames,
          guild: interaction.guild,
        })

        const components = [
          buildCategorySelect(state.category),
          buildPeriodSelect(state.period),
          buildPaginationButtons(state.page, totalPages, sessionId),
          buildExtraButtons(),
        ]

        return { embed, components, totalPages }
      }

      // ─── Initial render ───
      const initial = await render()
      const response = await interaction.editReply({
        embeds: [initial.embed],
        components: initial.components,
      })

      // ─── Collector ───
      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: COLLECTOR_TIMEOUT_MS,
      })

      collector.on("collect", async (i) => {
        try {
          await i.deferUpdate()

          const customId = i.customId

          // Select menus
          if (customId === "lb_category" && i.isStringSelectMenu()) {
            state.category = i.values[0]
            state.page = 1
          } else if (customId === "lb_period" && i.isStringSelectMenu()) {
            state.period = i.values[0]
            state.page = 1
          }
          // Pagination buttons
          else if (customId.startsWith("lb_first:")) {
            state.page = 1
          } else if (customId.startsWith("lb_prev:")) {
            state.page = Math.max(1, state.page - 1)
          } else if (customId.startsWith("lb_next:")) {
            const totalPages = Math.ceil(state.allItems.length / PAGE_SIZE)
            state.page = Math.min(totalPages, state.page + 1)
          } else if (customId.startsWith("lb_last:")) {
            state.page = Math.ceil(state.allItems.length / PAGE_SIZE)
          } else if (customId === "lb_refresh") {
            // re-fetch بدون تغيير حالة
          }

          // Re-render
          const updated = await render()
          await i.editReply({
            embeds: [updated.embed],
            components: updated.components,
          })
        } catch (err) {
          console.error("[LEADERBOARD COLLECTOR ERROR]", err)
        }
      })

      collector.on("end", async () => {
        try {
          // إزالة الأزرار/select لما الوقت ينتهي
          await interaction.editReply({ components: [] }).catch(() => {})
        } catch {}
      })
    } catch (err) {
      console.error("[LEADERBOARD ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({
          content: "❌ حدث خطأ في عرض المتصدرين. حاول مرة ثانية.",
        }).catch(() => {})
      }
      if (!interaction.replied) {
        return interaction.reply({
          content: "❌ حدث خطأ في عرض المتصدرين.",
          ephemeral: true,
        }).catch(() => {})
      }
    }
  },
}