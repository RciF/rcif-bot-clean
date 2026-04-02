const cooldowns = new Map()

function checkCooldown(userId, commandName, seconds) {

const now = Date.now()

const key = `${userId}-${commandName}`

if (!cooldowns.has(key)) {
cooldowns.set(key, now)
return 0
}

const lastUsed = cooldowns.get(key)

const cooldown = seconds * 1000

const remaining = cooldown - (now - lastUsed)

if (remaining > 0) {
return Math.ceil(remaining / 1000)
}

cooldowns.set(key, now)

return 0

}

module.exports = {
checkCooldown
}