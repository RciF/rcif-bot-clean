const cacheSystem = require("../utils/cacheSystem")

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
  isLimited
}