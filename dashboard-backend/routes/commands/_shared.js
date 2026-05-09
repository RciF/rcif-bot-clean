/**
 * ═══════════════════════════════════════════════════════════
 *  Shared helpers for commands routes
 *
 *  استخدام:
 *    const { validateCommandName, validateAlias, ... } = require("./_shared")
 * ═══════════════════════════════════════════════════════════
 */

const { COMMANDS_REGISTRY } = require("../../data/commandsRegistry")

// ════════════════════════════════════════════════════════════
//  Constants
// ════════════════════════════════════════════════════════════

const MAX_ALIASES_PER_COMMAND = 5
const MIN_ALIAS_LENGTH = 1
const MAX_ALIAS_LENGTH = 32

// أحرف ممنوعة في الـ alias (تسبب مشاكل في الـ parsing)
// نسمح بكل شي عدا الـ whitespace في المنتصف
const ALIAS_FORBIDDEN_PATTERNS = [
  /\s/, // أي whitespace (مسافة، tab، newline)
]

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

/**
 * يتحقق إن اسم الأمر موجود فعلاً في الـ registry
 */
function isValidCommandName(commandName) {
  return COMMANDS_REGISTRY.some((cmd) => cmd.name === commandName)
}

/**
 * يتحقق من صلاحية الـ alias
 *
 * @returns {string|null} رسالة الخطأ أو null لو سليم
 */
function validateAlias(alias) {
  if (typeof alias !== "string") {
    return "alias لازم يكون نص"
  }

  const trimmed = alias.trim()

  if (trimmed.length < MIN_ALIAS_LENGTH) {
    return "alias قصير جداً"
  }

  if (trimmed.length > MAX_ALIAS_LENGTH) {
    return `alias طويل (الحد الأقصى ${MAX_ALIAS_LENGTH} حرف)`
  }

  for (const pattern of ALIAS_FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return "alias ما يقدر يحتوي مسافات"
    }
  }

  return null
}

/**
 * يحوّل الـ alias لصورة موحّدة للتخزين
 * (نخزنه trimmed لكن نحتفظ بالحالة لو فيها أحرف عربية/إنجليزية)
 */
function normalizeAlias(alias) {
  return String(alias).trim()
}

/**
 * يجيب metadata الأمر من الـ registry
 */
function getCommandMeta(commandName) {
  return COMMANDS_REGISTRY.find((cmd) => cmd.name === commandName) || null
}

module.exports = {
  // Constants
  MAX_ALIASES_PER_COMMAND,
  MIN_ALIAS_LENGTH,
  MAX_ALIAS_LENGTH,

  // Helpers
  isValidCommandName,
  validateAlias,
  normalizeAlias,
  getCommandMeta,
}