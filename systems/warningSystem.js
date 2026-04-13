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

async function getAllWarnings(guildId) {
  const warnings = await warningRepository.getAllWarnings(guildId)

  return warnings
}

async function clearWarnings(guildId, userId) {
  await warningRepository.clearWarnings(
    guildId,
    userId
  )
}

async function deleteWarning(warningId) {
  await warningRepository.deleteWarning(warningId)
}

module.exports = {
  addWarning,
  getWarnings,
  getAllWarnings,
  clearWarnings
deleteWarning
}