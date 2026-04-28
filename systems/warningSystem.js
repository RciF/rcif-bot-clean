const warningRepository = require("../repositories/warningRepository")

async function addWarning(guildId, userId, moderatorId, reason) {
  const warning = await warningRepository.addWarning(
    guildId,
    userId,
    moderatorId,
    reason
  )

  return warning
}

async function getWarnings(guildId, userId) {
  const warnings = await warningRepository.getWarnings(
    guildId,
    userId
  )

  return warnings
}

async function getAllWarnings(guildId) {
  const warnings = await warningRepository.getAllWarnings(guildId)

  return warnings
}

async function clearWarnings(guildId, userId) {
  await warningRepository.clearWarnings(
    guildId,
    userId
  )
}

async function deleteWarning(warningId) {
  await warningRepository.deleteWarning(warningId)
}

async function applyAutoPunishment(guild, member, totalWarnings) {
  try {

    // 3 تحذيرات → كتم 10 دقائق
    if (totalWarnings === 3) {
      const duration = 10 * 60 * 1000
      await member.timeout(duration, "عقوبة تلقائية — 3 تحذيرات")
      return { type: "mute", duration: "10 دقائق" }
    }

    // 5 تحذيرات → كتم ساعة
    if (totalWarnings === 5) {
      const duration = 60 * 60 * 1000
      await member.timeout(duration, "عقوبة تلقائية — 5 تحذيرات")
      return { type: "mute", duration: "ساعة كاملة" }
    }

    return null

  } catch (error) {
    return null
  }
}

module.exports = {
  addWarning,
  getWarnings,
  getAllWarnings,
  applyAutoPunishment,
  clearWarnings,
  deleteWarning
}