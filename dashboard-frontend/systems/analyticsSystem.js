const analyticsRepository = require("../repositories/analyticsRepository")

// ✅ NEW: cache بسيط لتقليل الضغط
let cachedStats = null
let lastFetchTime = 0
const CACHE_TTL = 5000 // 5 ثواني

async function trackCommand(commandName) {

  try {

    if (!commandName) return

    await analyticsRepository.trackCommand(commandName)

    // ✅ invalidate cache
    cachedStats = null

  } catch (error) {

    // منع crash
  }

}

async function getAnalytics() {

  try {

    const now = Date.now()

    // ✅ استخدام الكاش
    if (cachedStats && (now - lastFetchTime < CACHE_TTL)) {
      return cachedStats
    }

    const stats = await analyticsRepository.getAnalytics()

    cachedStats = stats || {}
    lastFetchTime = now

    return cachedStats

  } catch (error) {

    return cachedStats || {}

  }

}

module.exports = {
  trackCommand,
  getAnalytics
}