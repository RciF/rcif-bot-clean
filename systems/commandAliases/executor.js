/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases — Executor (Batch 5-7 Update)
 *
 *  هذا الـ executor الجديد يدعم:
 *  - الأوامر البسيطة (بدون args) — يبني fake interaction (الباتش 2)
 *  - أوامر الإشراف (مع args) — يستخدم moderationExecutors (الباتش 5)
 *
 *  ⚠️ ما يكسر السلوك القديم — يمدّده فقط
 * ═══════════════════════════════════════════════════════════
 */

const { PermissionFlagsBits } = require("discord.js")
const logger = require("../loggerSystem")
const moderationExecutors = require("./moderationExecutors")

// ════════════════════════════════════════════════════════════
//  detectArgsRequired
//
//  يفحص إن الأمر يحتاج arguments من خلال SlashCommandBuilder
// ════════════════════════════════════════════════════════════

function detectArgsRequired(command) {
  if (!command?.data) return false

  const options = command.data.options || []

  return options.some((opt) => {
    if (opt.type === 1 || opt.type === 2) return true // SUBCOMMAND
    return opt.required === true
  })
}

// ════════════════════════════════════════════════════════════
//  buildFakeInteraction
//
//  للأوامر البسيطة فقط (بدون args)
// ════════════════════════════════════════════════════════════

function buildFakeInteraction(message, commandName) {
  let _replied = false
  let _deferred = false
  let _replyMessage = null

  return {
    isChatInputCommand: () => true,
    isAutocomplete: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    type: 2,
    commandName,

    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guild?.id,
    channel: message.channel,
    channelId: message.channel?.id,
    client: message.client,

    locale: message.guild?.preferredLocale || "ar",
    guildLocale: message.guild?.preferredLocale || "ar",

    options: {
      getString: () => null,
      getInteger: () => null,
      getNumber: () => null,
      getBoolean: () => null,
      getUser: () => null,
      getMember: () => null,
      getRole: () => null,
      getChannel: () => null,
      getMentionable: () => null,
      getAttachment: () => null,
      getFocused: () => null,
      getSubcommand: (required = false) => {
        if (required) throw new Error("SubcommandRequired")
        return null
      },
      getSubcommandGroup: () => null,
      data: [],
      _hoistedOptions: [],
    },

    get replied() { return _replied },
    get deferred() { return _deferred },

    async reply(payload) {
      _replied = true
      const cleanPayload = typeof payload === "string" ? { content: payload } : { ...payload }
      delete cleanPayload.ephemeral
      delete cleanPayload.flags

      _replyMessage = await message.channel.send({
        ...cleanPayload,
        reply: { messageReference: message.id, failIfNotExists: false },
      }).catch(() => null)

      return _replyMessage
    },

    async deferReply() {
      _deferred = true
      try { await message.channel.sendTyping() } catch {}
    },

    async editReply(payload) {
      const cleanPayload = typeof payload === "string" ? { content: payload } : { ...payload }
      delete cleanPayload.ephemeral
      delete cleanPayload.flags

      if (!_replyMessage) {
        _replyMessage = await message.channel.send({
          ...cleanPayload,
          reply: { messageReference: message.id, failIfNotExists: false },
        }).catch(() => null)
        return _replyMessage
      }

      try {
        await _replyMessage.edit(cleanPayload)
        return _replyMessage
      } catch {
        _replyMessage = await message.channel.send(cleanPayload).catch(() => null)
        return _replyMessage
      }
    },

    async followUp(payload) {
      const cleanPayload = typeof payload === "string" ? { content: payload } : { ...payload }
      delete cleanPayload.ephemeral
      delete cleanPayload.flags
      return await message.channel.send(cleanPayload).catch(() => null)
    },

    async fetchReply() {
      return _replyMessage
    },

    async deleteReply() {
      if (_replyMessage) {
        try { await _replyMessage.delete() } catch {}
      }
    },

    // helpers للوصول للـ reply
    _getReplyMessage: () => _replyMessage,

    memberPermissions: message.member?.permissions || null,
    appPermissions: message.guild?.members?.me?.permissions || null,
  }
}

// ════════════════════════════════════════════════════════════
//  execute
//
//  ينفذ أمر باستخدام رسالة
//
//  Inputs:
//    message:  رسالة Discord
//    command:  client.commands.get(name) (للأوامر البسيطة)
//    resolved: { commandName, matchedAlias, rawArgs }
//    defaults: { default_duration, ... }
//
//  Returns:
//    { success: true, replyMessage }
//    { success: false, reason: "..." }
// ════════════════════════════════════════════════════════════

async function execute(message, command, resolved, defaults = {}) {
  const { commandName, rawArgs = "" } = resolved

  // ════════════════════════════════════════════════════════
  //  Path 1: أمر إشراف معروف (له moderationExecutor مخصص)
  // ════════════════════════════════════════════════════════

  if (moderationExecutors.canHandle(commandName)) {
    try {
      const result = await moderationExecutors.execute(
        commandName,
        message,
        rawArgs,
        defaults,
      )
      return result
    } catch (err) {
      logger.error("MOD_EXECUTOR_FAILED", {
        commandName,
        error: err.message,
      })
      return { success: false, reason: err.message }
    }
  }

  // ════════════════════════════════════════════════════════
  //  Path 2: أمر slash command عادي
  // ════════════════════════════════════════════════════════

  if (!command || !command.execute) {
    return { success: false, reason: "command_missing" }
  }

  // لو الأمر يحتاج args ولم يكن في moderationExecutors
  // نرسل توجيه للمستخدم
  if (detectArgsRequired(command)) {
    return {
      success: false,
      needsSlash: true,
      reason: "args_required",
    }
  }

  // الأمر بسيط — fake interaction
  const fakeInteraction = buildFakeInteraction(message, command.data.name)

  try {
    await command.execute(fakeInteraction, message.client)
    return {
      success: true,
      replyMessage: fakeInteraction._getReplyMessage(),
    }
  } catch (err) {
    logger.error("ALIAS_EXECUTE_FAILED", {
      command: command.data.name,
      alias: resolved?.matchedAlias,
      error: err.message,
    })

    try {
      if (!fakeInteraction.replied && !fakeInteraction.deferred) {
        await message.reply("❌ صار خطأ في تنفيذ الأمر.").catch(() => {})
      }
    } catch {}

    return { success: false, reason: err.message }
  }
}

module.exports = {
  detectArgsRequired,
  buildFakeInteraction,
  execute,
}