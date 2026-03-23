const guildRepository = require("../repositories/guildRepository");

async function getGuild(guildId) {
  if (!guildId) return null;
  return await guildRepository.getOrCreateGuild(guildId);
}

async function updateGuild(guildId, data) {
  if (!guildId || !data) return null;

  let result = null;

  for (const key in data) {
    result = await guildRepository.updateGuildSetting(guildId, key, data[key]);
  }

  return result;
}

module.exports = {
  getGuild,
  updateGuild
};