const analyticsTracker = require("../systems/analyticsTracker")
const errorSystem = require("../systems/errorSystem")
const ticketSystem = require("../systems/ticketSystem")

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {

    // ══════════════════════════════════════
    //  SLASH COMMANDS
    // ══════════════════════════════════════
    if (interaction.isChatInputCommand()) {

      const command = client.commands.get(interaction.commandName)

      if (!command) return

      analyticsTracker.trackCommand(interaction.commandName)

      try {

        await command.execute(interaction, client)

      } catch (error) {

        errorSystem.handleError(error)

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
        } else {
          await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
        }

      }

      return
    }

    // ══════════════════════════════════════
    //  AUTOCOMPLETE
    // ══════════════════════════════════════
    if (interaction.isAutocomplete()) {

      const command = client.commands.get(interaction.commandName)

      if (!command || !command.autocomplete) return

      try {

        await command.autocomplete(interaction, client)

      } catch (error) {

        console.error("[AUTOCOMPLETE ERROR]", error.message)

      }

      return
    }

    // ══════════════════════════════════════
    //  BUTTONS
    // ══════════════════════════════════════
    if (interaction.isButton()) {

      const customId = interaction.customId

      try {

        if (customId === "ticket_open") {
          return await ticketSystem.handleOpenButton(interaction)
        }

        if (customId === "ticket_close") {
          return await ticketSystem.handleCloseButton(interaction)
        }

        if (customId === "ticket_close_confirm") {
          return await ticketSystem.handleCloseConfirm(interaction)
        }

        if (customId === "ticket_close_cancel") {
          return await ticketSystem.handleCloseCancel(interaction)
        }

        if (customId === "ticket_lock") {
          return await ticketSystem.handleLockButton(interaction)
        }

        if (customId === "ticket_unlock") {
          return await ticketSystem.handleUnlockButton(interaction)
        }

        if (customId === "ticket_claim") {
          return await ticketSystem.handleClaimButton(interaction)
        }

        if (customId === "ticket_transcript") {
          return await ticketSystem.handleTranscriptButton(interaction)
        }

        if (customId === "ticket_delete") {
          return await ticketSystem.handleDeleteButton(interaction)
        }

        if (customId === "ticket_reopen") {
          return await ticketSystem.handleReopenButton(interaction)
        }

        if (customId.startsWith("ticket_priority_")) {
          return await ticketSystem.handlePriorityButton(interaction)
        }

      } catch (error) {

        console.error("[BUTTON ERROR]", error.message)

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "❌ حدث خطأ أثناء معالجة الزر", ephemeral: true }).catch(() => {})
        }

      }

      return
    }

    // ══════════════════════════════════════
    //  SELECT MENUS
    // ══════════════════════════════════════
    if (interaction.isStringSelectMenu()) {

      const customId = interaction.customId

      try {

        if (customId === "ticket_category_select") {
          return await ticketSystem.handleCategorySelect(interaction)
        }

      } catch (error) {

        console.error("[SELECT MENU ERROR]", error.message)

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "❌ حدث خطأ أثناء معالجة القائمة", ephemeral: true }).catch(() => {})
        }

      }

      return
    }

  }

}