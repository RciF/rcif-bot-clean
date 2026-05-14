/**
 * ═══════════════════════════════════════════════════════════
 *  Restrictions Checker
 *
 *  يفحص لو العضو يقدر يستخدم الأمر في القناة الحالية
 *  بناءً على:
 *  - enabled_roles:    إذا فيها قيم، العضو لازم يكون فيه واحدة منها
 *  - disabled_roles:   إذا فيها قيم، العضو ما يكون فيه أي وحدة منها
 *  - enabled_channels: إذا فيها قيم، الأمر يشتغل فقط في هذي القنوات
 *  - disabled_channels:إذا فيها قيم، الأمر ما يشتغل في هذي القنوات
 *
 *  الأولوية:
 *  1. إذا الـ executor هو المالك → يمر دائماً
 *  2. enabled_channels (whitelist) > disabled_channels (blacklist)
 *  3. enabled_roles (whitelist) > disabled_roles (blacklist)
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  check
//
//  Inputs:
//    member: GuildMember
//    channelId: ID القناة الحالية
//    restrictions: { enabled_roles, disabled_roles, enabled_channels, disabled_channels }
//
//  Returns:
//    { allowed: true }
//    { allowed: false, reason: "..." }
// ════════════════════════════════════════════════════════════

function check(member, channelId, restrictions = {}) {
  if (!member || !channelId) {
    return { allowed: false, reason: "missing_context" }
  }

  // ─── المالك يمر دائماً ───
  if (member.id === member.guild.ownerId) {
    return { allowed: true }
  }

  const {
    enabled_roles = [],
    disabled_roles = [],
    enabled_channels = [],
    disabled_channels = [],
  } = restrictions

  // ════════════════════════════════════════════════════════════
  //  فحص القنوات
  // ════════════════════════════════════════════════════════════

  // (أ) لو فيه enabled_channels — القناة لازم تكون فيها
  if (Array.isArray(enabled_channels) && enabled_channels.length > 0) {
    if (!enabled_channels.includes(channelId)) {
      return {
        allowed: false,
        reason: "channel_not_whitelisted",
        userMessage: "❌ هذا الأمر ما يشتغل في هذه القناة",
      }
    }
  }

  // (ب) لو القناة في disabled_channels — رفض
  if (Array.isArray(disabled_channels) && disabled_channels.length > 0) {
    if (disabled_channels.includes(channelId)) {
      return {
        allowed: false,
        reason: "channel_blacklisted",
        userMessage: "❌ هذا الأمر معطّل في هذه القناة",
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  //  فحص الرولات
  // ════════════════════════════════════════════════════════════

  const memberRoleIds = member.roles?.cache
    ? Array.from(member.roles.cache.keys())
    : []

  // (أ) لو فيه enabled_roles — العضو لازم يكون فيه واحدة منها
  if (Array.isArray(enabled_roles) && enabled_roles.length > 0) {
    const hasEnabled = enabled_roles.some((roleId) => memberRoleIds.includes(roleId))
    if (!hasEnabled) {
      return {
        allowed: false,
        reason: "missing_required_role",
        userMessage: "❌ ما عندك الرتبة المطلوبة لاستخدام هذا الأمر",
      }
    }
  }

  // (ب) لو فيه disabled_roles — العضو ما يكون فيه أي واحدة منها
  if (Array.isArray(disabled_roles) && disabled_roles.length > 0) {
    const hasDisabled = disabled_roles.some((roleId) => memberRoleIds.includes(roleId))
    if (hasDisabled) {
      return {
        allowed: false,
        reason: "has_blocked_role",
        userMessage: "❌ ما تقدر تستخدم هذا الأمر بسبب رتبتك",
      }
    }
  }

  return { allowed: true }
}

// ════════════════════════════════════════════════════════════
//  hasAnyRestrictions
//
//  يفحص لو الأمر فيه أي restrictions مفعّلة
// ════════════════════════════════════════════════════════════

function hasAnyRestrictions(restrictions = {}) {
  if (!restrictions || typeof restrictions !== "object") return false

  return (
    (restrictions.enabled_roles?.length || 0) > 0 ||
    (restrictions.disabled_roles?.length || 0) > 0 ||
    (restrictions.enabled_channels?.length || 0) > 0 ||
    (restrictions.disabled_channels?.length || 0) > 0
  )
}

module.exports = {
  check,
  hasAnyRestrictions,
}