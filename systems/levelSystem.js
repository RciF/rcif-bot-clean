const xpRepository = require("../repositories/xpRepository")
const databaseSystem = require("./databaseSystem")
const { EmbedBuilder } = require("discord.js")

const xpCooldown = new Map()
const XP_COOLDOWN = 10000

async function getXPSettings(guildId) {
  try {
    const result = await databaseSystem.queryOne(
      "SELECT * FROM xp_settings WHERE guild_id = $1",
      [guildId]
    )
    return result || {}
  } catch {
    return {}
  }
}

async function addXP(userId, guildId, message) {
  const key = `${userId}_${guildId}`
  const now = Date.now()
  const last = xpCooldown.get(key)

  if (last && now - last < XP_COOLDOWN) return null
  xpCooldown.set(key, now)

  const userData = await xpRepository.getOrCreateXP(userId, guildId)
  if (!userData) return null

  // ✅ تحقق من إعدادات XP — القنوات المعطلة
  const settings = await getXPSettings(guildId)
  const disabledChannels = settings.disabled_channels || []
  if (message?.channel?.id && disabledChannels.includes(message.channel.id)) return null

  // ✅ مضاعف XP
  const multiplier = settings.xp_multiplier || 1
  const xpGain = Math.floor(10 * multiplier)

  userData.xp += xpGain

  let currentLevel = userData.level
  let requiredXP = currentLevel * 100
  let leveledUp = false

  while (userData.xp >= requiredXP) {
    userData.xp -= requiredXP
    userData.level += 1
    leveledUp = true
    currentLevel = userData.level
    requiredXP = currentLevel * 100
  }

  await xpRepository.setXP(userId, guildId, userData.xp, userData.level)

  // ✅ إرسال رسالة الصعود في القناة الصح
  if (leveledUp && message) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("🎉 Level Up!")
        .setDescription(`${message.author} وصل للمستوى **${userData.level}**`)
        .setColor(0x00ff00)
        .setThumbnail(message.author.displayAvatarURL())
        .setTimestamp()

      // لو عنده قناة صعود محددة — يرسل فيها، وإلا نفس القناة
      if (settings.levelup_channel_id) {
        const levelupChannel = message.guild?.channels.cache.get(settings.levelup_channel_id)
        if (levelupChannel) {
          await levelupChannel.send({ embeds: [embed] })
        } else {
          await message.channel.send({ embeds: [embed] })
        }
      } else {
        await message.channel.send({ embeds: [embed] })
      }
    } catch (err) {
      // صامت — ما نوقف الـ XP بسبب فشل الرسالة
    }
  }

  return { leveledUp, level: userData.level }
}

function calculateLevelFromXP(totalXP) {
  let level = 1
  let remaining = totalXP

  while (remaining >= level * 100) {
    remaining -= level * 100
    level++
  }

  return {
    level,
    currentXP: remaining,
    requiredXP: level * 100
  }
}

async function getUserXPData(userId, guildId) {
  try {
    const data = await xpRepository.getOrCreateXP(userId, guildId)
    if (!data) return null

    const rankResult = await databaseSystem.query(
      `SELECT COUNT(*) + 1 as rank FROM xp 
       WHERE guild_id = $1 AND (xp > $2 OR (xp = $2 AND level > $3))`,
      [guildId, data.xp, data.level]
    )
    const rank = parseInt(rankResult.rows[0]?.rank || 1)

    let totalXP = 0
    for (let i = 1; i < data.level; i++) {
      totalXP += i * 100
    }
    totalXP += data.xp

    const requiredXP = data.level * 100
    const progressPercent = Math.floor((data.xp / requiredXP) * 100)

    return {
      xp: data.xp,
      level: data.level,
      totalXP,
      currentXP: data.xp,
      requiredXP,
      progressPercent,
      rank
    }
  } catch {
    return null
  }
}

async function getLeaderboard(guildId, limit = 10) {
  try {
    const result = await databaseSystem.query(
      `SELECT user_id, xp, level FROM xp 
       WHERE guild_id = $1 
       ORDER BY level DESC, xp DESC 
       LIMIT $2`,
      [guildId, limit]
    )

    return result.rows.map(row => {
      let totalXP = 0
      for (let i = 1; i < row.level; i++) totalXP += i * 100
      totalXP += row.xp

      return { ...row, totalXP }
    })
  } catch {
    return []
  }
}

module.exports = {
  addXP,
  getUserXPData,
  getLeaderboard,
  calculateLevelFromXP
}