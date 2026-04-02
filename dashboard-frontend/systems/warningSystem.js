const warningRepository = require("../repositories/warningRepository")

async function addWarning(guildId, userId, moderatorId, reason) {
  const warning = await warningRepository.addWarning(
    guildId,
    userId,
    moderatorId,
    reason
  )

  return warning
}

async function getWarnings(guildId, userId) {
  const warnings = await warningRepository.getWarnings(
    guildId,
    userId
  )

  return warnings
}

async function clearWarnings(guildId, userId) {
  await warningRepository.clearWarnings(
    guildId,
    userId
  )
}

module.exports = {
  addWarning,
  getWarnings,
  clearWarnings
}