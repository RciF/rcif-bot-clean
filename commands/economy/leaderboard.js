/**
 * ═══════════════════════════════════════════════════════════
 *  /متصدرين — الأمر الأسطوري النهائي (v3)
 *  المسار: commands/economy/leaderboard.js
 *
 *  ✨ مميزات هذه النسخة:
 *   • 5 فئات: الأغنى / الثروة / الممتلكات / XP / Level
 *   • نطاق: السيرفر / عالمي
 *   • فلاتر زمنية حقيقية (snapshots):
 *      - daily   : current - snapshot قبل يوم
 *      - weekly  : current - snapshot قبل 7 أيام
 *      - monthly : current - snapshot قبل 30 يوم
 *      - all     : current value
 *   • تصفّح صفحات (10 / صفحة)
 *   • أزرار ⏮ ◀ ▶ ⏭
 *   • Cache 5 دقائق لكل combination
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
const snapshots = require("../../systems/leaderboardSnapshotSystem")
const { ALL_ITEMS } = require("../../config/economyConfig")
const inventoryHelper = require("../../utils/inventoryHelper")

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const PAGE_SIZE = 10
const DASHBOARD_URL = "https://rcif-dashboard.onrender.com/dashboard/leaderboard"
const COLLECTOR_TIMEOUT_MS = 5 * 60 * 1000
const CACHE_TTL = 5 * 60 * 1000

const CATEGORIES = {
  economy: {
    label: "💵 الأغنى",
    color: 0xfbbf24,
    title: "💵 المتصدرين — الأغنى",
    description: "الأكثر فلوس",
    emoji: "💵",
    supportsServer: false, // الاقتصاد عالمي فقط
  },
  networth: {
    label: "💎 الثروة الكاملة",
    color: 0x38bdf8,
    title: "💎 المتصدرين — الثروة الكاملة",
    description: "الرصيد + قيمة الممتلكات",
    emoji: "💎",
    supportsServer: false, // كذلك عالمي
  },
  items: {
    label: "📦 أكثر ممتلكات",
    color: 0xf43f5e,
    title: "📦 المتصدرين — أكثر ممتلكات",
    description: "ترتيب حسب عدد عناصر الـ Inventory",
    emoji: "📦",
    supportsServer: false,
  },
  xp: {
    label: "⭐ الأعلى XP",
    color: 0xa855f7,
    title: "⭐ المتصدرين — الأعلى XP",
    description: "XP عبر السيرفر/كل السيرفرات",
    emoji: "⭐",
    supportsServer: true, // XP يدعم النطاق per-server
  },
  level: {
    label: "🏆 أعلى مستوى",
    color: 0x10b981,
    title: "🏆 المتصدرين — أعلى مستوى",
    description: "أعلى Level محقّق",
    emoji: "🏆",
    supportsServer: true,
  },
}

const TIME_FILTERS = {
  all:     { label: "∞ كل الوقت", short: "كل الوقت", days: 0 },
  monthly: { label: "🗓️ شهري",      short: "شهري",     days: 30 },
  weekly:  { label: "📆 أسبوعي",    short: "أسبوعي",   days: 7 },
  daily:   { label: "⚡ يومي",      short: "يومي",     days: 1 },
}

const SCOPES = {
  server: { label: "🏠 السيرفر الحالي", short: "السيرفر", emoji: "🏠" },
  global: { label: "🌍 عالمي",          short: "عالمي",   emoji: "🌍" },
}

const MEDALS = ["🥇", "🥈", "🥉"]

// ════════════════════════════════════════════════════════════
//  Cache (5 دقائق لكل combination)
// ════════════════════════════════════════════════════════════

const cache = new Map()

function cacheKey(category, period, scope, guildId) {
  return `${category}:${period}:${scope}:${guildId || "*"}`
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() })

  // safety: لو الـ cache كبر، احذف الأقدم
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
}

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

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

function calcItemsFromJson(inventory) {
  const items = inventoryHelper.normalize(inventory)
  let value = 0
  let count = 0
  for (const asset of items) {
    const def = ALL_ITEMS[asset.item_id]
    const qty = Number(asset.quantity) || 0
    count += qty
    if (def?.price) value += def.price * qty
  }
  return { value, count }
}

// ════════════════════════════════════════════════════════════
//  Data fetchers — Economy (عالمي فقط)
// ════════════════════════════════════════════════════════════

async function fetchEconomy(period) {
  const r = await database.query(
    `
    SELECT user_id, COALESCE(coins, 0)::bigint AS coins
    FROM economy_users
    WHERE COALESCE(coins, 0) > 0
    `
  )
  const rows = r.rows || []
  if (rows.length === 0) return []

  if (period === "all") {
    return rows
      .map((row) => ({
        user_id: row.user_id,
        coins: Number(row.coins),
        total: Number(row.coins),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 100)
      .map((p, i) => ({ ...p, rank: i + 1 }))
  }

  // فلتر زمني — احسب الفرق من snapshot
  const daysAgo = TIME_FILTERS[period].days
  const userIds = rows.map((r) => r.user_id)

  // جلب كل الـ snapshots دفعة واحدة (للسرعة)
  const snapResult = await database.query(
    `
    SELECT DISTINCT ON (user_id) user_id, coins
    FROM economy_snapshots
    WHERE user_id = ANY($1::text[])
      AND date <= CURRENT_DATE - $2::int
    ORDER BY user_id, date DESC
    `,
    [userIds, daysAgo]
  )

  const snapMap = new Map()
  for (const s of snapResult.rows || []) {
    snapMap.set(s.user_id, Number(s.coins) || 0)
  }

  const players = rows.map((row) => {
    const currentCoins = Number(row.coins)
    const pastCoins = snapMap.get(row.user_id) || 0
    const gained = Math.max(0, currentCoins - pastCoins)
    return {
      user_id: row.user_id,
      coins: currentCoins,
      coins_gained: gained,
      total: gained, // الترتيب على المكسب في الفترة
    }
  })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 100)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  return players
}

// ════════════════════════════════════════════════════════════
//  Data fetchers — Net Worth (عالمي فقط)
// ════════════════════════════════════════════════════════════

async function fetchNetworth(period) {
  const r = await database.query(
    `
    SELECT
      user_id,
      COALESCE(coins, 0)::bigint AS coins,
      COALESCE(inventory, '[]'::jsonb) AS inventory
    FROM economy_users
    WHERE COALESCE(coins, 0) > 0
       OR jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0
    `
  )
  const rows = r.rows || []
  if (rows.length === 0) return []

  // احسب net_worth الحالي لكل لاعب
  const enriched = rows.map((row) => {
    const coins = Number(row.coins) || 0
    const { value: itemsValue, count: itemsCount } = calcItemsFromJson(row.inventory)
    return {
      user_id: row.user_id,
      coins,
      items_value: itemsValue,
      total_items: itemsCount,
      net_worth: coins + itemsValue,
    }
  })

  if (period === "all") {
    return enriched
      .filter((p) => p.net_worth > 0)
      .sort((a, b) => b.net_worth - a.net_worth)
      .slice(0, 100)
      .map((p, i) => ({ ...p, rank: i + 1 }))
  }

  // فلتر زمني
  const daysAgo = TIME_FILTERS[period].days
  const userIds = enriched.map((e) => e.user_id)

  const snapResult = await database.query(
    `
    SELECT DISTINCT ON (user_id) user_id, net_worth
    FROM economy_snapshots
    WHERE user_id = ANY($1::text[])
      AND date <= CURRENT_DATE - $2::int
    ORDER BY user_id, date DESC
    `,
    [userIds, daysAgo]
  )

  const snapMap = new Map()
  for (const s of snapResult.rows || []) {
    snapMap.set(s.user_id, Number(s.net_worth) || 0)
  }

  return enriched
    .map((e) => {
      const pastNw = snapMap.get(e.user_id) || 0
      const gained = Math.max(0, e.net_worth - pastNw)
      return { ...e, net_worth_gained: gained, total: gained }
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 100)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

// ════════════════════════════════════════════════════════════
//  Data fetchers — Items (عالمي فقط)
// ════════════════════════════════════════════════════════════

async function fetchItems(period) {
  const r = await database.query(
    `
    SELECT
      user_id,
      COALESCE(inventory, '[]'::jsonb) AS inventory,
      (
        SELECT COALESCE(SUM(COALESCE((item->>'quantity')::int, 0)), 0)
        FROM jsonb_array_elements(COALESCE(inventory, '[]'::jsonb)) AS item
      )::int AS total_items,
      jsonb_array_length(COALESCE(inventory, '[]'::jsonb))::int AS unique_items
    FROM economy_users
    WHERE jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0
    `
  )
  const rows = r.rows || []
  if (rows.length === 0) return []

  const enriched = rows.map((row) => {
    const { value: itemsValue } = calcItemsFromJson(row.inventory)
    return {
      user_id: row.user_id,
      total_items: Number(row.total_items) || 0,
      unique_items: Number(row.unique_items) || 0,
      items_value: itemsValue,
    }
  })

  if (period === "all") {
    return enriched
      .sort((a, b) => b.total_items - a.total_items)
      .slice(0, 100)
      .map((p, i) => ({ ...p, rank: i + 1 }))
  }

  const daysAgo = TIME_FILTERS[period].days
  const userIds = enriched.map((e) => e.user_id)

  const snapResult = await database.query(
    `
    SELECT DISTINCT ON (user_id) user_id, items_count
    FROM economy_snapshots
    WHERE user_id = ANY($1::text[])
      AND date <= CURRENT_DATE - $2::int
    ORDER BY user_id, date DESC
    `,
    [userIds, daysAgo]
  )

  const snapMap = new Map()
  for (const s of snapResult.rows || []) {
    snapMap.set(s.user_id, Number(s.items_count) || 0)
  }

  return enriched
    .map((e) => {
      const pastCount = snapMap.get(e.user_id) || 0
      const gained = Math.max(0, e.total_items - pastCount)
      return { ...e, items_gained: gained, total: gained }
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 100)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

// ════════════════════════════════════════════════════════════
//  Data fetchers — XP (يدعم السيرفر/عالمي)
// ════════════════════════════════════════════════════════════

async function fetchXP(period, scope, guildId) {
  let sql
  let params

  if (scope === "server" && guildId) {
    // XP في السيرفر هذا فقط
    sql = `
      SELECT
        user_id,
        COALESCE(level, 0) AS level,
        COALESCE(xp, 0) AS xp,
        ((COALESCE(level, 0) * (COALESCE(level, 0) - 1) * 50) + COALESCE(xp, 0))::bigint AS total_xp
      FROM xp
      WHERE guild_id = $1
        AND (xp > 0 OR level > 0)
      ORDER BY total_xp DESC
    `
    params = [guildId]
  } else {
    // XP عالمي — مجموع كل السيرفرات
    sql = `
      SELECT
        user_id,
        COUNT(DISTINCT guild_id)::int AS servers_count,
        SUM(level)::bigint AS total_levels,
        SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
        MAX(level)::int AS highest_level
      FROM xp
      WHERE xp > 0 OR level > 0
      GROUP BY user_id
      ORDER BY total_xp DESC
      LIMIT 100
    `
    params = []
  }

  const r = await database.query(sql, params)
  const rows = r.rows || []
  if (rows.length === 0) return []

  if (period === "all") {
    return rows.map((row, i) => ({
      rank: i + 1,
      user_id: row.user_id,
      total_xp: Number(row.total_xp),
      total_levels: Number(row.total_levels) || 0,
      highest_level: Number(row.highest_level) || Number(row.level) || 0,
      servers_count: Number(row.servers_count) || 1,
    }))
  }

  // فلتر زمني — احسب الفرق من snapshot
  const daysAgo = TIME_FILTERS[period].days
  const userIds = rows.map((r) => r.user_id)

  let snapSql, snapParams
  if (scope === "server" && guildId) {
    snapSql = `
      SELECT DISTINCT ON (user_id) user_id, total_xp
      FROM xp_snapshots
      WHERE user_id = ANY($1::text[])
        AND guild_id = $2
        AND date <= CURRENT_DATE - $3::int
      ORDER BY user_id, date DESC
    `
    snapParams = [userIds, guildId, daysAgo]
  } else {
    // عالمي — مجموع snapshot عبر كل السيرفرات
    snapSql = `
      SELECT user_id, SUM(total_xp)::bigint AS total_xp
      FROM (
        SELECT DISTINCT ON (user_id, guild_id) user_id, guild_id, total_xp
        FROM xp_snapshots
        WHERE user_id = ANY($1::text[])
          AND date <= CURRENT_DATE - $2::int
        ORDER BY user_id, guild_id, date DESC
      ) sub
      GROUP BY user_id
    `
    snapParams = [userIds, daysAgo]
  }

  const snapResult = await database.query(snapSql, snapParams)
  const snapMap = new Map()
  for (const s of snapResult.rows || []) {
    snapMap.set(s.user_id, Number(s.total_xp) || 0)
  }

  return rows
    .map((row) => {
      const currentXp = Number(row.total_xp)
      const pastXp = snapMap.get(row.user_id) || 0
      const gained = Math.max(0, currentXp - pastXp)
      return {
        user_id: row.user_id,
        total_xp: currentXp,
        xp_gained: gained,
        total: gained,
        servers_count: Number(row.servers_count) || 1,
        highest_level: Number(row.highest_level) || Number(row.level) || 0,
      }
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 100)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

// ════════════════════════════════════════════════════════════
//  Data fetchers — Level (يدعم السيرفر/عالمي)
// ════════════════════════════════════════════════════════════

async function fetchLevel(period, scope, guildId) {
  let sql, params

  if (scope === "server" && guildId) {
    sql = `
      SELECT user_id, guild_id, level, xp,
             ((level * (level - 1) * 50) + xp)::bigint AS total_xp
      FROM xp
      WHERE guild_id = $1 AND level > 0
      ORDER BY level DESC, xp DESC
      LIMIT 100
    `
    params = [guildId]
  } else {
    sql = `
      SELECT user_id, guild_id, level, xp,
             ((level * (level - 1) * 50) + xp)::bigint AS total_xp
      FROM xp
      WHERE level > 0
      ORDER BY level DESC, xp DESC
      LIMIT 100
    `
    params = []
  }

  const r = await database.query(sql, params)
  const rows = r.rows || []
  if (rows.length === 0) return []

  // لو "كل الوقت" → أرجع المستويات كما هي
  if (period === "all") {
    return rows.map((row, i) => ({
      rank: i + 1,
      user_id: row.user_id,
      guild_id: row.guild_id,
      level: Number(row.level),
      total_xp: Number(row.total_xp),
    }))
  }

  // فلتر زمني — احسب كم مستوى صعد في الفترة
  const daysAgo = TIME_FILTERS[period].days
  const userIds = rows.map((r) => r.user_id)

  const snapResult = await database.query(
    `
    SELECT DISTINCT ON (user_id, guild_id) user_id, guild_id, level
    FROM xp_snapshots
    WHERE user_id = ANY($1::text[])
      ${scope === "server" && guildId ? "AND guild_id = $3" : ""}
      AND date <= CURRENT_DATE - $2::int
    ORDER BY user_id, guild_id, date DESC
    `,
    scope === "server" && guildId ? [userIds, daysAgo, guildId] : [userIds, daysAgo]
  )

  const snapMap = new Map()
  for (const s of snapResult.rows || []) {
    snapMap.set(`${s.user_id}:${s.guild_id}`, Number(s.level) || 0)
  }

  return rows
    .map((row) => {
      const key = `${row.user_id}:${row.guild_id}`
      const pastLevel = snapMap.get(key) || 0
      const gained = Math.max(0, Number(row.level) - pastLevel)
      return {
        user_id: row.user_id,
        guild_id: row.guild_id,
        level: Number(row.level),
        levels_gained: gained,
        total: gained,
        total_xp: Number(row.total_xp),
      }
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 100)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

// ════════════════════════════════════════════════════════════
//  Dispatcher
// ════════════════════════════════════════════════════════════

async function fetchLeaderboard(category, period, scope, guildId) {
  const key = cacheKey(category, period, scope, guildId)
  const cached = getCached(key)
  if (cached) return cached

  let result
  switch (category) {
    case "economy":  result = await fetchEconomy(period); break
    case "networth": result = await fetchNetworth(period); break
    case "items":    result = await fetchItems(period); break
    case "xp":       result = await fetchXP(period, scope, guildId); break
    case "level":    result = await fetchLevel(period, scope, guildId); break
    default:         result = []
  }

  setCached(key, result)
  return result
}

// ════════════════════════════════════════════════════════════
//  Username resolver
// ════════════════════════════════════════════════════════════

async function resolveUsernames(client, userIds) {
  const map = new Map()
  const results = await Promise.allSettled(
    userIds.map(async (id) => {
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

function formatRow(item, category, period, usernames) {
  const name = usernames.get(item.user_id) || `User ${item.user_id.slice(-6)}`
  const medal = rankPrefix(item.rank)
  const isFiltered = period !== "all"

  switch (category) {
    case "economy": {
      const value = isFiltered ? item.coins_gained : item.total
      const sign = isFiltered ? "+" : ""
      return `${medal} **${name}** — \`${sign}${formatCompact(value)}\` كوين${isFiltered ? " مكسوبة" : ""}`
    }

    case "networth": {
      if (isFiltered) {
        return `${medal} **${name}** — \`+${formatCompact(item.net_worth_gained)}\` نمو\n` +
               `      💎 الإجمالي: ${formatCompact(item.net_worth)}`
      }
      return `${medal} **${name}** — \`${formatCompact(item.net_worth)}\` ثروة\n` +
             `      💰 ${formatCompact(item.coins)} نقدي • 📦 ${item.total_items} عنصر`
    }

    case "items": {
      if (isFiltered) {
        return `${medal} **${name}** — \`+${item.items_gained}\` عنصر جديد\n` +
               `      📦 الإجمالي: ${item.total_items}`
      }
      return `${medal} **${name}** — \`${item.total_items}\` عنصر\n` +
             `      🌟 ${item.unique_items} نوع • 💎 ${formatCompact(item.items_value)}`
    }

    case "xp": {
      if (isFiltered) {
        return `${medal} **${name}** — \`+${formatCompact(item.xp_gained)}\` XP مكسوبة\n` +
               `      ⭐ الإجمالي: ${formatCompact(item.total_xp)} • 📈 Lv.${item.highest_level}`
      }
      return `${medal} **${name}** — \`${formatCompact(item.total_xp)}\` XP\n` +
             `      🎮 ${item.servers_count} سيرفر • 📈 Lv.${item.highest_level}`
    }

    case "level": {
      if (isFiltered) {
        return `${medal} **${name}** — \`+${item.levels_gained}\` مستوى صاعد\n` +
               `      🏆 الحالي: Lv.${item.level}`
      }
      return `${medal} **${name}** — \`Lv.${item.level}\`\n` +
             `      ⭐ ${formatCompact(item.total_xp)} XP`
    }

    default:
      return `${medal} ${name}`
  }
}

// ════════════════════════════════════════════════════════════
//  Build Embed
// ════════════════════════════════════════════════════════════

function buildEmbed({ category, period, scope, page, totalPages, pageItems, allItems, myRank, usernames, guild }) {
  const cat = CATEGORIES[category]
  const periodLabel = TIME_FILTERS[period].short
  const scopeLabel = SCOPES[scope].short
  const showScope = cat.supportsServer // فقط XP/Level يتأثرون بالنطاق

  const embed = new EmbedBuilder()
    .setColor(cat.color)
    .setTitle(cat.title)
    .setDescription(
      `${cat.description}\n` +
      `📅 الفترة: **${periodLabel}**${showScope ? ` • 🌐 النطاق: **${scopeLabel}**` : ""} • 📄 الصفحة **${page}/${totalPages}**`
    )

  if (pageItems.length === 0) {
    const tip = period === "all"
      ? "🏜️ ما فيه بيانات. استخدموا `/يومي` و `/عمل` لتبدأون!"
      : "🏜️ ما فيه نشاط في هذه الفترة بعد.\n💡 الفلتر الزمني يعرض اللي كسبوا في الفترة فقط."

    embed.addFields({ name: "📊 الترتيب", value: tip, inline: false })
  } else {
    const lines = pageItems.map((item) => formatRow(item, category, period, usernames))
    embed.addFields({
      name: `📊 الترتيب (${pageItems[0].rank} - ${pageItems[pageItems.length - 1].rank})`,
      value: lines.join("\n\n"),
      inline: false,
    })
  }

  embed.addFields(
    { name: "👥 إجمالي اللاعبين", value: `${allItems.length}`, inline: true },
    { name: "📍 ترتيبك", value: myRank || "غير مصنّف", inline: true },
    { name: "🌐 المصدر", value: showScope ? scopeLabel : "عالمي", inline: true }
  )

  embed.setFooter({
    text: `${guild.name} • Lyn — متصدرين أسطوريون`,
    iconURL: guild.iconURL({ dynamic: true }) || undefined,
  })
  embed.setTimestamp()

  return embed
}

// ════════════════════════════════════════════════════════════
//  Build Components
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

function buildPeriodScopeSelect(currentPeriod, currentScope, category) {
  const supportsServer = CATEGORIES[category].supportsServer

  // اجمع الفلاتر مع النطاق في select واحد (لتوفير row)
  // لكن لو الفئة ما تدعم scope → نعرض الفترات فقط
  const options = []

  for (const [key, cfg] of Object.entries(TIME_FILTERS)) {
    if (supportsServer) {
      // نسخة للسيرفر
      options.push({
        label: `${cfg.label} • 🏠 السيرفر`,
        value: `${key}:server`,
        default: currentPeriod === key && currentScope === "server",
      })
      // نسخة للعالمي
      options.push({
        label: `${cfg.label} • 🌍 عالمي`,
        value: `${key}:global`,
        default: currentPeriod === key && currentScope === "global",
      })
    } else {
      options.push({
        label: cfg.label,
        value: `${key}:global`,
        default: currentPeriod === key,
      })
    }
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("lb_period_scope")
    .setPlaceholder("اختر الفترة والنطاق...")
    .addOptions(options.slice(0, 25)) // حد Discord

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
    .setDescription("عرض المتصدرين — 5 فئات + فلاتر زمنية حقيقية + نطاق سيرفر/عالمي")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("النوع")
        .setDescription("نوع الترتيب")
        .setRequired(false)
        .addChoices(
          { name: "💵 الأغنى", value: "economy" },
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
    )
    .addStringOption((option) =>
      option
        .setName("النطاق")
        .setDescription("السيرفر فقط أو عالمي (للـ XP و Level)")
        .setRequired(false)
        .addChoices(
          { name: "🏠 السيرفر الحالي", value: "server" },
          { name: "🌍 عالمي", value: "global" }
        )
    ),

  helpMeta: {
    category: "economy",
    aliases: ["leaderboard", "top", "rich", "متصدرين"],
    description: "المتصدرين الأسطوريون — 5 فئات + فلاتر حقيقية + سيرفر/عالمي",
    options: [
      { name: "النوع", description: "الأغنى / الثروة / الممتلكات / XP / Level", required: false },
      { name: "الفترة", description: "كل الوقت / يومي / أسبوعي / شهري", required: false },
      { name: "النطاق", description: "السيرفر / عالمي (للـ XP و Level فقط)", required: false },
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
      "/متصدرين النوع:⭐ الأعلى XP النطاق:🏠 السيرفر الحالي",
      "/متصدرين النوع:💵 الأغنى الفترة:📆 أسبوعي",
    ],
    notes: [
      "الفلاتر الزمنية تعرض اللي كسبوا في الفترة (مو الإجمالي)",
      "النطاق يأثر فقط على XP و Level",
      "الاقتصاد والممتلكات عالميون دائماً",
      "Snapshot يومي تلقائي يضمن دقة الأرقام",
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

      const state = {
        category: interaction.options.getString("النوع") || "xp",
        period: interaction.options.getString("الفترة") || "all",
        scope: interaction.options.getString("النطاق") || "server",
        page: 1,
        allItems: [],
        usernames: new Map(),
      }

      const sessionId = `${interaction.user.id}_${Date.now()}`

      const render = async () => {
        // لو الفئة ما تدعم scope → اجبر على global
        const effectiveScope = CATEGORIES[state.category].supportsServer
          ? state.scope
          : "global"

        state.allItems = await fetchLeaderboard(
          state.category,
          state.period,
          effectiveScope,
          interaction.guild.id
        )

        const totalPages = Math.max(1, Math.ceil(state.allItems.length / PAGE_SIZE))
        if (state.page > totalPages) state.page = totalPages

        const startIdx = (state.page - 1) * PAGE_SIZE
        const pageItems = state.allItems.slice(startIdx, startIdx + PAGE_SIZE)

        const idsToResolve = pageItems.map((x) => x.user_id)
        const newNames = await resolveUsernames(client, idsToResolve)
        for (const [id, name] of newNames) state.usernames.set(id, name)

        const myRank = findMyRank(state.allItems, interaction.user.id)

        const embed = buildEmbed({
          category: state.category,
          period: state.period,
          scope: effectiveScope,
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
          buildPeriodScopeSelect(state.period, effectiveScope, state.category),
          buildPaginationButtons(state.page, totalPages, sessionId),
          buildExtraButtons(),
        ]

        return { embed, components }
      }

      const initial = await render()
      const response = await interaction.editReply({
        embeds: [initial.embed],
        components: initial.components,
      })

      const collector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: COLLECTOR_TIMEOUT_MS,
      })

      collector.on("collect", async (i) => {
        try {
          await i.deferUpdate()

          const customId = i.customId

          if (customId === "lb_category" && i.isStringSelectMenu()) {
            state.category = i.values[0]
            state.page = 1
          } else if (customId === "lb_period_scope" && i.isStringSelectMenu()) {
            const [period, scope] = i.values[0].split(":")
            state.period = period
            state.scope = scope
            state.page = 1
          } else if (customId.startsWith("lb_first:")) {
            state.page = 1
          } else if (customId.startsWith("lb_prev:")) {
            state.page = Math.max(1, state.page - 1)
          } else if (customId.startsWith("lb_next:")) {
            const totalPages = Math.ceil(state.allItems.length / PAGE_SIZE)
            state.page = Math.min(totalPages, state.page + 1)
          } else if (customId.startsWith("lb_last:")) {
            state.page = Math.ceil(state.allItems.length / PAGE_SIZE)
          } else if (customId === "lb_refresh") {
            // Force re-fetch — امسح الـ cache
            const effectiveScope = CATEGORIES[state.category].supportsServer
              ? state.scope
              : "global"
            cache.delete(cacheKey(state.category, state.period, effectiveScope, interaction.guild.id))
          }

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