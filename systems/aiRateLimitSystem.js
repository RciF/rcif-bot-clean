const cacheSystem = require("../utils/cacheSystem")

const RATE_LIMIT_SECONDS = 10  // 10 ثواني بين كل استخدام
const HOURLY_LIMIT = 30        // 30 طلب بالساعة

const OWNER_ID = "529320108032786433"

// ✅ FIX: كان ناقص canUseAI — اللي يستخدمه aiAutoReplySystem
function canUseAI(userId) {

  if (!userId) return false

  // المالك بدون حدود
  if (userId === OWNER_ID) return true

  // حد سرعة
  const rateLimitKey = `ai_rate_${userId}`
  if (isLimited(rateLimitKey, RATE_LIMIT_SECONDS)) {
    return false
  }

  // حد ساعي
  const hourlyKey = `ai_hourly_${userId}`
  const hourlyCount = cacheSystem.get(hourlyKey) || 0

  if (hourlyCount >= HOURLY_LIMIT) {
    return false
  }

  cacheSystem.set(hourlyKey, hourlyCount + 1, 3600000) // ساعة

  return true
}

function isLimited(key, seconds) {

  const now = Date.now()

  if (cacheSystem.has(key)) {

    const last = cacheSystem.get(key)

    if (now - last < seconds * 1000) {
      return true
    }

  }

  cacheSystem.set(key, now)

  return false
}

module.exports = {
  isLimited,
  canUseAI  // ✅ الآن موجود
}