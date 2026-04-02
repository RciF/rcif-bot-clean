const cooldowns = new Map()

function canGainXP(userId) {
    const now = Date.now()
    const COOLDOWN = 30 * 1000

    if (!cooldowns.has(userId)) {
        cooldowns.set(userId, now)
        return true
    }

    const lastXP = cooldowns.get(userId)

    if (now - lastXP < COOLDOWN) {
        return false
    }

    cooldowns.set(userId, now)
    return true
}

module.exports = {
    canGainXP
}