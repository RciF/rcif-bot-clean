const cacheSystem = require("../utils/cacheSystem")

const LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 8

const OWNER_ID = "529320108032786433"

function canUseAI(userId) {

    if (!userId) return false
    if (userId === OWNER_ID) return true

    const key = `ai_rl_${userId}`
    const now = Date.now()

    let data = cacheSystem.get(key)

    if (!data) {
        data = { count: 0, start: now }
    }

    // reset window
    if (now - data.start > LIMIT_WINDOW) {
        data.count = 0
        data.start = now
    }

    if (data.count >= MAX_REQUESTS) {
        return false
    }

    data.count++

    cacheSystem.set(key, data, LIMIT_WINDOW)

    return true
}

function getRemainingRequests(userId) {

    if (!userId) return 0
    if (userId === OWNER_ID) return Infinity

    const key = `ai_rl_${userId}`
    const data = cacheSystem.get(key)

    if (!data) return MAX_REQUESTS

    return Math.max(0, MAX_REQUESTS - data.count)
}

module.exports = {
    canUseAI,
    getRemainingRequests
}