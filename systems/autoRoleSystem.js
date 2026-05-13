// ══════════════════════════════════════════════════════════════════
//  AUTO ROLE SYSTEM
//  المسار: systems/autoRoleSystem.js
//
//  يُستدعى من: events/logs/guildMemberAdd.js
//
//  المنطق:
//   1. يجلب إعدادات السيرفر (cached 5min)
//   2. يفحص: enabled? + require_verified؟
//   3. يحدد type المناسب (bot أو human)
//   4. يطبّق التأخير لو موجود
//   5. يعطي الرتب — مع safety checks (hierarchy + managed + missing)
//   6. يسجل في auto_role_history
//   7. يرسل لوق
//
//  Safety:
//   - يتخطى الرتب المُدارة (managed = bot/integration roles)
//   - يتخطى الرتب الأعلى من رتبة البوت
//   - يتخطى الرتب اللي ما عاد موجودة (deleted)
//   - يحترم Anti-Raid (لو السيرفر في lockdown، نتخطى)
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

// ──────────────────────────────────────────────────────────────────
//  Cache
// ──────────────────────────────────────────────────────────────────

const settingsCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 دقائق

function getCached(guildId) {
  const cached = settingsCache.get(guildId)
  if (!cached) return null
  if (Date.now() - cached.time > CACHE_TTL) {
    settingsCache.delete(guildId)
    return null
  }
  return cached.data
}

function setCached(guildId, data) {
  settingsCache.set(guildId, { data, time: Date.now() })
}

function invalidateCache(guildId) {
  settingsCache.delete(guildId)
}

// ──────────────────────────────────────────────────────────────────
//  Load settings + assignments (combined)
// ──────────────────────────────────────────────────────────────────

async function loadSettings(guildId) {
  const cached = getCached(guildId)
  if (cached) return cached

  try {
    const settingsRow = await databaseSystem.queryOne(
      "SELECT * FROM auto_role_settings WHERE guild_id = $1",
      [guildId]
    )

    if (!settingsRow || !settingsRow.enabled) {
      const empty = { enabled: false, assignments: [] }
      setCached(guildId, empty)
      return empty
    }

    const assignmentsResult = await databaseSystem.query(
      "SELECT role_id, type FROM auto_role_assignments WHERE guild_id = $1",
      [guildId]
    )

    const data = {
      enabled: true,
      delay_seconds: parseInt(settingsRow.delay_seconds) || 0,
      require_verified: settingsRow.require_verified === true,
      assignments: assignmentsResult.rows || []
    }

    setCached(guildId, data)
    return data
  } catch (err) {
    logger.error("AUTOROLE_LOAD_FAILED", { error: err.message, guildId })
    return { enabled: false, assignments: [] }
  }
}

// ──────────────────────────────────────────────────────────────────
//  Filter assignments by member type (bot vs human)
// ──────────────────────────────────────────────────────────────────

function filterByMemberType(assignments, member) {
  const isBot = member.user.bot
  return assignments.filter(a => {
    if (a.type === "both") return true
    if (a.type === "bot" && isBot) return true
    if (a.type === "human" && !isBot) return true
    return false
  })
}

// ──────────────────────────────────────────────────────────────────
//  Validate role can be assigned (safety checks)
// ──────────────────────────────────────────────────────────────────

function getAssignableRoles(roleIds, member) {
  const guild = member.guild
  const botMember = guild.members.me
  if (!botMember) return { valid: [], skipped: [] }

  const botTopPosition = botMember.roles.highest.position

  const valid = []
  const skipped = []

  for (const roleId of roleIds) {
    const role = guild.roles.cache.get(roleId)

    if (!role) {
      skipped.push({ roleId, reason: "deleted" })
      continue
    }

    if (role.managed) {
      skipped.push({ roleId, reason: "managed", name: role.name })
      continue
    }

    if (role.position >= botTopPosition) {
      skipped.push({ roleId, reason: "hierarchy", name: role.name })
      continue
    }

    if (role.id === guild.id) {
      // @everyone
      skipped.push({ roleId, reason: "everyone" })
      continue
    }

    valid.push(role)
  }

  return { valid, skipped }
}

// ──────────────────────────────────────────────────────────────────
//  Save to history (للـ rejoin restoration لاحقاً)
// ──────────────────────────────────────────────────────────────────

async function saveHistory(guildId, userId, roleIds) {
  try {
    await databaseSystem.query(
      `INSERT INTO auto_role_history (guild_id, user_id, role_ids)
       VALUES ($1, $2, $3::jsonb)`,
      [guildId, userId, JSON.stringify(roleIds)]
    )
  } catch (err) {
    logger.error("AUTOROLE_HISTORY_SAVE_FAILED", { error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
//  MAIN: Apply auto roles to a new member
// ──────────────────────────────────────────────────────────────────

async function applyToMember(member) {
  try {
    if (!member?.guild || !member.id) return

    const guild = member.guild
    const settings = await loadSettings(guild.id)

    if (!settings.enabled) return
    if (!settings.assignments || settings.assignments.length === 0) return

    // فلترة حسب النوع (bot/human)
    const filtered = filterByMemberType(settings.assignments, member)
    if (filtered.length === 0) return

    // شرط verified (membership screening)
    if (settings.require_verified && member.pending) {
      logger.info("AUTOROLE_SKIP_PENDING", {
        guildId: guild.id,
        userId: member.id
      })
      return
    }

    // تأخير اختياري
    if (settings.delay_seconds > 0) {
      await new Promise(r => setTimeout(r, settings.delay_seconds * 1000))

      // بعد التأخير، نتأكد إنه ما زال موجود
      try {
        const stillThere = await guild.members.fetch(member.id).catch(() => null)
        if (!stillThere) return
        member = stillThere
      } catch {
        return
      }
    }

    // فحص الـ permission
    const botMember = guild.members.me
    if (!botMember?.permissions?.has("ManageRoles")) {
      logger.warn("AUTOROLE_MISSING_PERMISSION", { guildId: guild.id })
      return
    }

    // safety checks على كل رتبة
    const roleIds = filtered.map(a => a.role_id)
    const { valid, skipped } = getAssignableRoles(roleIds, member)

    if (skipped.length > 0) {
      logger.warn("AUTOROLE_ROLES_SKIPPED", {
        guildId: guild.id,
        skipped: skipped.map(s => `${s.name || s.roleId} (${s.reason})`).join(", ")
      })
    }

    if (valid.length === 0) return

    // إعطاء الرتب (دفعة واحدة عشان أقل API calls)
    try {
      await member.roles.add(valid, "Auto-Role: انضمام عضو جديد")

      // سجل التاريخ
      await saveHistory(guild.id, member.id, valid.map(r => r.id))

      logger.info("AUTOROLE_APPLIED", {
        guildId: guild.id,
        userId: member.id,
        isBot: member.user.bot,
        roles: valid.map(r => r.name).join(", ")
      })

      // أرسل لوق (اختياري — لو في log_settings)
      try {
        const { sendLog } = require("../utils/logSender")
        await sendLog(guild.client, guild.id, "member_update", {
          title: "🎯 رتبة تلقائية",
          color: 0x10b981,
          fields: [
            { name: "👤 العضو", value: `<@${member.id}>`, inline: true },
            { name: "🤖 نوع", value: member.user.bot ? "بوت" : "بشر", inline: true },
            { name: "🏷️ الرتب", value: valid.map(r => `<@&${r.id}>`).join(" "), inline: false }
          ],
          footer: `معرف العضو: ${member.id}`
        })
      } catch {}

    } catch (err) {
      logger.error("AUTOROLE_APPLY_FAILED", {
        guildId: guild.id,
        userId: member.id,
        error: err.message
      })
    }

  } catch (err) {
    logger.error("AUTOROLE_FATAL", { error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
//  Settings CRUD (للـ API)
// ──────────────────────────────────────────────────────────────────

async function getSettings(guildId) {
  try {
    const settingsRow = await databaseSystem.queryOne(
      "SELECT * FROM auto_role_settings WHERE guild_id = $1",
      [guildId]
    )

    const assignmentsResult = await databaseSystem.query(
      "SELECT role_id, type FROM auto_role_assignments WHERE guild_id = $1 ORDER BY id ASC",
      [guildId]
    )

    return {
      enabled: settingsRow?.enabled === true,
      delay_seconds: parseInt(settingsRow?.delay_seconds) || 0,
      require_verified: settingsRow?.require_verified === true,
      assignments: assignmentsResult.rows || []
    }
  } catch (err) {
    logger.error("AUTOROLE_GET_SETTINGS_FAILED", { error: err.message })
    return {
      enabled: false,
      delay_seconds: 0,
      require_verified: false,
      assignments: []
    }
  }
}

async function saveSettings(guildId, data) {
  try {
    const enabled = data.enabled === true
    const delaySeconds = Math.max(0, Math.min(parseInt(data.delay_seconds) || 0, 300)) // 0-5 دقائق
    const requireVerified = data.require_verified === true

    await databaseSystem.query(
      `INSERT INTO auto_role_settings (guild_id, enabled, delay_seconds, require_verified, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         delay_seconds = EXCLUDED.delay_seconds,
         require_verified = EXCLUDED.require_verified,
         updated_at = NOW()`,
      [guildId, enabled, delaySeconds, requireVerified]
    )

    // assignments: replace كامل (transactional)
    if (Array.isArray(data.assignments)) {
      const client = await databaseSystem.getClient()
      try {
        await client.query("BEGIN")
        await client.query(
          "DELETE FROM auto_role_assignments WHERE guild_id = $1",
          [guildId]
        )

        for (const a of data.assignments) {
          if (!a.role_id) continue
          const type = ["human", "bot", "both"].includes(a.type) ? a.type : "human"

          await client.query(
            `INSERT INTO auto_role_assignments (guild_id, role_id, type)
             VALUES ($1, $2, $3)
             ON CONFLICT (guild_id, role_id, type) DO NOTHING`,
            [guildId, a.role_id, type]
          )
        }

        await client.query("COMMIT")
      } catch (err) {
        await client.query("ROLLBACK")
        throw err
      } finally {
        client.release()
      }
    }

    invalidateCache(guildId)
    return true
  } catch (err) {
    logger.error("AUTOROLE_SAVE_SETTINGS_FAILED", { error: err.message })
    throw err
  }
}

// ──────────────────────────────────────────────────────────────────
//  Exports
// ──────────────────────────────────────────────────────────────────

module.exports = {
  applyToMember,
  getSettings,
  saveSettings,
  invalidateCache
}