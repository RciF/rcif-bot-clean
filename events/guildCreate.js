const guildManager = require("../utils/guildManager")

module.exports = {
  name: "guildCreate",

  async execute(guild) {

    guildManager.getGuild(guild.id)

    console.log(`Joined new guild: ${guild.name}`)

  }

}