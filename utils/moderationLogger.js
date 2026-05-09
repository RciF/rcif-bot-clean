// ══════════════════════════════════════════════════════════════════
//  MODERATION LOGGER
//  المسار: utils/moderationLogger.js
//
//  يحفظ الإجراءات (ban/mute/unban) في جداول الداش:
//   - moderation_bans  (ban / unban)
//   - moderation_mutes (mute / unmute)
//
//  بدون كسر السلوك الحالي — يستدعى بـ try/catch، فشله ما يوقف الأمر.
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")

// ══════════════════════════════════════
//  Bans
// ══════════════════════════════════════

async function logBan({ guildId, userId, username, reason, moderatorId }) {
  try {
    await databaseSystem.query(
      `INSERT INTO moderation_bans (guild_id, user_id, username, reason, moderator_id, banned_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (guild_id, user_id)
       DO UPDATE SET reason = $4, moderator_id = $5, banned_at = NOW()`,
      [guildId, userId, username || null, reason || null, moderatorId || null]
    )
    return true
  } catch (err) {
    logger.error("MOD_LOG_BAN_FAILED", { error: err.message })
    return false
  }
}

async function logUnban({ guildId, userId }) {
  try {
    await databaseSystem.query(
      "DELETE FROM moderation_bans WHERE guild_id = $1 AND user_id = $2",
      [guildId, userId]
    )
    return true
  } catch (err) {
    logger.error("MOD_LOG_UNBAN_FAILED", { error: err.message })
    return false
  }
}

// ══════════════════════════════════════
//  Mutes
// ══════════════════════════════════════

async function logMute({ guildId, userId, reason, moderatorId, durationMs }) {
  try {
    const expiresAt = new Date(Date.now() + (parseInt(durationMs) || 0))
    await databaseSystem.query(
      `INSERT INTO moderation_mutes (guild_id, user_id, reason, moderator_id, muted_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [guildId, userId, reason || null, moderatorId || null, expiresAt]
    )
    return true
  } catch (err) {
    logger.error("MOD_LOG_MUTE_FAILED", { error: err.message })
    return false
  }
}

async function logUnmute({ guildId, userId }) {
  try {
    // نحذف أي mute فعّال (expires_at مستقبلي) للعضو
    await databaseSystem.query(
      `DELETE FROM moderation_mutes
       WHERE guild_id = $1 AND user_id = $2`,
      [guildId, userId]
    )
    return true
  } catch (err) {
    logger.error("MOD_LOG_UNMUTE_FAILED", { error: err.message })
    return false
  }
}

// ══════════════════════════════════════
//  Cleanup expired mutes (scheduled)
// ══════════════════════════════════════

async function cleanupExpiredMutes() {
  try {
    const result = await databaseSystem.query(
      "DELETE FROM moderation_mutes WHERE expires_at < NOW() RETURNING id"
    )
    return result.rows?.length || 0
  } catch (err) {
    logger.error("MOD_CLEANUP_MUTES_FAILED", { error: err.message })
    return 0
  }
}

module.exports = {
  logBan,
  logUnban,
  logMute,
  logUnmute,
  cleanupExpiredMutes
}