/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases — Executor
 *
 *  ينفذ الأمر باستخدام رسالة بدلاً من interaction.
 *
 *  الفكرة:
 *  - الأوامر في discord.js v14 تتوقع interaction object
 *  - في الباتش 2، ندعم الأوامر اللي ما تستخدم interaction.options
 *    (الأوامر البسيطة بدون arguments)
 *  - نبني "fake interaction" خفيف يكفي لتشغيل الأمر
 *  - لو الأمر يحتاج arguments → نرسل رسالة توضيحية للمستخدم
 *
 *  ⚠️ الباتش 5 راح يدعم الـ arguments الكاملة بـ proper parsing
 * ═══════════════════════════════════════════════════════════
 */

const { PermissionFlagsBits } = require("discord.js")
const logger = require("../loggerSystem")

// ════════════════════════════════════════════════════════════
//  detectArgsRequired
//  يفحص إن الأمر يحتاج arguments
//
//  نفحص data.options في SlashCommandBuilder
// ════════════════════════════════════════════════════════════

function detectArgsRequired(command) {
  if (!command?.data) return false

  // discord.js v14 — data.options
  const options = command.data.options || []

  // فحص لو في أي option مع required: true
  // ⚠️ الـ subcommands نحسبها كـ required
  return options.some((opt) => {
    // SubcommandBuilder
    if (opt.type === 1 || opt.type === 2) return true // SUBCOMMAND or SUBCOMMAND_GROUP
    // أي option بـ required = true
    return opt.required === true
  })
}

// ════════════════════════════════════════════════════════════
//  buildFakeInteraction
//  يبني interaction خفيف من message
//
//  مهم: هذا interaction ما يدعم options.getXxx()
//  لكن يدعم reply, deferReply, editReply, channel, user, member, guild
// ════════════════════════════════════════════════════════════

function buildFakeInteraction(message, commandName) {
  let _replied = false
  let _deferred = false
  let _replyMessage = null

  return {
    // Identity
    isChatInputCommand: () => true,
    isAutocomplete: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    type: 2, // ApplicationCommand
    commandName,

    // User & member info
    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guild?.id,
    channel: message.channel,
    channelId: message.channel?.id,
    client: message.client,

    // Locale
    locale: message.guild?.preferredLocale || "ar",
    guildLocale: message.guild?.preferredLocale || "ar",

    // Options stub — يرجع null/افتراضي لكل شي
    // (الباتش 5 راح يبني هذا بشكل كامل)
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
        if (required) {
          throw new Error("SubcommandRequired")
        }
        return null
      },
      getSubcommandGroup: () => null,
      data: [],
      _hoistedOptions: [],
    },

    // Reply states (mutable)
    get replied() {
      return _replied
    },
    get deferred() {
      return _deferred
    },

    // Reply methods → نرسل في القناة كرسالة
    async reply(payload) {
      _replied = true

      // ephemeral مو متاح في الرسائل العادية
      // نشيله من الـ payload لو موجود
      const cleanPayload = typeof payload === "string"
        ? { content: payload }
        : { ...payload }
      delete cleanPayload.ephemeral
      delete cleanPayload.flags

      _replyMessage = await message.channel.send({
        ...cleanPayload,
        reply: { messageReference: message.id, failIfNotExists: false },
      }).catch(() => null)

      return _replyMessage
    },

    async deferReply(opts = {}) {
      _deferred = true
      // ما فيه typing indicator مفيد، نرسل رسالة "جاري..."
      try {
        await message.channel.sendTyping()
      } catch {}
    },

    async editReply(payload) {
      const cleanPayload = typeof payload === "string"
        ? { content: payload }
        : { ...payload }
      delete cleanPayload.ephemeral
      delete cleanPayload.flags

      // لو ما فيه رسالة سابقة، أرسل جديدة
      if (!_replyMessage) {
        _replyMessage = await message.channel.send({
          ...cleanPayload,
          reply: { messageReference: message.id, failIfNotExists: false },
        }).catch(() => null)
        return _replyMessage
      }

      // عدّل الرسالة السابقة
      try {
        await _replyMessage.edit(cleanPayload)
        return _replyMessage
      } catch {
        // فشل التعديل → أرسل جديدة
        _replyMessage = await message.channel.send(cleanPayload).catch(() => null)
        return _replyMessage
      }
    },

    async followUp(payload) {
      const cleanPayload = typeof payload === "string"
        ? { content: payload }
        : { ...payload }
      delete cleanPayload.ephemeral
      delete cleanPayload.flags

      return await message.channel.send(cleanPayload).catch(() => null)
    },

    async fetchReply() {
      return _replyMessage
    },

    async deleteReply() {
      if (_replyMessage) {
        try {
          await _replyMessage.delete()
        } catch {}
      }
    },

    // Permissions على الـ member
    memberPermissions: message.member?.permissions || null,
    appPermissions: message.guild?.members?.me?.permissions || null,
  }
}

// ════════════════════════════════════════════════════════════
//  execute
//  ينفذ أمر باستخدام رسالة
//
//  Returns:
//    { success: true } لو نجح
//    { success: false, reason: "..." } لو فشل
//    { needsSlash: true, command } لو الأمر يحتاج arguments (الباتش 5)
// ════════════════════════════════════════════════════════════

async function execute(message, command, resolved) {
  if (!command || !command.execute) {
    return { success: false, reason: "command_missing" }
  }

  // ─── 1) فحص لو الأمر يحتاج arguments ───
  // في الباتش 2: لو يحتاج → نرسل رسالة توضيحية
  // في الباتش 5: نـ parse ونمرر بشكل كامل
  if (detectArgsRequired(command)) {
    return {
      success: false,
      needsSlash: true,
      reason: "args_required",
    }
  }

  // ─── 2) بناء interaction خفيف ───
  const fakeInteraction = buildFakeInteraction(message, command.data.name)

  // ─── 3) تشغيل ───
  try {
    await command.execute(fakeInteraction, message.client)
    return { success: true }
  } catch (err) {
    logger.error("ALIAS_EXECUTE_FAILED", {
      command: command.data.name,
      alias: resolved?.matchedAlias,
      error: err.message,
    })

    // محاولة إخبار المستخدم
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