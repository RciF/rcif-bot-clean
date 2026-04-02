const analyticsRepository = require("../repositories/analyticsRepository")
const logger = require("../systems/loggerSystem")

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {

    try {

      if (!interaction.isChatInputCommand()) return

      const command = client.commands.get(interaction.commandName)

      if (!command) return

      // 📊 تتبع الأوامر
      try {
        await analyticsRepository.trackCommand(interaction.commandName)
      } catch (err) {
        logger.error("ANALYTICS_FAILED", { error: err.message })
      }

      // 🚀 تنفيذ الأمر
      await command.execute(interaction, client)

    } catch (error) {

      logger.error("INTERACTION_EXECUTE_FAILED", {
        error: error.message,
        command: interaction.commandName
      })

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "❌ حدث خطأ",
            ephemeral: true
          })
        } else {
          await interaction.reply({
            content: "❌ حدث خطأ",
            ephemeral: true
          })
        }
      } catch {}

    }

  }
}