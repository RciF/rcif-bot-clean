const analyticsTracker = require("../systems/analyticsTracker")
const errorSystem      = require("../systems/errorSystem")
const ticketSystem     = require("../systems/ticketSystem")
const { handleButtonRoleInteraction } = require("../commands/roles/button-role-handler")
const { handleEventButton } = require("../commands/events/eventButtons")
const { eventView, eventList } = require("../commands/events/eventView")
const { eventCancel, eventStart, eventEnd } = require("../commands/events/eventManage")
const { eventAttendees, eventRemind } = require("../commands/events/eventAttend")
const { handleVerifyPanelButton }     = require("../commands/admin/verify-panel")

// ══════════════════════════════════════
//  DASHBOARD SETTINGS CACHE
//  نخزن إعدادات كل سيرفر 5 دقائق
//  لتجنب ضرب الـ API عند كل أمر
// ══════════════════════════════════════
const settingsCache = new Map()
const CACHE_TTL     = 5 * 60 * 1000

async function getGuildCommandSettings(guildId) {
  const cached = settingsCache.get(guildId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data
  }

  const dashUrl   = process.env.DASHBOARD_URL || "http://localhost:4000"
  const botSecret = process.env.BOT_SECRET    || ""

  try {
    const res = await fetch(`${dashUrl}/api/bot/guild/${guildId}/command-settings`, {
      headers: { "x-bot-secret": botSecret },
      signal:  AbortSignal.timeout(3000)
    })
    if (!res.ok) return null
    const data = await res.json()
    settingsCache.set(guildId, { data, fetchedAt: Date.now() })
    return data
  } catch {
    return null
  }
}

function invalidateCache(guildId) {
  settingsCache.delete(guildId)
}

async function trackToDashboard(commandName, guildId) {
  const dashUrl   = process.env.DASHBOARD_URL || "http://localhost:4000"
  const botSecret = process.env.BOT_SECRET    || ""
  try {
    await fetch(`${dashUrl}/api/analytics/track`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-bot-secret": botSecret },
      body:    JSON.stringify({ command: commandName, guildId }),
      signal:  AbortSignal.timeout(2000)
    })
  } catch {}
}

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {

    // ══════════════════════════════════════
    //  SLASH COMMANDS
    // ══════════════════════════════════════
    if (interaction.isChatInputCommand()) {

      const guildId     = interaction.guildId
      const commandName = interaction.commandName

      // الأمر الأصلي من Discord
      let command = client.commands.get(commandName)

      // ── التحقق من إعدادات الداشبورد ──
      if (guildId) {
        const settings = await getGuildCommandSettings(guildId)

        if (settings?.commands) {
          // 1) ابحث بالاسم الأصلي
          let originalName = commandName
          let cmdSetting   = settings.commands[commandName]

          // 2) لو ما لقينا → ابحث عن أمر اسمه المخصص = commandName
          //    يعني المستخدم استخدم الاسم المخصص
          if (!cmdSetting) {
            for (const [orig, cfg] of Object.entries(settings.commands)) {
              if (cfg.custom_name && cfg.custom_name === commandName) {
                originalName = orig
                cmdSetting   = cfg
                command      = client.commands.get(orig)
                break
              }
            }
          }

          // 3) لو الأمر معطّل → ارفض
          if (cmdSetting && cmdSetting.enabled === false) {
            return interaction.reply({
              content:   "❌ هذا الأمر معطّل في هذا السيرفر.",
              ephemeral: true
            }).catch(() => {})
          }
        }
      }

      if (!command) return

      // تسجيل إحصائيات
      analyticsTracker.trackCommand(commandName)
      if (guildId) trackToDashboard(commandName, guildId)

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

      // ✅ NEW: Verify Panel Button
      if (customId.startsWith("verify_panel:")) {
        return await handleVerifyPanelButton(interaction)
      }

      if (customId.startsWith("brole_")) {
        return await handleButtonRoleInteraction(interaction)
      }

      try {
        if (customId.startsWith("event_"))          return await handleEventButton(interaction)
        if (customId === "ticket_open")             return await ticketSystem.handleOpenButton(interaction)
        if (customId === "ticket_close")            return await ticketSystem.handleCloseButton(interaction)
        if (customId === "ticket_close_confirm")    return await ticketSystem.handleCloseConfirm(interaction)
        if (customId === "ticket_close_cancel")     return await ticketSystem.handleCloseCancel(interaction)
        if (customId === "ticket_lock")             return await ticketSystem.handleLockButton(interaction)
        if (customId === "ticket_unlock")           return await ticketSystem.handleUnlockButton(interaction)
        if (customId === "ticket_claim")            return await ticketSystem.handleClaimButton(interaction)
        if (customId === "ticket_transcript")       return await ticketSystem.handleTranscriptButton(interaction)
        if (customId === "ticket_delete")           return await ticketSystem.handleDeleteButton(interaction)
        if (customId === "ticket_reopen")           return await ticketSystem.handleReopenButton(interaction)
        if (customId === "ticket_change_priority")  return await ticketSystem.handleChangePriorityButton(interaction)
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
        if (customId === "ticket_category_select") return await ticketSystem.handleCategorySelect(interaction)
        if (customId === "ticket_priority_select") return await ticketSystem.handlePrioritySelect(interaction)
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

module.exports.invalidateCache = invalidateCache