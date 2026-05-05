const { EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")
const scheduler = require("./schedulerSystem")

// ═══════════════════════════════════════════════════
//  IN-MEMORY TRACKERS
// ═══════════════════════════════════════════════════

// Anti-Spam: { guildId_userId -> [timestamps] }
const spamTracker = new Map()

// Anti-Raid: { guildId -> [timestamps] }
const raidTracker = new Map()

// Anti-Nuke: { guildId_executorId -> { channelDeletes, roleDeletes, bans, timestamps } }
const nukeTracker = new Map()

// Settings cache: { guildId -> settings }
const settingsCache = new Map()
const CACHE_TTL = 2 * 60 * 1000 // دقيقتين

// Raid lockdown state: { guildId -> { active: true, autoLiftTimer: timeoutId|null } }
// ⚠️ لاحظ: هذي in-memory فقط. لو البوت يُعاد تشغيله أثناء lockdown،
//   القنوات تبقى مقفولة في Discord لكن الـ state يضيع.
//   الحل المستقبلي: حفظ في DB. الحل الحالي: على الأدمن يفك يدوياً.
const lockdownState = new Map()

const LOCKDOWN_AUTO_LIFT_MS = 10 * 60 * 1000 // 10 دقائق

// ═══════════════════════════════════════════════════
//  JSON HELPER — حماية للقراءة من DB
// ═══════════════════════════════════════════════════

/**
 * يحوّل قيمة من DB إلى array.
 * يدعم:
 *  - array أصلاً (JSONB من Postgres)
 *  - string JSON (TEXT من Postgres)
 *  - null/undefined → []
 */
function parseJSONArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// ═══════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════

async function getSettings(guildId) {
  const cached = settingsCache.get(guildId)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data
  }

  try {
    const result = await databaseSystem.queryOne(
      "SELECT * FROM protection_settings WHERE guild_id = $1",
      [guildId]
    )

    let data = result || null

    // ✅ FIX: فك تشفير JSON للـ whitelist
    if (data) {
      data.whitelist_users = parseJSONArray(data.whitelist_users)
      data.whitelist_roles = parseJSONArray(data.whitelist_roles)
    }

    settingsCache.set(guildId, { data, time: Date.now() })
    return data
  } catch (err) {
    logger.error("PROTECTION_GET_SETTINGS_FAILED", { error: err.message })
    return null
  }
}

async function saveSettings(guildId, data) {
  try {
    await databaseSystem.query(`
      INSERT INTO protection_settings (
        guild_id,
        antispam_enabled, antispam_max_messages, antispam_interval_ms, antispam_action, antispam_mute_duration,
        antiraid_enabled, antiraid_join_threshold, antiraid_join_interval_ms, antiraid_action,
        antinuke_enabled, antinuke_channel_delete_threshold, antinuke_role_delete_threshold,
        antinuke_ban_threshold, antinuke_interval_ms, antinuke_action,
        log_channel_id, whitelist_roles, whitelist_users, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())
      ON CONFLICT (guild_id) DO UPDATE SET
        antispam_enabled = $2, antispam_max_messages = $3, antispam_interval_ms = $4,
        antispam_action = $5, antispam_mute_duration = $6,
        antiraid_enabled = $7, antiraid_join_threshold = $8, antiraid_join_interval_ms = $9,
        antiraid_action = $10,
        antinuke_enabled = $11, antinuke_channel_delete_threshold = $12,
        antinuke_role_delete_threshold = $13, antinuke_ban_threshold = $14,
        antinuke_interval_ms = $15, antinuke_action = $16,
        log_channel_id = $17, whitelist_roles = $18, whitelist_users = $19,
        updated_at = NOW()
    `, [
      guildId,
      data.antispam_enabled ?? false,
      data.antispam_max_messages ?? 5,
      data.antispam_interval_ms ?? 3000,
      data.antispam_action ?? "mute",
      data.antispam_mute_duration ?? 300000,
      data.antiraid_enabled ?? false,
      data.antiraid_join_threshold ?? 10,
      data.antiraid_join_interval_ms ?? 10000,
      data.antiraid_action ?? "lockdown",
      data.antinuke_enabled ?? false,
      data.antinuke_channel_delete_threshold ?? 3,
      data.antinuke_role_delete_threshold ?? 3,
      data.antinuke_ban_threshold ?? 3,
      data.antinuke_interval_ms ?? 10000,
      data.antinuke_action ?? "ban",
      data.log_channel_id ?? null,
      JSON.stringify(data.whitelist_roles ?? []),
      JSON.stringify(data.whitelist_users ?? [])
    ])

    // مسح الكاش
    settingsCache.delete(guildId)
    return true
  } catch (err) {
    logger.error("PROTECTION_SAVE_SETTINGS_FAILED", { error: err.message })
    return false
  }
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════

function isWhitelisted(settings, userId, memberRoles) {
  if (!settings) return false

  // ✅ FIX: نتأكد إنها arrays فعلياً (parseJSONArray في getSettings)
  const whitelistUsers = Array.isArray(settings.whitelist_users) ? settings.whitelist_users : []
  const whitelistRoles = Array.isArray(settings.whitelist_roles) ? settings.whitelist_roles : []

  if (whitelistUsers.includes(userId)) return true

  if (memberRoles) {
    for (const roleId of whitelistRoles) {
      if (memberRoles.has(roleId)) return true
    }
  }

  return false
}

async function sendLog(guild, settings, embed) {
  if (!settings?.log_channel_id) return

  try {
    const channel = guild.channels.cache.get(settings.log_channel_id)
    if (!channel) return

    const perms = channel.permissionsFor(guild.members.me)
    if (!perms?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) return

    await channel.send({ embeds: [embed] })
  } catch (err) {
    logger.error("PROTECTION_LOG_FAILED", { error: err.message })
  }
}

async function muteUser(member, duration, reason) {
  try {
    if (!member.moderatable) return false
    await member.timeout(duration, reason)
    return true
  } catch {
    return false
  }
}

async function kickUser(member, reason) {
  try {
    if (!member.kickable) return false
    await member.kick(reason)
    return true
  } catch {
    return false
  }
}

async function banUser(member, reason) {
  try {
    if (!member.bannable) return false
    await member.ban({ reason, deleteMessageSeconds: 0 })
    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════════
//  ANTI-SPAM
// ═══════════════════════════════════════════════════

async function checkSpam(message) {
  try {
    if (!message.guild || !message.member) return
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return

    const settings = await getSettings(message.guild.id)
    if (!settings?.antispam_enabled) return

    if (isWhitelisted(settings, message.author.id, message.member.roles.cache)) return

    const key = `${message.guild.id}_${message.author.id}`
    const now = Date.now()
    const interval = settings.antispam_interval_ms || 3000
    const maxMessages = settings.antispam_max_messages || 5

    if (!spamTracker.has(key)) {
      spamTracker.set(key, [])
    }

    const timestamps = spamTracker.get(key)
    timestamps.push(now)

    // نظف القديم
    const filtered = timestamps.filter(t => now - t < interval)
    spamTracker.set(key, filtered)

    if (filtered.length < maxMessages) return

    // تجاوز الحد!
    spamTracker.delete(key)

    const action = settings.antispam_action || "mute"
    const member = message.member
    let actionDone = false
    let actionText = ""

    if (action === "mute") {
      const duration = settings.antispam_mute_duration || 300000
      actionDone = await muteUser(member, duration, "🛡️ Anti-Spam تلقائي")
      actionText = `🔇 كُتم لمدة ${Math.floor(duration / 60000)} دقيقة`
    } else if (action === "kick") {
      actionDone = await kickUser(member, "🛡️ Anti-Spam تلقائي")
      actionText = "👢 تم طرده"
    } else if (action === "ban") {
      actionDone = await banUser(member, "🛡️ Anti-Spam تلقائي")
      actionText = "🚫 تم حظره"
    }

    if (!actionDone) return

    // حذف رسائل الـ Spam
    try {
      const msgs = await message.channel.messages.fetch({ limit: 20 })
      const spamMsgs = msgs.filter(m => m.author.id === message.author.id)
      await message.channel.bulkDelete(spamMsgs, true).catch(() => {})
    } catch {}

    // لوق
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🛡️ Anti-Spam — تم اكتشاف فلد")
      .addFields(
        { name: "👤 المستخدم", value: `${message.author} (\`${message.author.username}\`)`, inline: true },
        { name: "📌 القناة", value: `${message.channel}`, inline: true },
        { name: "📊 الرسائل", value: `${filtered.length} رسائل في ${interval / 1000} ثانية`, inline: true },
        { name: "⚡ الإجراء", value: actionText, inline: true }
      )
      .setTimestamp()

    await sendLog(message.guild, settings, embed)

    logger.info("ANTISPAM_ACTION", {
      guild: message.guild.id,
      user: message.author.id,
      action
    })

  } catch (err) {
    logger.error("ANTISPAM_CHECK_FAILED", { error: err.message })
  }
}

// ═══════════════════════════════════════════════════
//  ANTI-RAID
// ═══════════════════════════════════════════════════

async function checkRaid(member) {
  try {
    if (!member.guild) return

    const settings = await getSettings(member.guild.id)
    if (!settings?.antiraid_enabled) return

    const guildId = member.guild.id
    const now = Date.now()
    const interval = settings.antiraid_join_interval_ms || 10000
    const threshold = settings.antiraid_join_threshold || 10

    if (!raidTracker.has(guildId)) {
      raidTracker.set(guildId, [])
    }

    const joins = raidTracker.get(guildId)
    joins.push(now)

    const filtered = joins.filter(t => now - t < interval)
    raidTracker.set(guildId, filtered)

    if (filtered.length < threshold) return
    if (isInLockdown(guildId)) return // بالفعل في lockdown

    // RAID مكتشف!
    raidTracker.delete(guildId)
    const action = settings.antiraid_action || "lockdown"

    if (action === "lockdown") {
      await activateLockdown(member.guild, settings)
    } else if (action === "kick") {
      // طرد الأعضاء الجدد اللي دخلوا في الـ interval
      const recentMembers = member.guild.members.cache.filter(m => {
        return m.joinedTimestamp && now - m.joinedTimestamp < interval
      })
      for (const [, m] of recentMembers) {
        if (m.kickable) await m.kick("🛡️ Anti-Raid تلقائي").catch(() => {})
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("🛡️ Anti-Raid — تم اكتشاف Raid!")
      .addFields(
        { name: "📊 الانضمامات", value: `${filtered.length} عضو في ${interval / 1000} ثانية`, inline: true },
        { name: "⚡ الإجراء", value: action === "lockdown" ? "🔒 تم تفعيل Lockdown" : "👢 تم طرد الأعضاء الجدد", inline: true }
      )
      .setTimestamp()

    await sendLog(member.guild, settings, embed)

    logger.info("ANTIRAID_ACTION", { guild: guildId, action, joins: filtered.length })

  } catch (err) {
    logger.error("ANTIRAID_CHECK_FAILED", { error: err.message })
  }
}

// ═══════════════════════════════════════════════════
//  LOCKDOWN
// ═══════════════════════════════════════════════════

async function activateLockdown(guild, settings) {
  try {
    // ✅ FIX: حماية من lockdown مكرر
    const existing = lockdownState.get(guild.id)
    if (existing?.active) {
      logger.warn("LOCKDOWN_ALREADY_ACTIVE", { guild: guild.id })
      return
    }

    const everyoneRole = guild.roles.everyone
    const textChannels = guild.channels.cache.filter(c => c.type === 0) // GuildText

    // ✅ FIX: parallel بدل sequential — أسرع بكثير في السيرفرات الكبيرة
    await Promise.allSettled(
      [...textChannels.values()].map(channel =>
        channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false
        }).catch(() => null)
      )
    )

    // ✅ FIX: نخزن timer ID في state عشان نقدر نلغيه
    const autoLiftTimer = setTimeout(() => {
      deactivateLockdown(guild, settings).catch(err =>
        logger.error("LOCKDOWN_AUTO_LIFT_FAILED", { error: err.message })
      )
    }, LOCKDOWN_AUTO_LIFT_MS)

    autoLiftTimer.unref?.()

    lockdownState.set(guild.id, {
      active: true,
      autoLiftTimer,
      activatedAt: Date.now()
    })

    logger.info("LOCKDOWN_ACTIVATED", { guild: guild.id })
  } catch (err) {
    logger.error("LOCKDOWN_ACTIVATION_FAILED", { error: err.message })
  }
}

async function deactivateLockdown(guild, settings) {
  try {
    const state = lockdownState.get(guild.id)

    // ✅ FIX: ألغي الـ auto-lift timer لو موجود (يمنع double-deactivation)
    if (state?.autoLiftTimer) {
      clearTimeout(state.autoLiftTimer)
    }

    lockdownState.delete(guild.id)

    const everyoneRole = guild.roles.everyone
    const textChannels = guild.channels.cache.filter(c => c.type === 0)

    // ✅ FIX: parallel
    await Promise.allSettled(
      [...textChannels.values()].map(channel =>
        channel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: null
        }).catch(() => null)
      )
    )

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("🔓 تم رفع Lockdown")
      .setDescription("تم رفع قفل السيرفر تلقائياً بعد 10 دقائق.")
      .setTimestamp()

    await sendLog(guild, settings, embed)

    logger.info("LOCKDOWN_DEACTIVATED", { guild: guild.id })
  } catch (err) {
    logger.error("LOCKDOWN_DEACTIVATION_FAILED", { error: err.message })
  }
}

function isInLockdown(guildId) {
  const state = lockdownState.get(guildId)
  return state?.active === true
}

// ═══════════════════════════════════════════════════
//  ANTI-NUKE
// ═══════════════════════════════════════════════════

async function checkNuke(guild, executorId, actionType) {
  // actionType: 'channelDelete' | 'roleDelete' | 'ban'
  try {
    if (!guild) return

    const settings = await getSettings(guild.id)
    if (!settings?.antinuke_enabled) return

    // تحقق الـ whitelist
    const member = guild.members.cache.get(executorId)
    if (member && isWhitelisted(settings, executorId, member.roles.cache)) return

    // مالك السيرفر محمي دائماً
    if (executorId === guild.ownerId) return

    const key = `${guild.id}_${executorId}`
    const now = Date.now()
    const interval = settings.antinuke_interval_ms || 10000

    if (!nukeTracker.has(key)) {
      nukeTracker.set(key, {
        channelDeletes: [],
        roleDeletes: [],
        bans: []
      })
    }

    const data = nukeTracker.get(key)

    // أضف الحدث
    if (actionType === "channelDelete") data.channelDeletes.push(now)
    if (actionType === "roleDelete") data.roleDeletes.push(now)
    if (actionType === "ban") data.bans.push(now)

    // نظف القديم
    data.channelDeletes = data.channelDeletes.filter(t => now - t < interval)
    data.roleDeletes = data.roleDeletes.filter(t => now - t < interval)
    data.bans = data.bans.filter(t => now - t < interval)

    const channelThreshold = settings.antinuke_channel_delete_threshold || 3
    const roleThreshold = settings.antinuke_role_delete_threshold || 3
    const banThreshold = settings.antinuke_ban_threshold || 3

    const exceeded =
      data.channelDeletes.length >= channelThreshold ||
      data.roleDeletes.length >= roleThreshold ||
      data.bans.length >= banThreshold

    if (!exceeded) return

    // Nuke مكتشف!
    nukeTracker.delete(key)

    const action = settings.antinuke_action || "ban"
    let actionText = ""

    if (member) {
      if (action === "ban") {
        await banUser(member, "🛡️ Anti-Nuke تلقائي")
        actionText = "🚫 تم حظره"
      } else if (action === "kick") {
        await kickUser(member, "🛡️ Anti-Nuke تلقائي")
        actionText = "👢 تم طرده"
      } else if (action === "strip_roles") {
        try {
          const managedRoles = member.roles.cache.filter(r => !r.managed && r.id !== guild.id)
          await member.roles.remove(managedRoles, "🛡️ Anti-Nuke تلقائي")
          actionText = "🔑 تم سلب صلاحياته"
        } catch {
          actionText = "❌ فشل سلب الصلاحيات"
        }
      }
    }

    const triggerMap = {
      channelDelete: `🗑️ حذف قنوات: ${data.channelDeletes.length + 1}`,
      roleDelete: `🗑️ حذف رتب: ${data.roleDeletes.length + 1}`,
      ban: `🔨 حظر أعضاء: ${data.bans.length + 1}`
    }

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🛡️ Anti-Nuke — تم اكتشاف Nuke!")
      .addFields(
        { name: "👤 المنفذ", value: member ? `${member} (\`${member.user.username}\`)` : `\`${executorId}\``, inline: true },
        { name: "🚨 السبب", value: triggerMap[actionType] || actionType, inline: true },
        { name: "⚡ الإجراء", value: actionText || "لا يوجد", inline: true },
        {
          name: "📊 الإحصائيات",
          value: [
            `قنوات محذوفة: ${data.channelDeletes.length}`,
            `رتب محذوفة: ${data.roleDeletes.length}`,
            `حظر: ${data.bans.length}`
          ].join("\n"),
          inline: false
        }
      )
      .setTimestamp()

    await sendLog(guild, settings, embed)

    logger.info("ANTINUKE_ACTION", {
      guild: guild.id,
      executor: executorId,
      actionType,
      action
    })

  } catch (err) {
    logger.error("ANTINUKE_CHECK_FAILED", { error: err.message })
  }
}

// ═══════════════════════════════════════════════════
//  CLEANUP — كل 5 دقائق عبر scheduler
//  (مو setInterval خام عشان graceful shutdown يقدر يوقفه)
// ═══════════════════════════════════════════════════

scheduler.register(
  "protection-trackers-cleanup",
  5 * 60 * 1000,
  () => {
    const now = Date.now()

    for (const [key, timestamps] of spamTracker.entries()) {
      if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 60000) {
        spamTracker.delete(key)
      }
    }

    for (const [key, joins] of raidTracker.entries()) {
      if (joins.length === 0 || now - joins[joins.length - 1] > 60000) {
        raidTracker.delete(key)
      }
    }

    for (const [key, data] of nukeTracker.entries()) {
      const allEmpty =
        data.channelDeletes.length === 0 &&
        data.roleDeletes.length === 0 &&
        data.bans.length === 0
      if (allEmpty) nukeTracker.delete(key)
    }
  },
  false
)

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
  getSettings,
  saveSettings,
  checkSpam,
  checkRaid,
  checkNuke,
  activateLockdown,
  deactivateLockdown,
  isInLockdown,
  sendLog
}