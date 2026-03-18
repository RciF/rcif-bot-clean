const analyticsTracker = require("../systems/analyticsTracker")
const errorSystem = require("../systems/errorSystem")

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {

    if (!interaction.isChatInputCommand()) return

    const command = client.commands.get(interaction.commandName)

    if (!command) return

    analyticsTracker.trackCommand(interaction.commandName)

    try {

      await command.execute(interaction, client)

    } catch (error) {

      errorSystem.handleError(error)

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ حدث خطأ", ephemeral: true })
      } else {
        await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true })
      }

    }

  }

}