const cacheSystem = require("../utils/cacheSystem")

const LIMIT_WINDOW = 60 * 1000
const MAX_TOKENS = 30000

const OWNER_ID = "529320108032786433"

function canUseTokens(userId, tokens) {

  if (!userId) return false

  if (userId === OWNER_ID) {
    return true
  }

  if (!tokens || tokens <= 0) {
    return true
  }

  const key = `ai_tokens_${userId}`
  const data = cacheSystem.get(key)

  const now = Date.now()

  if (!data || typeof data !== "object") {

    cacheSystem.set(key, {
      tokens: tokens,
      start: now
    }, LIMIT_WINDOW)

    return true
  }

  if (!data.start || now - data.start > LIMIT_WINDOW) {

    cacheSystem.set(key, {
      tokens: tokens,
      start: now
    }, LIMIT_WINDOW)

    return true
  }

  if (typeof data.tokens !== "number") {
    data.tokens = 0
  }

  if (data.tokens + tokens > MAX_TOKENS) {
    return false
  }

  data.tokens += tokens

  cacheSystem.set(key, data, LIMIT_WINDOW)

  return true
}

function getRemainingTokens(userId) {

  if (!userId) return 0

  if (userId === OWNER_ID) {
    return Infinity
  }

  const key = `ai_tokens_${userId}`
  const data = cacheSystem.get(key)

  if (!data || typeof data.tokens !== "number") {
    return MAX_TOKENS
  }

  return Math.max(0, MAX_TOKENS - data.tokens)
}

module.exports = {
  canUseTokens,
  getRemainingTokens
}