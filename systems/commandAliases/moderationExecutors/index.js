/**
 * ═══════════════════════════════════════════════════════════
 *  Moderation Executors — Router
 *
 *  يربط أسماء الأوامر بالـ executors المناسبة.
 *
 *  استخدام:
 *    const modExecutors = require("./moderationExecutors")
 *    if (modExecutors.canHandle(commandName)) {
 *      return await modExecutors.execute(commandName, message, rawArgs, defaults)
 *    }
 * ═══════════════════════════════════════════════════════════
 */

const banExecutor = require("./banExecutor")
const kickExecutor = require("./kickExecutor")
const muteExecutor = require("./muteExecutor")
const unbanExecutor = require("./unbanExecutor")
const unmuteExecutor = require("./unmuteExecutor")

const { parseModerationArgs } = require("../argParsers")
const { buildErrorEmbed, replyToMessage } = require("./_shared")

// ════════════════════════════════════════════════════════════
//  Command Map
//
//  Key = اسم الأمر الأصلي (في Discord)
//  Value = { executor, options }
//
//  ⚠️ هذه الأسماء يجب أن تطابق slash commands names بالضبط
// ════════════════════════════════════════════════════════════

const COMMAND_MAP = {
  // ─── حظر ───
  "حظر": {
    executor: banExecutor,
    options: { requireUser: true, defaultUnit: "h" },
  },
  "ban": {
    executor: banExecutor,
    options: { requireUser: true, defaultUnit: "h" },
  },

  // ─── طرد ───
  "طرد": {
    executor: kickExecutor,
    options: { requireUser: true },
  },
  "kick": {
    executor: kickExecutor,
    options: { requireUser: true },
  },

  // ─── اسكت / كتم ───
  "اسكت": {
    executor: muteExecutor,
    options: { requireUser: true, defaultUnit: "m" },
  },
  "كتم": {
    executor: muteExecutor,
    options: { requireUser: true, defaultUnit: "m" },
  },
  "mute": {
    executor: muteExecutor,
    options: { requireUser: true, defaultUnit: "m" },
  },

  // ─── فك (unban) ───
  "فك": {
    executor: unbanExecutor,
    options: { requireUser: true },
  },
  "unban": {
    executor: unbanExecutor,
    options: { requireUser: true },
  },

  // ─── تكلم (unmute) ───
  "تكلم": {
    executor: unmuteExecutor,
    options: { requireUser: true },
  },
  "فك_الكتم": {
    executor: unmuteExecutor,
    options: { requireUser: true },
  },
  "unmute": {
    executor: unmuteExecutor,
    options: { requireUser: true },
  },
}

// ════════════════════════════════════════════════════════════
//  canHandle
//
//  يفحص لو هذا الأمر يدعمه نظام الـ moderation executors
// ════════════════════════════════════════════════════════════

function canHandle(commandName) {
  return !!COMMAND_MAP[commandName]
}

// ════════════════════════════════════════════════════════════
//  execute
//
//  ينفذ الأمر بناءً على اسمه + النص الخام بعد الـ alias
//
//  Inputs:
//    commandName: "حظر" أو "ban" إلخ
//    message: Discord message
//    rawArgs: النص بعد الـ alias (مثل "@user 7d مزعج")
//    defaults: { default_duration, ... } من DB
//
//  Returns: { success, replyMessage }
// ════════════════════════════════════════════════════════════

async function execute(commandName, message, rawArgs, defaults = {}) {
  const entry = COMMAND_MAP[commandName]
  if (!entry) {
    return { success: false, error: "command_not_supported" }
  }

  // ─── parse الـ args ───
  const parsed = parseModerationArgs(rawArgs || "", entry.options)

  if (!parsed.ok) {
    const reply = await replyToMessage(message, {
      embeds: [buildErrorEmbed(parsed.error)],
    })
    return { success: false, replyMessage: reply, error: parsed.error }
  }

  // ─── نفذ ───
  return await entry.executor.execute(message, parsed, defaults)
}

module.exports = {
  canHandle,
  execute,
  COMMAND_MAP, // للاختبار
}