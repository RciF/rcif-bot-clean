const guildManager = require("../utils/guildManager")
const logger = require("../systems/loggerSystem")

module.exports = {
  name: "guildCreate",

  async execute(guild) {
    try {
      await guildManager.getGuild(guild.id)

      logger.success("GUILD_JOINED", {
        name: guild.name,
        id: guild.id,
        members: guild.memberCount
      })

    } catch (err) {
      logger.error("GUILD_CREATE_FAILED", { error: err.message })
    }
  }

}