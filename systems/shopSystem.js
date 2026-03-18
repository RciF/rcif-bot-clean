const userRepository = require("../repositories/userRepository")
const inventorySystem = require("./inventorySystem")

function getShopItems() {
  return [
    {
      id: "vip",
      name: "VIP Rank",
      price: 5000,
      description: "رتبة VIP في السيرفر"
    },
    {
      id: "xp_boost",
      name: "XP Boost",
      price: 2000,
      description: "زيادة XP لمدة مؤقتة"
    },
    {
      id: "color_role",
      name: "Color Role",
      price: 1000,
      description: "الحصول على رتبة لون"
    }
  ]
}

async function buyItem(userId, guildId, itemId) {
  try {
    const user = await userRepository.getOrCreateUser(userId, guildId)

    const shop = getShopItems()
    const item = shop.find(i => i.id === itemId)

    if (!item) {
      return { success: false, message: "العنصر غير موجود" }
    }

    if (user.coins < item.price) {
      return { success: false, message: "ليس لديك كوين كافي" }
    }

    const newBalance = user.coins - item.price

    // استخدام repository بدلاً من databaseSystem
    await userRepository.updateCoins(userId, guildId, newBalance)

    await inventorySystem.addItem(userId, guildId, itemId)

    return {
      success: true,
      item,
      coins: newBalance
    }

  } catch (error) {
    throw error
  }
}

module.exports = {
  getShopItems,
  buyItem
}