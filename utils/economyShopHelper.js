// ══════════════════════════════════════════════════════════════════
//  ECONOMY SHOP HELPER
//  المسار: utils/economyShopHelper.js
//
//  يقرأ العناصر المخصصة من جدول economy_shop (يديره الداش).
//  يدعم type: 'item' | 'role' | 'tool'
//  لو type='role' → يعطي الـ role_id عند الشراء.
//  لو type='item' → يضيفه للـ inventory.
//
//  Stock:
//   -1 = غير محدود (افتراضي)
//    0 = نفد
//   N = عدد محدود (يُنقص بعد كل شراء)
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")

const cache = new Map()
const TTL = 60 * 1000

// ══════════════════════════════════════
//  Load shop items للسيرفر
// ══════════════════════════════════════

async function getGuildShopItems(guildId) {
  if (!guildId) return []

  const now = Date.now()
  const cached = cache.get(guildId)
  if (cached && now < cached.expiresAt) return cached.data

  let rows = []
  try {
    const result = await databaseSystem.query(
      `SELECT * FROM economy_shop
       WHERE guild_id = $1
       ORDER BY price ASC`,
      [guildId]
    )
    rows = result.rows || []
  } catch (err) {
    logger.error("ECONOMY_SHOP_LOAD_FAILED", { error: err.message })
    rows = []
  }

  // فلترة العناصر النافدة (stock = 0)
  const items = rows
    .filter(r => r.stock === undefined || r.stock === null || r.stock === -1 || r.stock > 0)
    .map(r => ({
      id: `shop_${r.id}`,        // ID فريد بـ prefix shop_
      shop_id: r.id,             // ID الأصلي في DB
      name: r.name || "بدون اسم",
      emoji: r.emoji || "🛒",
      price: parseInt(r.price) || 0,
      type: r.type || "item",
      role_id: r.role_id || null,
      stock: r.stock != null ? parseInt(r.stock) : -1,
      description: r.description || ""
    }))

  cache.set(guildId, { data: items, expiresAt: now + TTL })
  return items
}

// ══════════════════════════════════════
//  Find item by ID (with shop_ prefix or numeric)
// ══════════════════════════════════════

async function getShopItemById(guildId, itemId) {
  if (!guildId || !itemId) return null

  // استخرج الـ DB id
  const dbId = String(itemId).startsWith("shop_")
    ? parseInt(String(itemId).slice(5))
    : parseInt(itemId)

  if (!isFinite(dbId)) return null

  try {
    const row = await databaseSystem.queryOne(
      "SELECT * FROM economy_shop WHERE id = $1 AND guild_id = $2",
      [dbId, guildId]
    )
    if (!row) return null

    return {
      id: `shop_${row.id}`,
      shop_id: row.id,
      name: row.name || "بدون اسم",
      emoji: row.emoji || "🛒",
      price: parseInt(row.price) || 0,
      type: row.type || "item",
      role_id: row.role_id || null,
      stock: row.stock != null ? parseInt(row.stock) : -1,
      description: row.description || ""
    }
  } catch (err) {
    logger.error("ECONOMY_SHOP_ITEM_FETCH_FAILED", { error: err.message })
    return null
  }
}

// ══════════════════════════════════════
//  Decrement stock بعد الشراء
// ══════════════════════════════════════

async function decrementStock(shopId, quantity = 1) {
  try {
    await databaseSystem.query(
      `UPDATE economy_shop
       SET stock = GREATEST(stock - $1, 0)
       WHERE id = $2 AND stock > 0`,
      [quantity, shopId]
    )
    return true
  } catch (err) {
    logger.error("ECONOMY_SHOP_STOCK_DECREMENT_FAILED", { error: err.message })
    return false
  }
}

// ══════════════════════════════════════
//  Cache invalidation
// ══════════════════════════════════════

function invalidateCache(guildId) {
  if (guildId) cache.delete(guildId)
  else cache.clear()
}

// ══════════════════════════════════════
//  Check if itemId is a shop item (vs ALL_ITEMS from config)
// ══════════════════════════════════════

function isShopItem(itemId) {
  return typeof itemId === "string" && itemId.startsWith("shop_")
}

module.exports = {
  getGuildShopItems,
  getShopItemById,
  decrementStock,
  invalidateCache,
  isShopItem
}