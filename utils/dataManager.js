const warningRepository = require("../repositories/warningRepository")
const logger = require("../systems/loggerSystem")

async function addWarning(guildId, userId, moderatorId, reason) {
  return await warningRepository.addWarning(guildId, userId, moderatorId, reason)
}

async function getWarnings(guildId, userId) {
  return await warningRepository.getWarnings(guildId, userId)
}

async function clearWarnings(guildId, userId) {
  return await warningRepository.clearWarnings(guildId, userId)
}

// ✅ FIX: backward compatibility — لو أي ملف قديم يستدعي load/save
function load(filename) {
  logger.warn("DATAMANAGER_LOAD_DEPRECATED", { filename })
  return {}
}

function save(filename, data) {
  logger.warn("DATAMANAGER_SAVE_DEPRECATED", { filename })
  return true
}

module.exports = {
  addWarning,
  getWarnings,
  clearWarnings,
  load,
  save
}