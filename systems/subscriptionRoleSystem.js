// systems/subscriptionRoleSystem.js
// يعطي/يسحب رول الاشتراك تلقائياً لما يتفعل أو ينتهي الاشتراك

const logger = require("./loggerSystem")

// ← حط IDs الرولات هنا بعد setup-server.js
const ROLE_MAP = {
  diamond: process.env.ROLE_DIAMOND || "",
  gold:    process.env.ROLE_GOLD    || "",
  silver:  process.env.ROLE_SILVER  || "",
}

const SUPPORT_GUILD_ID = process.env.SUPPORT_GUILD_ID || ""

let botClient = null

function init(client) {
  botClient = client
  logger.info("SUBSCRIPTION_ROLE_SYSTEM_READY")
}

async function getSupportGuild() {
  if (!botClient || !SUPPORT_GUILD_ID) return null
  try {
    return await botClient.guilds.fetch(SUPPORT_GUILD_ID)
  } catch {
    return null
  }
}

async function getMember(guild, userId) {
  try {
    return await guild.members.fetch(userId)
  } catch {
    return null
  }
}

// إعطاء رول الاشتراك
async function grantSubscriptionRole(userId, planId) {
  try {
    const guild = await getSupportGuild()
    if (!guild) return false

    const member = await getMember(guild, userId)
    if (!member) {
      logger.info("SUB_ROLE_USER_NOT_IN_SERVER", { userId, planId })
      return false
    }

    const roleId = ROLE_MAP[planId]
    if (!roleId) {
      logger.warn("SUB_ROLE_NO_ROLE_ID", { planId })
      return false
    }

    // إزالة باقي رولات الاشتراك أولاً
    for (const [plan, id] of Object.entries(ROLE_MAP)) {
      if (id && member.roles.cache.has(id)) {
        await member.roles.remove(id, `Subscription changed to ${planId}`)
      }
    }

    // إعطاء الرول الجديد
    await member.roles.add(roleId, `Subscription: ${planId}`)
    logger.success("SUB_ROLE_GRANTED", { userId, planId, roleId })
    return true

  } catch (err) {
    logger.error("SUB_ROLE_GRANT_FAILED", { error: err.message, userId, planId })
    return false
  }
}

// سحب رول الاشتراك (انتهاء/إلغاء)
async function revokeSubscriptionRole(userId) {
  try {
    const guild = await getSupportGuild()
    if (!guild) return false

    const member = await getMember(guild, userId)
    if (!member) return false

    for (const [plan, roleId] of Object.entries(ROLE_MAP)) {
      if (roleId && member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId, "Subscription ended")
        logger.info("SUB_ROLE_REVOKED", { userId, plan })
      }
    }
    return true

  } catch (err) {
    logger.error("SUB_ROLE_REVOKE_FAILED", { error: err.message, userId })
    return false
  }
}

// مزامنة يدوية لمستخدم (لما يدخل السيرفر)
async function syncUserRole(userId, planId, status) {
  if (status === "active" && planId && planId !== "free") {
    return await grantSubscriptionRole(userId, planId)
  } else {
    return await revokeSubscriptionRole(userId)
  }
}

module.exports = {
  init,
  grantSubscriptionRole,
  revokeSubscriptionRole,
  syncUserRole,
  ROLE_MAP
}