// ══════════════════════════════════════════════════════════════════
//  INVENTORY HELPER — Global Inventory (JSONB)
//  المسار: utils/inventoryHelper.js
//
//  يدير ممتلكات المستخدم المخزنة في economy_users.inventory (JSONB).
//  الشكل: [{ item_id: "tesla_model_s", quantity: 1 }, ...]
//
//  ⚠️ ملاحظات:
//   - النظام عالمي — بدون guild_id
//   - يدعم العناصر العالمية (ALL_ITEMS) + عناصر متجر السيرفر (shop_<id>)
//   - كل العمليات تستخدم اللوك المناسب داخل transactions (في الـ commands)
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")

// ══════════════════════════════════════
//  Normalize raw inventory from DB
//  يضمن إن الـ inventory دائماً array من {item_id, quantity}
// ══════════════════════════════════════

function normalize(rawInventory) {
  if (!rawInventory) return []
  
  // لو string، حاول parse
  let arr = rawInventory
  if (typeof rawInventory === "string") {
    try {
      arr = JSON.parse(rawInventory)
    } catch {
      return []
    }
  }
  
  if (!Array.isArray(arr)) return []
  
  // فلتر العناصر الصالحة فقط
  return arr
    .filter(a => a && typeof a === "object" && a.item_id)
    .map(a => ({
      item_id: String(a.item_id),
      quantity: Math.max(0, parseInt(a.quantity) || 0)
    }))
    .filter(a => a.quantity > 0)
}

// ══════════════════════════════════════
//  Get user's inventory (global)
//  يرجع array دائماً (فاضي لو ما عنده)
// ══════════════════════════════════════

async function getInventory(userId) {
  if (!userId) return []
  
  try {
    const result = await databaseSystem.query(
      "SELECT inventory FROM economy_users WHERE user_id = $1",
      [userId]
    )
    if (!result.rows.length) return []
    
    return normalize(result.rows[0].inventory)
  } catch (err) {
    logger.error("INVENTORY_GET_FAILED", { error: err.message, userId })
    return []
  }
}

// ══════════════════════════════════════
//  Get inventories for multiple users (bulk)
//  للـ leaderboard و globalLeaderboards
//  يرجع Map<user_id, assets[]>
// ══════════════════════════════════════

async function getInventoriesBulk(userIds) {
  const map = new Map()
  if (!Array.isArray(userIds) || userIds.length === 0) return map
  
  try {
    const result = await databaseSystem.query(
      "SELECT user_id, inventory FROM economy_users WHERE user_id = ANY($1)",
      [userIds]
    )
    for (const row of result.rows || []) {
      map.set(row.user_id, normalize(row.inventory))
    }
  } catch (err) {
    logger.error("INVENTORY_BULK_GET_FAILED", { error: err.message })
  }
  
  return map
}

// ══════════════════════════════════════
//  Get quantity of a specific item
// ══════════════════════════════════════

async function getItemQuantity(userId, itemId) {
  const inv = await getInventory(userId)
  const item = inv.find(a => a.item_id === itemId)
  return item ? item.quantity : 0
}

// ══════════════════════════════════════
//  Add item to user's inventory
//  ⚠️ إذا كنت داخل transaction، استخدم addItemTx بدلاً
// ══════════════════════════════════════

async function addItem(userId, itemId, quantity = 1) {
  if (!userId || !itemId || quantity <= 0) return false
  
  try {
    // ensure user exists
    await databaseSystem.query(
      `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
       VALUES ($1, 0, 0, 0, '[]'::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    )
    
    const current = await getInventory(userId)
    const idx = current.findIndex(a => a.item_id === itemId)
    
    if (idx >= 0) {
      current[idx].quantity += quantity
    } else {
      current.push({ item_id: String(itemId), quantity })
    }
    
    await databaseSystem.query(
      "UPDATE economy_users SET inventory = $1::jsonb WHERE user_id = $2",
      [JSON.stringify(current), userId]
    )
    
    return true
  } catch (err) {
    logger.error("INVENTORY_ADD_FAILED", { error: err.message, userId, itemId })
    return false
  }
}

// ══════════════════════════════════════
//  Remove item from user's inventory
// ══════════════════════════════════════

async function removeItem(userId, itemId, quantity = 1) {
  if (!userId || !itemId || quantity <= 0) return false
  
  try {
    const current = await getInventory(userId)
    const idx = current.findIndex(a => a.item_id === itemId)
    
    if (idx < 0) return false
    
    if (current[idx].quantity <= quantity) {
      current.splice(idx, 1)
    } else {
      current[idx].quantity -= quantity
    }
    
    await databaseSystem.query(
      "UPDATE economy_users SET inventory = $1::jsonb WHERE user_id = $2",
      [JSON.stringify(current), userId]
    )
    
    return true
  } catch (err) {
    logger.error("INVENTORY_REMOVE_FAILED", { error: err.message, userId, itemId })
    return false
  }
}

// ══════════════════════════════════════
//  TRANSACTION-AWARE Operations
//  تستخدم client من databaseManager.getClient() داخل BEGIN/COMMIT
// ══════════════════════════════════════

/**
 * يجلب inventory المستخدم داخل transaction (مع FOR UPDATE option)
 * @param {pg.PoolClient} client - client داخل BEGIN/COMMIT
 * @param {string} userId
 * @param {boolean} forUpdate - استخدم FOR UPDATE للقفل
 */
async function getInventoryTx(client, userId, forUpdate = false) {
  const sql = forUpdate
    ? "SELECT inventory FROM economy_users WHERE user_id = $1 FOR UPDATE"
    : "SELECT inventory FROM economy_users WHERE user_id = $1"
  
  const result = await client.query(sql, [userId])
  if (!result.rows.length) return []
  return normalize(result.rows[0].inventory)
}

/**
 * يحفظ inventory جديد داخل transaction
 */
async function setInventoryTx(client, userId, inventory) {
  const normalized = normalize(inventory)
  await client.query(
    "UPDATE economy_users SET inventory = $1::jsonb WHERE user_id = $2",
    [JSON.stringify(normalized), userId]
  )
  return normalized
}

/**
 * يضيف عنصر للـ inventory داخل transaction
 * يعدّل array محلياً ثم يحفظ — سريع وآمن
 */
function addItemToArray(inventory, itemId, quantity = 1) {
  const arr = normalize(inventory)
  const idx = arr.findIndex(a => a.item_id === itemId)
  if (idx >= 0) {
    arr[idx].quantity += quantity
  } else {
    arr.push({ item_id: String(itemId), quantity })
  }
  return arr
}

/**
 * يزيل عنصر من array الـ inventory
 */
function removeItemFromArray(inventory, itemId, quantity = 1) {
  const arr = normalize(inventory)
  const idx = arr.findIndex(a => a.item_id === itemId)
  if (idx < 0) return arr
  
  if (arr[idx].quantity <= quantity) {
    arr.splice(idx, 1)
  } else {
    arr[idx].quantity -= quantity
  }
  return arr
}

/**
 * يجلب كمية عنصر من array (بدون DB call)
 */
function getQuantityFromArray(inventory, itemId) {
  const arr = normalize(inventory)
  const item = arr.find(a => a.item_id === itemId)
  return item ? item.quantity : 0
}

module.exports = {
  // Read
  getInventory,
  getInventoriesBulk,
  getItemQuantity,
  
  // Write (auto-commit)
  addItem,
  removeItem,
  
  // Transaction-aware
  getInventoryTx,
  setInventoryTx,
  addItemToArray,
  removeItemFromArray,
  getQuantityFromArray,
  
  // Helpers
  normalize
}