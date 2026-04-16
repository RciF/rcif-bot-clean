const userRepository = require("../repositories/userRepository")

async function getUser(userId, guildId) {
  const user = await userRepository.getOrCreateUser(userId, guildId)

  // ✅ FIX: formatUser ليست async، لا حاجة لـ await
  return formatUser(user)
}

async function addCoins(userId, guildId, amount) {
  if (amount <= 0) {
    return { success: false, message: "قيمة غير صالحة" }
  }

  const user = await userRepository.getOrCreateUser(userId, guildId)

  const newBalance = (user.coins ?? 0) + amount

  await userRepository.updateCoins(userId, guildId, newBalance)

  return {
    success: true,
    coins: newBalance
  }
}

async function removeCoins(userId, guildId, amount) {
  if (amount <= 0) {
    return { success: false, message: "قيمة غير صالحة" }
  }

  const user = await userRepository.getOrCreateUser(userId, guildId)

  if ((user.coins ?? 0) < amount) {
    return { success: false, message: "رصيد غير كافي" }
  }

  const newBalance = user.coins - amount

  await userRepository.updateCoins(userId, guildId, newBalance)

  return {
    success: true,
    coins: newBalance
  }
}

async function addXP(userId, guildId, amount) {
  if (amount <= 0) {
    return { success: false }
  }

  const user = await userRepository.getOrCreateUser(userId, guildId)

  const newXP = (user.xp ?? 0) + amount

  await userRepository.updateXP(userId, guildId, newXP)

  return {
    success: true,
    xp: newXP
  }
}

// ✅ FIX: formatUser دالة عادية (sync) - لا تحتاج async/await
function formatUser(user) {
  return {
    id: user.id,
    coins: user.coins ?? 0,
    xp: user.xp ?? 0,
    level: calculateLevel(user.xp ?? 0)
  }
}

function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp))
}

module.exports = {
  getUser,
  addCoins,
  removeCoins,
  addXP,
  calculateLevel
}