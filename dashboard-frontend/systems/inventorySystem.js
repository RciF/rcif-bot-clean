const inventoryRepository = require("../repositories/inventoryRepository")

async function addItem(userId, guildId, itemId, quantity = 1) {
  if (!itemId) {
    return { success: false, message: "عنصر غير صالح" }
  }

  if (quantity <= 0) {
    return { success: false, message: "كمية غير صالحة" }
  }

  await inventoryRepository.addItem(userId, guildId, itemId, quantity)

  return {
    success: true,
    itemId,
    quantity
  }
}

async function removeItem(userId, guildId, itemId, quantity = 1) {
  if (quantity <= 0) {
    return { success: false, message: "كمية غير صالحة" }
  }

  await inventoryRepository.removeItem(userId, guildId, itemId, quantity)

  return {
    success: true
  }
}

async function hasItem(userId, guildId, itemId, quantity = 1) {
  const inventory = await inventoryRepository.getInventory(userId, guildId)

  if (!inventory) return false

  const item = inventory.find(i => i.item_id === itemId)

  return item && item.quantity >= quantity
}

async function getInventory(userId, guildId) {
  const inventory = await inventoryRepository.getInventory(userId, guildId)
  return inventory || []
}

async function getItemQuantity(userId, guildId, itemId) {
  const inventory = await inventoryRepository.getInventory(userId, guildId)

  if (!inventory) return 0

  const item = inventory.find(i => i.item_id === itemId)

  return item ? item.quantity : 0
}

module.exports = {
  addItem,
  removeItem,
  hasItem,
  getInventory,
  getItemQuantity
}