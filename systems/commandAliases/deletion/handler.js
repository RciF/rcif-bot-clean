/**
 * ═══════════════════════════════════════════════════════════
 *  Deletion Handler
 *
 *  يعالج خيارات الحذف التلقائي:
 *  - delete_invocation:       حذف رسالة الأمر المستدعى
 *  - delete_response:         حذف رد البوت بعد X ثواني
 *  - delete_response_after:   عدد الثواني للحذف
 *  - delete_on_user_delete:   حذف رد البوت إذا حذف العضو رسالته
 *
 *  ⚠️ الحذف ما يفشل الأمر — كل العمليات try/catch
 * ═══════════════════════════════════════════════════════════
 */

const logger = require("../../loggerSystem")

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const MIN_DELAY_SECONDS = 1
const MAX_DELAY_SECONDS = 60

// تخزين mapping بين رسالة العضو ورد البوت
// لو العضو حذف رسالته، نحذف رد البوت
// Map<userMessageId, { botMessage, deleteOnUserDelete, timestamp }>
const pendingDeletions = new Map()

// تنظيف القديم كل 5 دقائق (لو شي علق)
setInterval(() => {
  const now = Date.now()
  const maxAge = 10 * 60 * 1000 // 10 minutes

  for (const [key, entry] of pendingDeletions.entries()) {
    if (now - entry.timestamp > maxAge) {
      pendingDeletions.delete(key)
    }
  }
}, 5 * 60 * 1000)

// ════════════════════════════════════════════════════════════
//  applyDeletions
//
//  يطبّق إعدادات الحذف بعد تنفيذ الأمر
//
//  Inputs:
//    userMessage: رسالة العضو (الأمر)
//    botReply: رد البوت (أو null)
//    defaults: {
//      delete_invocation: bool,
//      delete_response: bool,
//      delete_response_after: number (seconds),
//      delete_on_user_delete: bool,
//    }
// ════════════════════════════════════════════════════════════

async function applyDeletions(userMessage, botReply, defaults = {}) {
  if (!userMessage || !defaults) return

  const {
    delete_invocation = false,
    delete_response = false,
    delete_response_after = 5,
    delete_on_user_delete = false,
  } = defaults

  // ─── 1) حذف رسالة الأمر المستدعى ───
  if (delete_invocation) {
    scheduleDelete(userMessage, 0).catch(() => {})
  }

  // ─── 2) حذف رد البوت بعد X ثواني ───
  if (delete_response && botReply) {
    const delay = clampDelay(delete_response_after)
    scheduleDelete(botReply, delay).catch(() => {})
  }

  // ─── 3) حذف رد البوت إذا حذف العضو رسالته ───
  if (delete_on_user_delete && botReply) {
    pendingDeletions.set(userMessage.id, {
      botMessage: botReply,
      deleteOnUserDelete: true,
      timestamp: Date.now(),
    })
  }
}

// ════════════════════════════════════════════════════════════
//  handleUserMessageDeleted
//
//  يُستدعى من حدث messageDelete في البوت
//  لو الرسالة المحذوفة فيها pending delete لرد البوت → نحذف الرد
// ════════════════════════════════════════════════════════════

async function handleUserMessageDeleted(messageId) {
  const entry = pendingDeletions.get(messageId)
  if (!entry) return

  pendingDeletions.delete(messageId)

  if (entry.deleteOnUserDelete && entry.botMessage) {
    try {
      await entry.botMessage.delete()
    } catch {
      // الرد ربما اتحذف بالفعل أو محذوف
    }
  }
}

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

function clampDelay(seconds) {
  const n = Number(seconds)
  if (isNaN(n)) return 5
  if (n < MIN_DELAY_SECONDS) return MIN_DELAY_SECONDS
  if (n > MAX_DELAY_SECONDS) return MAX_DELAY_SECONDS
  return Math.floor(n)
}

async function scheduleDelete(message, delaySeconds) {
  if (!message || typeof message.delete !== "function") return

  if (delaySeconds <= 0) {
    try {
      await message.delete()
    } catch {}
    return
  }

  setTimeout(async () => {
    try {
      await message.delete()
    } catch {
      // ربما محذوفة بالفعل، أو ما عندنا صلاحية
    }
  }, delaySeconds * 1000)
}

// ════════════════════════════════════════════════════════════
//  Stats (للمراقبة)
// ════════════════════════════════════════════════════════════

function getStats() {
  return {
    pendingDeletions: pendingDeletions.size,
  }
}

module.exports = {
  applyDeletions,
  handleUserMessageDeleted,
  getStats,
}