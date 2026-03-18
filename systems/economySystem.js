const guildSystem = require("./guildSystem")

function ensureEconomyEnabled(interaction) {
  if (!interaction || !interaction.guild) {
    return false
  }

  const enabled = guildSystem.isEconomyEnabled(interaction.guild.id)

  if (!enabled) {
    safeReply(interaction, "❌ نظام الاقتصاد معطل في هذا السيرفر")
    return false
  }

  return true
}

function safeReply(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content, ephemeral: true })
    } else {
      return interaction.reply({ content, ephemeral: true })
    }
  } catch (error) {
    // منع أي crash بسبب Discord API
    return null
  }
}

module.exports = {
  ensureEconomyEnabled
}