// ══════════════════════════════════════════════════════════════════
//  AUTOMOD SYSTEM
//  المسار: systems/automodSystem.js
//
//  المسؤولية:
//   • يفحص كل رسالة (من messageCreate)
//   • يستدعي filters.js للفحص الفعلي
//   • يطبّق العقوبة حسب severity + violations count
//   • يسجل في automod_violations + يرسل log
//
//  نظام العقوبات (Progressive):
//   - 1-2 violations في 24h  : warning + delete
//   - 3-4 violations في 24h  : mute 10min + delete
//   - 5+ violations في 24h   : mute 1h + delete
//
//  يحترم:
//   - whitelist (roles/channels/users)
//   - Admin permission (تخطي تلقائي)
//   - Bot messages (تخطي)
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")
const scheduler = require("./schedulerSystem")
const filters = require("./automod/filters")

// ──────────────────────────────────────────────────────────────────
//  Cache
// ──────────────────────────────────────────────────────────────────

const settingsCache = new Map()
const wordsCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

function getCached(map, key) {
  const cached = map.get(key)
  if (!cached) return null
  if (Date.now() - cached.time > CACHE_TTL) {
    map.delete(key)
    return null
  }
  return cached.data
}

function setCached(map, key, data) {
  map.set(key, { data, time: Date.now() })
}

function invalidateCache(guildId) {
  settingsCache.delete(guildId)
  wordsCache.delete(guildId)
}

// ──────────────────────────────────────────────────────────────────
//  Load settings
// ──────────────────────────────────────────────────────────────────

async function loadSettings(guildId) {
  const cached = getCached(settingsCache, guildId)
  if (cached !== null) return cached

  try {
    const row = await databaseSystem.queryOne(
      "SELECT * FROM automod_settings WHERE guild_id = $1",
      [guildId]
    )

    if (!row || !row.enabled) {
      setCached(settingsCache, guildId, false)
      return false
    }

    const data = {
      enabled: true,
      filters: typeof row.filters === "string" ? JSON.parse(row.filters) : (row.filters || {}),
      whitelist: typeof row.whitelist === "string" ? JSON.parse(row.whitelist) : (row.whitelist || {}),
      log_channel: row.log_channel || null
    }

    setCached(settingsCache, guildId, data)
    return data
  } catch (err) {
    logger.error("AUTOMOD_LOAD_SETTINGS_FAILED", { error: err.message })
    return false
  }
}

async function loadCustomWords(guildId) {
  const cached = getCached(wordsCache, guildId)
  if (cached !== null) return cached

  try {
    const result = await databaseSystem.query(
      "SELECT word, type, match_type FROM automod_words WHERE guild_id = $1",
      [guildId]
    )
    const words = result.rows || []
    setCached(wordsCache, guildId, words)
    return words
  } catch {
    setCached(wordsCache, guildId, [])
    return []
  }
}

// ──────────────────────────────────────────────────────────────────
//  Whitelist check
// ──────────────────────────────────────────────────────────────────

function isWhitelisted(message, settings) {
  const wl = settings.whitelist || {}

  // 1) قنوات مستثناة
  if (Array.isArray(wl.channels) && wl.channels.includes(message.channel.id)) {
    return true
  }

  // 2) مستخدمين مستثنين
  if (Array.isArray(wl.users) && wl.users.includes(message.author.id)) {
    return true
  }

  // 3) رتب مستثناة
  if (Array.isArray(wl.roles)) {
    const memberRoles = message.member?.roles?.cache
    if (memberRoles) {
      for (const roleId of wl.roles) {
        if (memberRoles.has(roleId)) return true
      }
    }
  }

  // 4) Admins تلقائياً
  if (message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
    return true
  }

  // 5) ManageMessages أيضاً (مشرفين)
  if (message.member?.permissions?.has(PermissionFlagsBits.ManageMessages)) {
    return true
  }

  return false
}

// ──────────────────────────────────────────────────────────────────
//  Get violations count (last 24h)
// ──────────────────────────────────────────────────────────────────

async function getRecentViolations(guildId, userId) {
  try {
    const r = await databaseSystem.queryOne(
      `SELECT COUNT(*)::int AS count
       FROM automod_violations
       WHERE guild_id = $1 AND user_id = $2
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [guildId, userId]
    )
    return r?.count || 0
  } catch {
    return 0
  }
}

// ──────────────────────────────────────────────────────────────────
//  Decide action based on count + severity
// ──────────────────────────────────────────────────────────────────

function decideAction(violationCount, severity) {
  // severity 'high' = مباشرة عقوبة أقوى
  if (severity === "high") {
    if (violationCount === 0) return { type: "warn", muteMs: 0 }
    if (violationCount < 3) return { type: "mute", muteMs: 10 * 60 * 1000 }
    return { type: "mute", muteMs: 60 * 60 * 1000 }
  }

  // medium / low — progressive
  if (violationCount < 2) return { type: "warn", muteMs: 0 }
  if (violationCount < 4) return { type: "mute", muteMs: 10 * 60 * 1000 }
  return { type: "mute", muteMs: 60 * 60 * 1000 }
}

// ──────────────────────────────────────────────────────────────────
//  Apply action
// ──────────────────────────────────────────────────────────────────

async function applyAction(message, action, violation) {
  const member = message.member
  if (!member) return false

  try {
    // 1) احذف الرسالة دائماً
    await message.delete().catch(() => {})

    // 2) طبّق العقوبة
    if (action.type === "mute" && action.muteMs > 0) {
      const botMember = message.guild.members.me
      const botCanMute = botMember?.permissions?.has(PermissionFlagsBits.ModerateMembers)
      const memberTop = member.roles.highest.position
      const botTop = botMember?.roles?.highest?.position || 0

      if (botCanMute && memberTop < botTop && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        await member.timeout(action.muteMs, `AutoMod: ${violation.reason}`).catch(() => {})
      }
    }

    return true
  } catch (err) {
    logger.error("AUTOMOD_APPLY_FAILED", { error: err.message })
    return false
  }
}

// ──────────────────────────────────────────────────────────────────
//  Send warning to user (in channel, ephemeral-style)
// ──────────────────────────────────────────────────────────────────

async function sendWarning(message, violation, action) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setDescription(`⚠️ <@${message.author.id}> — ${violation.reason}`)
      .setFooter({
        text: action.type === "mute"
          ? `تم كتمك ${formatDuration(action.muteMs)}`
          : "هذا تحذير"
      })

    const warning = await message.channel.send({
      embeds: [embed],
      allowedMentions: { users: [message.author.id] }
    })

    // امسحه بعد 8 ثواني
    setTimeout(() => warning.delete().catch(() => {}), 8000)
  } catch {}
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes} دقيقة`
  const hours = Math.floor(minutes / 60)
  return `${hours} ساعة`
}

// ──────────────────────────────────────────────────────────────────
//  Send to log channel
// ──────────────────────────────────────────────────────────────────

async function sendLog(message, violation, action, settings) {
  try {
    const channelId = settings.log_channel
    if (!channelId) return

    const channel = message.guild.channels.cache.get(channelId)
    if (!channel?.isTextBased?.()) return

    const embed = new EmbedBuilder()
      .setColor(violation.severity === "high" ? 0xef4444 : 0xf59e0b)
      .setTitle("🛡️ AutoMod — مخالفة")
      .addFields(
        { name: "👤 العضو", value: `<@${message.author.id}>\n\`${message.author.username}\``, inline: true },
        { name: "📌 القناة", value: `<#${message.channel.id}>`, inline: true },
        { name: "⚡ العقوبة", value: action.type === "mute" ? `🔇 كتم ${formatDuration(action.muteMs)}` : "⚠️ تحذير", inline: true },
        { name: "📋 السبب", value: violation.reason, inline: false }
      )
      .setTimestamp()

    // أضف محتوى الرسالة (مع truncation)
    if (message.content) {
      const content = message.content.length > 500
        ? message.content.slice(0, 500) + "..."
        : message.content
      embed.addFields({ name: "💬 الرسالة", value: `\`\`\`${content.replace(/`/g, "'")}\`\`\``, inline: false })
    }

    embed.setFooter({ text: `معرف العضو: ${message.author.id}` })

    await channel.send({ embeds: [embed] }).catch(() => {})
  } catch (err) {
    logger.error("AUTOMOD_LOG_SEND_FAILED", { error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
//  Record violation in DB
// ──────────────────────────────────────────────────────────────────

async function recordViolation(message, violation, action) {
  try {
    await databaseSystem.query(
      `INSERT INTO automod_violations
         (guild_id, user_id, filter_type, action, message_id, content)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        message.guild.id,
        message.author.id,
        violation.reason.slice(0, 100),
        action.type,
        message.id,
        message.content?.slice(0, 500) || null
      ]
    )
  } catch (err) {
    logger.error("AUTOMOD_RECORD_FAILED", { error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
//  MAIN: Check message
// ──────────────────────────────────────────────────────────────────

async function checkMessage(message) {
  try {
    // ─── basic guards ───
    if (!message?.guild) return
    if (!message.author || message.author.bot) return
    if (!message.content && message.attachments.size === 0) return

    // ─── load settings ───
    const settings = await loadSettings(message.guild.id)
    if (!settings) return // ما هو مفعّل

    // ─── whitelist check ───
    if (isWhitelisted(message, settings)) return

    // ─── load custom words ───
    const customWords = await loadCustomWords(message.guild.id)

    // ─── run filters ───
    const violations = await filters.runAllFilters(
      message.content || "",
      settings,
      {
        message,
        userId: message.author.id,
        guildId: message.guild.id,
        customWords
      }
    )

    if (violations.length === 0) return

    // ─── خذ أقوى violation ───
    const severityOrder = { high: 3, medium: 2, low: 1 }
    violations.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
    const top = violations[0]

    // ─── احسب action ───
    const violationCount = await getRecentViolations(message.guild.id, message.author.id)
    const action = decideAction(violationCount, top.severity)

    // ─── طبّق ───
    const applied = await applyAction(message, action, top)
    if (!applied) return

    // ─── سجّل + بلغ ───
    await Promise.all([
      recordViolation(message, top, action),
      sendWarning(message, top, action),
      sendLog(message, top, action, settings)
    ])

    logger.info("AUTOMOD_VIOLATION_HANDLED", {
      guildId: message.guild.id,
      userId: message.author.id,
      filter: top.reason,
      action: action.type
    })
  } catch (err) {
    logger.error("AUTOMOD_CHECK_FAILED", { error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
//  Settings CRUD (للـ API)
// ──────────────────────────────────────────────────────────────────

async function getSettings(guildId) {
  try {
    const row = await databaseSystem.queryOne(
      "SELECT * FROM automod_settings WHERE guild_id = $1",
      [guildId]
    )

    return {
      enabled: row?.enabled === true,
      filters: row?.filters ? (typeof row.filters === "string" ? JSON.parse(row.filters) : row.filters) : {},
      whitelist: row?.whitelist ? (typeof row.whitelist === "string" ? JSON.parse(row.whitelist) : row.whitelist) : { roles: [], channels: [], users: [] },
      log_channel: row?.log_channel || null
    }
  } catch (err) {
    logger.error("AUTOMOD_GET_SETTINGS_FAILED", { error: err.message })
    return {
      enabled: false,
      filters: {},
      whitelist: { roles: [], channels: [], users: [] },
      log_channel: null
    }
  }
}

async function saveSettings(guildId, data) {
  try {
    const enabled = data.enabled === true
    const filtersData = data.filters && typeof data.filters === "object" ? data.filters : {}
    const whitelist = {
      roles: Array.isArray(data.whitelist?.roles) ? data.whitelist.roles.filter(s => typeof s === "string") : [],
      channels: Array.isArray(data.whitelist?.channels) ? data.whitelist.channels.filter(s => typeof s === "string") : [],
      users: Array.isArray(data.whitelist?.users) ? data.whitelist.users.filter(s => typeof s === "string") : []
    }
    const logChannel = data.log_channel || null

    await databaseSystem.query(
      `INSERT INTO automod_settings (guild_id, enabled, filters, whitelist, log_channel, updated_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         filters = EXCLUDED.filters,
         whitelist = EXCLUDED.whitelist,
         log_channel = EXCLUDED.log_channel,
         updated_at = NOW()`,
      [
        guildId,
        enabled,
        JSON.stringify(filtersData),
        JSON.stringify(whitelist),
        logChannel
      ]
    )

    invalidateCache(guildId)
    return true
  } catch (err) {
    logger.error("AUTOMOD_SAVE_SETTINGS_FAILED", { error: err.message })
    throw err
  }
}

// ──────────────────────────────────────────────────────────────────
//  Custom words CRUD
// ──────────────────────────────────────────────────────────────────

async function getCustomWords(guildId) {
  try {
    const r = await databaseSystem.query(
      "SELECT id, word, type, match_type, created_at FROM automod_words WHERE guild_id = $1 ORDER BY created_at DESC",
      [guildId]
    )
    return r.rows || []
  } catch {
    return []
  }
}

async function addCustomWord(guildId, word, type = "banned") {
  try {
    if (!word || typeof word !== "string") throw new Error("الكلمة غير صالحة")
    if (word.length > 100) throw new Error("الكلمة طويلة جداً")

    const cleanType = ["banned", "warned"].includes(type) ? type : "banned"

    await databaseSystem.query(
      `INSERT INTO automod_words (guild_id, word, type, match_type)
       VALUES ($1, $2, $3, 'contains')
       ON CONFLICT (guild_id, word) DO UPDATE SET type = EXCLUDED.type`,
      [guildId, word.trim().toLowerCase(), cleanType]
    )

    invalidateCache(guildId)
    return true
  } catch (err) {
    logger.error("AUTOMOD_ADD_WORD_FAILED", { error: err.message })
    throw err
  }
}

async function removeCustomWord(guildId, wordId) {
  try {
    await databaseSystem.query(
      "DELETE FROM automod_words WHERE id = $1 AND guild_id = $2",
      [wordId, guildId]
    )
    invalidateCache(guildId)
    return true
  } catch (err) {
    logger.error("AUTOMOD_REMOVE_WORD_FAILED", { error: err.message })
    throw err
  }
}

// ──────────────────────────────────────────────────────────────────
//  Violations history
// ──────────────────────────────────────────────────────────────────

async function getViolations(guildId, options = {}) {
  try {
    const limit = Math.min(parseInt(options.limit) || 50, 200)
    const userId = options.userId || null

    let sql = `
      SELECT * FROM automod_violations
      WHERE guild_id = $1
    `
    const params = [guildId]

    if (userId) {
      params.push(userId)
      sql += ` AND user_id = $${params.length}`
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const r = await databaseSystem.query(sql, params)
    return r.rows || []
  } catch {
    return []
  }
}

// ──────────────────────────────────────────────────────────────────
//  Cleanup old violations (older than 30 days)
// ──────────────────────────────────────────────────────────────────

async function cleanupOldViolations() {
  try {
    await databaseSystem.query(
      "DELETE FROM automod_violations WHERE created_at < NOW() - INTERVAL '30 days'"
    )
    filters.cleanupDuplicateTracker()
  } catch (err) {
    logger.error("AUTOMOD_CLEANUP_FAILED", { error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
//  Start cleanup scheduler
// ──────────────────────────────────────────────────────────────────

function startScheduler() {
  scheduler.register("automod-cleanup", 60 * 60 * 1000, cleanupOldViolations, false)
  logger.info("AUTOMOD_SCHEDULER_STARTED")
}

// ──────────────────────────────────────────────────────────────────
//  Exports
// ──────────────────────────────────────────────────────────────────

module.exports = {
  checkMessage,
  getSettings,
  saveSettings,
  getCustomWords,
  addCustomWord,
  removeCustomWord,
  getViolations,
  invalidateCache,
  startScheduler,
  DEFAULT_BAD_WORDS_COUNT: filters.DEFAULT_BAD_WORDS.length
}