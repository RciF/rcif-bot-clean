const warningRepository = require("../repositories/warningRepository");

async function addWarning(guildId, userId, moderatorId, reason) {
  return await warningRepository.addWarning(guildId, userId, moderatorId, reason);
}

async function getWarnings(guildId, userId) {
  return await warningRepository.getWarnings(guildId, userId);
}

async function clearWarnings(guildId, userId) {
  return await warningRepository.clearWarnings(guildId, userId);
}

module.exports = {
  addWarning,
  getWarnings,
  clearWarnings
};