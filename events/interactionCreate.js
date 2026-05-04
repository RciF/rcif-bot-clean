const analyticsTracker = require("../systems/analyticsTracker")
const errorSystem      = require("../systems/errorSystem")
const ticketSystem     = require("../systems/ticketSystem")
const logger           = require("../systems/loggerSystem")
const { handleButtonRoleInteraction } = require("../commands/roles/button-role-handler")
const { handleEventButton } = require("../commands/events/eventButtons")
const { eventView, eventList } = require("../commands/events/eventView")
const { eventCancel, eventStart, eventEnd } = require("../commands/events/eventManage")
const { eventAttendees, eventRemind } = require("../commands/events/eventAttend")
const { handleVerifyPanelButton }     = require("../commands/admin/verify-panel")
const helpInteractionHandler = require("../systems/helpInteractionHandler")

// ══════════════════════════════════════
//  DASHBOARD SETTINGS CACHE
//  نخزن إعدادات كل سيرفر 5 دقائق
//  + negative caching: لو فشل الطلب، نكاش "null" لمدة 30 ثانية
//    عشان ما نضرب الـ API كل أمر لما الداشبورد عطلان
// ══════════════════════════════════════
const settingsCache = new Map()
const CACHE_TTL          = 5 * 60 * 1000  // 5 دقائق للنجاح
const NEGATIVE_CACHE_TTL = 30 * 1000      // 30 ثانية للفشل

async function getGuildCommandSettings(guildId) {
  const cached = settingsCache.get(guildId)

  if (cached) {
    const age = Date.now() - cached.fetchedAt
    const ttl = cached.failed ? NEGATIVE_CACHE_TTL : CACHE_TTL
    if (age < ttl) {
      return cached.data
    }
  }

  const dashUrl   = process.env.DASHBOARD_URL || "http://localhost:4000"
  const botSecret = process.env.BOT_SECRET    || ""

  try {
    const res = await fetch(`${dashUrl}/api/bot/guild/${guildId}/command-settings`, {
      headers: { "x-bot-secret": botSecret },
      signal:  AbortSignal.timeout(3000)
    })
    if (!res.ok) {
      // negative cache: ما نضرب الـ API كل أمر
      settingsCache.set(guildId, { data: null, fetchedAt: Date.now(), failed: true })
      return null
    }
    const data = await res.json()
    settingsCache.set(guildId, { data, fetchedAt: Date.now(), failed: false })
    return data
  } catch {
    settingsCache.set(guildId, { data: null, fetchedAt: Date.now(), failed: true })
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

// ══════════════════════════════════════
//  SAFE REPLY HELPER — يتعامل مع interaction states
// ══════════════════════════════════════
async function safeErrorReply(interaction, message = "❌ حدث خطأ غير متوقع") {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp({ content: message, ephemeral: true }).catch(() => {})
    }
    return await interaction.reply({ content: message, ephemeral: true }).catch(() => {})
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
        errorSystem.handleError(error, {
          source: "slash_command",
          commandName,
          userId: interaction.user?.id,
          guildId
        })
        await safeErrorReply(interaction, "❌ حدث خطأ أثناء تنفيذ الأمر. حاول مرة ثانية.")
      }

      return
    }

    // ══════════════════════════════════════
    //  AUTOCOMPLETE
    //  ⚠️ Discord ينتظر رد خلال 3 ثواني — لو فشل، لازم نرسل رد فاضي
    //     عشان ما يبقى المستخدم يشوف "Loading..." للأبد
    // ══════════════════════════════════════
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName)
      if (!command || !command.autocomplete) return
      try {
        await command.autocomplete(interaction, client)
      } catch (error) {
        logger.error("AUTOCOMPLETE_FAILED", {
          commandName: interaction.commandName,
          userId: interaction.user?.id,
          error: error.message
        })
        // لازم نرد بأي شي حتى لو فاضي عشان نوقف الـ loading state
        try {
          if (!interaction.responded) {
            await interaction.respond([]).catch(() => {})
          }
        } catch {}
      }
      return
    }

    // ══════════════════════════════════════
    //  BUTTONS
    // ══════════════════════════════════════
    if (interaction.isButton()) {
      const customId = interaction.customId

      // ✅ Help System Buttons
      if (customId.startsWith("help:")) {
        const handled = await helpInteractionHandler.handle(interaction)
        if (handled) return
      }

      // ✅ Verify Panel Button
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
        logger.error("BUTTON_INTERACTION_FAILED", {
          customId,
          userId: interaction.user?.id,
          guildId: interaction.guildId,
          error: error.message
        })
        await safeErrorReply(interaction, "❌ حدث خطأ أثناء معالجة الزر.")
      }
      return
    }

    // ══════════════════════════════════════
    //  SELECT MENUS
    // ══════════════════════════════════════
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId

      // ✅ Help System Select Menus
      if (customId.startsWith("help:")) {
        const handled = await helpInteractionHandler.handle(interaction)
        if (handled) return
      }

      try {
        if (customId === "ticket_category_select") return await ticketSystem.handleCategorySelect(interaction)
        if (customId === "ticket_priority_select") return await ticketSystem.handlePrioritySelect(interaction)
      } catch (error) {
        logger.error("SELECT_MENU_FAILED", {
          customId,
          userId: interaction.user?.id,
          guildId: interaction.guildId,
          error: error.message
        })
        await safeErrorReply(interaction, "❌ حدث خطأ أثناء معالجة القائمة.")
      }
      return
    }

    // ══════════════════════════════════════
    //  MODAL SUBMIT
    //  ⚠️ حالياً ما عندنا modals مسجلة، لكن نعالجها عشان ما تكون silent failure
    //     لو أحد ضاف modal مستقبلاً، يضيف routing هنا
    // ══════════════════════════════════════
    if (interaction.isModalSubmit()) {
      logger.warn("UNHANDLED_MODAL_SUBMIT", {
        customId: interaction.customId,
        userId: interaction.user?.id,
        guildId: interaction.guildId
      })
      await safeErrorReply(interaction, "❌ هذا النموذج غير مدعوم حالياً.")
      return
    }
  }
}

module.exports.invalidateCache = invalidateCache