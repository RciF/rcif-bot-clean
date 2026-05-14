// ══════════════════════════════════════════════════════════════════
//  BULK ACTIONS SYSTEM
//  المسار: systems/bulkActionsSystem.js
//
//  المسؤولية:
//   • تنفيذ عمليات جماعية على Discord (ban, kick, mute, role)
//   • تخزين snapshot قبل التنفيذ (للـ undo)
//   • تنفيذ undo لاحقاً (rollback)
//
//  تُستدعى من dashboard-backend عبر apiServerSystem (x-bot-secret)
//
//  Safety:
//   - rate limiting داخلي (chunks of 5)
//   - safety checks (hierarchy, permissions)
//   - partial failure tolerance (نكمل لو فشل واحد)
// ══════════════════════════════════════════════════════════════════

const { PermissionFlagsBits } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

let _client = null

const CHUNK_SIZE = 5         // ننفذ 5 في نفس الوقت
const CHUNK_DELAY = 1000     // 1 ثانية بين كل chunk
const UNDO_WINDOW_MS = 30 * 1000  // 30 ثانية للـ undo

function setClient(client) { _client = client }

// ──────────────────────────────────────────────────────────────────
//  Helper: chunked execution
// ──────────────────────────────────────────────────────────────────

async function executeInChunks(items, fn) {
  const results = []
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        try {
          const result = await fn(item)
          return { item, ok: true, result }
        } catch (err) {
          return { item, ok: false, error: err.message }
        }
      })
    )
    results.push(...chunkResults)
    if (i + CHUNK_SIZE < items.length) {
      await new Promise(r => setTimeout(r, CHUNK_DELAY))
    }
  }
  return results
}

// ──────────────────────────────────────────────────────────────────
//  Safety: can we act on this member?
// ──────────────────────────────────────────────────────────────────

function canActOn(guild, member, executorMember) {
  if (!member || !executorMember) return { ok: false, reason: "member_not_found" }

  // ما تقدر تأذي صاحب السيرفر
  if (member.id === guild.ownerId) return { ok: false, reason: "owner" }

  // ما تقدر تأذي نفسك
  if (member.id === executorMember.id) return { ok: false, reason: "self" }

  // البوت نفسه
  if (member.id === guild.members.me.id) return { ok: false, reason: "bot_self" }

  // hierarchy: المنفذ
  const executorTop = executorMember.roles.highest.position
  if (executorTop <= member.roles.highest.position && executorMember.id !== guild.ownerId) {
    return { ok: false, reason: "executor_hierarchy" }
  }

  // hierarchy: البوت
  const botTop = guild.members.me.roles.highest.position
  if (botTop <= member.roles.highest.position) {
    return { ok: false, reason: "bot_hierarchy" }
  }

  return { ok: true }
}

// ──────────────────────────────────────────────────────────────────
//  Snapshot helpers (نخزن الحالة قبل التغيير)
// ──────────────────────────────────────────────────────────────────

function snapshotMember(member) {
  return {
    id: member.id,
    username: member.user.username,
    roles: member.roles.cache
      .filter(r => r.id !== member.guild.id) // exclude @everyone
      .map(r => r.id),
    timeout_until: member.communicationDisabledUntil?.getTime() || null
  }
}

// ──────────────────────────────────────────────────────────────────
//  Record action in DB
// ──────────────────────────────────────────────────────────────────

async function recordAction(guildId, executorId, actionType, targetType, targets, metadata = {}) {
  try {
    const successCount = targets.filter(t => t.ok).length
    const failedCount = targets.filter(t => !t.ok).length

    const r = await databaseSystem.query(
      `INSERT INTO bulk_actions
         (guild_id, executed_by, action_type, target_type, targets, metadata, success_count, failed_count)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
       RETURNING id, created_at`,
      [
        guildId,
        executorId,
        actionType,
        targetType,
        JSON.stringify(targets),
        JSON.stringify(metadata),
        successCount,
        failedCount
      ]
    )

    return r.rows[0]
  } catch (err) {
    logger.error("BULK_RECORD_FAILED", { error: err.message })
    return null
  }
}

// ══════════════════════════════════════════════════════════════════
//  BULK BAN
// ══════════════════════════════════════════════════════════════════

async function bulkBan({ guildId, userIds, executorId, reason = "Bulk action" }) {
  if (!_client?.isReady?.()) throw new Error("Bot not ready")

  const guild = _client.guilds.cache.get(guildId)
  if (!guild) throw new Error("Guild not found")

  const executor = await guild.members.fetch(executorId).catch(() => null)
  if (!executor) throw new Error("Executor not in guild")

  if (!guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
    throw new Error("Bot missing BanMembers permission")
  }

  // ─── جلب الأعضاء + snapshot ───
  const targets = []
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null)
    if (!member) {
      targets.push({ user_id: userId, ok: false, error: "not_found" })
      continue
    }

    const check = canActOn(guild, member, executor)
    if (!check.ok) {
      targets.push({ user_id: userId, ok: false, error: check.reason })
      continue
    }

    targets.push({
      user_id: userId,
      ok: null, // سيُحدّد بعد التنفيذ
      snapshot: snapshotMember(member)
    })
  }

  // ─── تنفيذ ───
  const toBan = targets.filter(t => t.ok !== false)
  const results = await executeInChunks(toBan, async (target) => {
    await guild.members.ban(target.user_id, {
      reason: `[Bulk] ${reason}`,
      deleteMessageSeconds: 0
    })
    return true
  })

  // ─── دمج النتائج ───
  for (const r of results) {
    const idx = targets.findIndex(t => t.user_id === r.item.user_id)
    if (idx !== -1) {
      targets[idx].ok = r.ok
      if (!r.ok) targets[idx].error = r.error
    }
  }

  // ─── سجّل ───
  const record = await recordAction(guildId, executorId, "ban", "member", targets, { reason })

  return {
    action_id: record?.id,
    success_count: targets.filter(t => t.ok === true).length,
    failed_count: targets.filter(t => t.ok === false).length,
    total: targets.length,
    targets
  }
}

// ══════════════════════════════════════════════════════════════════
//  BULK KICK
// ══════════════════════════════════════════════════════════════════

async function bulkKick({ guildId, userIds, executorId, reason = "Bulk action" }) {
  if (!_client?.isReady?.()) throw new Error("Bot not ready")

  const guild = _client.guilds.cache.get(guildId)
  if (!guild) throw new Error("Guild not found")

  const executor = await guild.members.fetch(executorId).catch(() => null)
  if (!executor) throw new Error("Executor not in guild")

  if (!guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
    throw new Error("Bot missing KickMembers permission")
  }

  const targets = []
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null)
    if (!member) {
      targets.push({ user_id: userId, ok: false, error: "not_found" })
      continue
    }

    const check = canActOn(guild, member, executor)
    if (!check.ok) {
      targets.push({ user_id: userId, ok: false, error: check.reason })
      continue
    }

    targets.push({
      user_id: userId,
      ok: null,
      snapshot: snapshotMember(member)
    })
  }

  const toKick = targets.filter(t => t.ok !== false)
  const results = await executeInChunks(toKick, async (target) => {
    const member = await guild.members.fetch(target.user_id)
    await member.kick(`[Bulk] ${reason}`)
    return true
  })

  for (const r of results) {
    const idx = targets.findIndex(t => t.user_id === r.item.user_id)
    if (idx !== -1) {
      targets[idx].ok = r.ok
      if (!r.ok) targets[idx].error = r.error
    }
  }

  const record = await recordAction(guildId, executorId, "kick", "member", targets, { reason })

  // ⚠️ Kick ما يقدر يُعكس (العضو لازم يدخل بنفسه) — لكن نسجل للـ audit
  return {
    action_id: record?.id,
    success_count: targets.filter(t => t.ok === true).length,
    failed_count: targets.filter(t => t.ok === false).length,
    total: targets.length,
    targets,
    undoable: false // ⚠️ Kick غير قابل للتراجع
  }
}

// ══════════════════════════════════════════════════════════════════
//  BULK MUTE (timeout)
// ══════════════════════════════════════════════════════════════════

async function bulkMute({ guildId, userIds, executorId, durationMs, reason = "Bulk action" }) {
  if (!_client?.isReady?.()) throw new Error("Bot not ready")

  const guild = _client.guilds.cache.get(guildId)
  if (!guild) throw new Error("Guild not found")

  const executor = await guild.members.fetch(executorId).catch(() => null)
  if (!executor) throw new Error("Executor not in guild")

  if (!guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    throw new Error("Bot missing ModerateMembers permission")
  }

  const durationSafe = Math.max(60_000, Math.min(durationMs, 28 * 24 * 60 * 60 * 1000))

  const targets = []
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null)
    if (!member) {
      targets.push({ user_id: userId, ok: false, error: "not_found" })
      continue
    }

    const check = canActOn(guild, member, executor)
    if (!check.ok) {
      targets.push({ user_id: userId, ok: false, error: check.reason })
      continue
    }

    targets.push({
      user_id: userId,
      ok: null,
      snapshot: snapshotMember(member)
    })
  }

  const toMute = targets.filter(t => t.ok !== false)
  const results = await executeInChunks(toMute, async (target) => {
    const member = await guild.members.fetch(target.user_id)
    await member.timeout(durationSafe, `[Bulk] ${reason}`)
    return true
  })

  for (const r of results) {
    const idx = targets.findIndex(t => t.user_id === r.item.user_id)
    if (idx !== -1) {
      targets[idx].ok = r.ok
      if (!r.ok) targets[idx].error = r.error
    }
  }

  const record = await recordAction(guildId, executorId, "mute", "member", targets, {
    reason,
    duration_ms: durationSafe
  })

  return {
    action_id: record?.id,
    success_count: targets.filter(t => t.ok === true).length,
    failed_count: targets.filter(t => t.ok === false).length,
    total: targets.length,
    targets
  }
}

// ══════════════════════════════════════════════════════════════════
//  BULK ADD ROLE
// ══════════════════════════════════════════════════════════════════

async function bulkAddRole({ guildId, userIds, roleId, executorId, reason = "Bulk action" }) {
  if (!_client?.isReady?.()) throw new Error("Bot not ready")

  const guild = _client.guilds.cache.get(guildId)
  if (!guild) throw new Error("Guild not found")

  const role = guild.roles.cache.get(roleId)
  if (!role) throw new Error("Role not found")
  if (role.managed) throw new Error("Role is managed")

  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error("Bot missing ManageRoles permission")
  }

  if (role.position >= guild.members.me.roles.highest.position) {
    throw new Error("Role is higher than bot's role")
  }

  const targets = []
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null)
    if (!member) {
      targets.push({ user_id: userId, ok: false, error: "not_found" })
      continue
    }

    // لا حاجة لـ canActOn هنا (إعطاء رتبة مو عقوبة)
    const hadRole = member.roles.cache.has(roleId)

    targets.push({
      user_id: userId,
      ok: null,
      had_role: hadRole // للـ undo
    })
  }

  const toAdd = targets.filter(t => t.ok !== false && !t.had_role)
  const results = await executeInChunks(toAdd, async (target) => {
    const member = await guild.members.fetch(target.user_id)
    await member.roles.add(role, `[Bulk] ${reason}`)
    return true
  })

  // targets اللي كانت عندها الرتبة بالفعل = success بدون action
  for (const t of targets) {
    if (t.had_role) {
      t.ok = true
      t.skipped = true
    }
  }

  for (const r of results) {
    const idx = targets.findIndex(t => t.user_id === r.item.user_id && !t.had_role)
    if (idx !== -1) {
      targets[idx].ok = r.ok
      if (!r.ok) targets[idx].error = r.error
    }
  }

  const record = await recordAction(guildId, executorId, "role_add", "member", targets, {
    role_id: roleId,
    reason
  })

  return {
    action_id: record?.id,
    success_count: targets.filter(t => t.ok === true).length,
    failed_count: targets.filter(t => t.ok === false).length,
    skipped_count: targets.filter(t => t.skipped).length,
    total: targets.length,
    targets
  }
}

// ══════════════════════════════════════════════════════════════════
//  BULK REMOVE ROLE
// ══════════════════════════════════════════════════════════════════

async function bulkRemoveRole({ guildId, userIds, roleId, executorId, reason = "Bulk action" }) {
  if (!_client?.isReady?.()) throw new Error("Bot not ready")

  const guild = _client.guilds.cache.get(guildId)
  if (!guild) throw new Error("Guild not found")

  const role = guild.roles.cache.get(roleId)
  if (!role) throw new Error("Role not found")

  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error("Bot missing ManageRoles permission")
  }

  if (role.position >= guild.members.me.roles.highest.position) {
    throw new Error("Role is higher than bot's role")
  }

  const targets = []
  for (const userId of userIds) {
    const member = await guild.members.fetch(userId).catch(() => null)
    if (!member) {
      targets.push({ user_id: userId, ok: false, error: "not_found" })
      continue
    }

    const hadRole = member.roles.cache.has(roleId)
    targets.push({
      user_id: userId,
      ok: null,
      had_role: hadRole
    })
  }

  const toRemove = targets.filter(t => t.ok !== false && t.had_role)
  const results = await executeInChunks(toRemove, async (target) => {
    const member = await guild.members.fetch(target.user_id)
    await member.roles.remove(role, `[Bulk] ${reason}`)
    return true
  })

  for (const t of targets) {
    if (!t.had_role && t.ok !== false) {
      t.ok = true
      t.skipped = true
    }
  }

  for (const r of results) {
    const idx = targets.findIndex(t => t.user_id === r.item.user_id && t.had_role)
    if (idx !== -1) {
      targets[idx].ok = r.ok
      if (!r.ok) targets[idx].error = r.error
    }
  }

  const record = await recordAction(guildId, executorId, "role_remove", "member", targets, {
    role_id: roleId,
    reason
  })

  return {
    action_id: record?.id,
    success_count: targets.filter(t => t.ok === true).length,
    failed_count: targets.filter(t => t.ok === false).length,
    skipped_count: targets.filter(t => t.skipped).length,
    total: targets.length,
    targets
  }
}

// ══════════════════════════════════════════════════════════════════
//  UNDO
// ══════════════════════════════════════════════════════════════════

async function undoAction(actionId, executorId) {
  if (!_client?.isReady?.()) throw new Error("Bot not ready")

  // ─── جلب العملية ───
  const action = await databaseSystem.queryOne(
    "SELECT * FROM bulk_actions WHERE id = $1",
    [actionId]
  )

  if (!action) throw new Error("Action not found")
  if (action.reverted_at) throw new Error("Already reverted")

  // ─── فحص النافذة الزمنية ───
  const ageMs = Date.now() - new Date(action.created_at).getTime()
  if (ageMs > UNDO_WINDOW_MS) {
    throw new Error("Undo window expired (30 seconds)")
  }

  const guild = _client.guilds.cache.get(action.guild_id)
  if (!guild) throw new Error("Guild not found")

  const targets = typeof action.targets === "string" ? JSON.parse(action.targets) : action.targets
  const metadata = typeof action.metadata === "string" ? JSON.parse(action.metadata) : action.metadata

  // فلتر اللي نجحوا فقط (نرجع اللي تم التأثير عليهم بالفعل)
  const affectedTargets = targets.filter(t => t.ok === true && !t.skipped)

  const undoResults = []

  // ─── Undo حسب نوع العملية ───

  if (action.action_type === "ban") {
    for (const target of affectedTargets) {
      try {
        await guild.members.unban(target.user_id, "[Bulk Undo] التراجع عن الحظر")
        undoResults.push({ user_id: target.user_id, ok: true })
      } catch (err) {
        undoResults.push({ user_id: target.user_id, ok: false, error: err.message })
      }
    }
  } else if (action.action_type === "kick") {
    throw new Error("Kick cannot be undone")
  } else if (action.action_type === "mute") {
    for (const target of affectedTargets) {
      try {
        const member = await guild.members.fetch(target.user_id).catch(() => null)
        if (member) {
          await member.timeout(null, "[Bulk Undo] إلغاء الكتم")
          undoResults.push({ user_id: target.user_id, ok: true })
        } else {
          undoResults.push({ user_id: target.user_id, ok: false, error: "left_guild" })
        }
      } catch (err) {
        undoResults.push({ user_id: target.user_id, ok: false, error: err.message })
      }
    }
  } else if (action.action_type === "role_add") {
    // نشيل الرتبة اللي ضفناها
    const roleId = metadata.role_id
    for (const target of affectedTargets) {
      try {
        const member = await guild.members.fetch(target.user_id).catch(() => null)
        if (member) {
          await member.roles.remove(roleId, "[Bulk Undo]")
          undoResults.push({ user_id: target.user_id, ok: true })
        } else {
          undoResults.push({ user_id: target.user_id, ok: false, error: "left_guild" })
        }
      } catch (err) {
        undoResults.push({ user_id: target.user_id, ok: false, error: err.message })
      }
    }
  } else if (action.action_type === "role_remove") {
    // نرجع الرتبة اللي شلناها
    const roleId = metadata.role_id
    for (const target of affectedTargets) {
      try {
        const member = await guild.members.fetch(target.user_id).catch(() => null)
        if (member) {
          await member.roles.add(roleId, "[Bulk Undo]")
          undoResults.push({ user_id: target.user_id, ok: true })
        } else {
          undoResults.push({ user_id: target.user_id, ok: false, error: "left_guild" })
        }
      } catch (err) {
        undoResults.push({ user_id: target.user_id, ok: false, error: err.message })
      }
    }
  } else {
    throw new Error(`Cannot undo action type: ${action.action_type}`)
  }

  // ─── سجّل الـ undo ───
  await databaseSystem.query(
    `UPDATE bulk_actions SET reverted_at = NOW(), reverted_by = $1 WHERE id = $2`,
    [executorId, actionId]
  )

  return {
    success_count: undoResults.filter(r => r.ok).length,
    failed_count: undoResults.filter(r => !r.ok).length,
    total: undoResults.length,
    results: undoResults
  }
}

// ──────────────────────────────────────────────────────────────────
//  Cleanup old records (older than 7 days)
// ──────────────────────────────────────────────────────────────────

async function cleanupOldActions() {
  try {
    await databaseSystem.query(
      "DELETE FROM bulk_actions WHERE created_at < NOW() - INTERVAL '7 days'"
    )
  } catch (err) {
    logger.error("BULK_CLEANUP_FAILED", { error: err.message })
  }
}

function startScheduler() {
  const scheduler = require("./schedulerSystem")
  scheduler.register("bulk-actions-cleanup", 24 * 60 * 60 * 1000, cleanupOldActions, false)
  logger.info("BULK_ACTIONS_SCHEDULER_STARTED")
}

// ──────────────────────────────────────────────────────────────────
//  Exports
// ──────────────────────────────────────────────────────────────────

module.exports = {
  setClient,
  bulkBan,
  bulkKick,
  bulkMute,
  bulkAddRole,
  bulkRemoveRole,
  undoAction,
  startScheduler,
  UNDO_WINDOW_MS
}