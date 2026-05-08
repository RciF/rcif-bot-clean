// ══════════════════════════════════════════════════════════════════
//  SCHEDULED TASKS RUNNER
//  المسار: systems/scheduledTasksRunner.js
//
//  ينفذ المهام المجدولة من جدول scheduled_tasks (التي يُنشئها الداش).
//  يُسجَّل في schedulerSystem ويُشغَّل دورياً.
//
//  Schema (scheduled_tasks):
//   - type: 'embed' | 'message' | 'command'
//   - schedule (JSONB):
//       { type: 'once', runAt: ISO }
//       { type: 'recurring', frequency: 'daily', time: 'HH:MM' }
//       { type: 'recurring', frequency: 'weekly', dayOfWeek: 0-6, time: 'HH:MM' }
//       { type: 'recurring', frequency: 'monthly', dayOfMonth: 1-31, time: 'HH:MM' }
//   - payload (JSONB):
//       message: { content }
//       embed:   { title, description, color?, image? }
//       command: { name, args? }
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const scheduler = require("./schedulerSystem")
const logger = require("./loggerSystem")

let _client = null

const CHECK_INTERVAL = 30 * 1000 // كل 30 ثانية
const BATCH_SIZE = 50            // أقصى مهام لكل دورة

// ══════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════

function parseJson(raw, fallback = {}) {
  if (!raw) return fallback
  if (typeof raw === "object") return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return fallback }
  }
  return fallback
}

function pad2(n) {
  return String(n).padStart(2, "0")
}

// ══════════════════════════════════════════════════════════
//  Compute next_run_at من schedule
// ══════════════════════════════════════════════════════════

function computeNextRun(schedule, fromTime = Date.now()) {
  const sch = schedule || {}
  const from = new Date(fromTime)

  // ── once ──
  if (sch.type === "once") {
    if (!sch.runAt) return null
    const t = new Date(sch.runAt).getTime()
    if (!isFinite(t)) return null
    if (t <= fromTime) return null // لو فات → لا يعاد جدولته
    return new Date(t)
  }

  // ── recurring ──
  if (sch.type === "recurring") {
    const time = typeof sch.time === "string" ? sch.time : "12:00"
    const [hStr, mStr] = time.split(":")
    const hour = parseInt(hStr) || 0
    const minute = parseInt(mStr) || 0

    const freq = sch.frequency || "daily"

    if (freq === "daily") {
      // اليوم في الوقت المحدد، أو غداً لو فات
      const next = new Date(from)
      next.setHours(hour, minute, 0, 0)
      if (next.getTime() <= fromTime) {
        next.setDate(next.getDate() + 1)
      }
      return next
    }

    if (freq === "weekly") {
      const dow = parseInt(sch.dayOfWeek)
      const targetDow = isFinite(dow) && dow >= 0 && dow <= 6 ? dow : 0
      const next = new Date(from)
      next.setHours(hour, minute, 0, 0)
      let diff = (targetDow - next.getDay() + 7) % 7
      if (diff === 0 && next.getTime() <= fromTime) diff = 7
      next.setDate(next.getDate() + diff)
      return next
    }

    if (freq === "monthly") {
      const dom = parseInt(sch.dayOfMonth)
      const targetDom = isFinite(dom) && dom >= 1 && dom <= 31 ? dom : 1

      // اليوم المستهدف من الشهر الحالي
      let next = new Date(from.getFullYear(), from.getMonth(), targetDom, hour, minute, 0, 0)

      // لو الشهر الحالي ما يحتوي اليوم (مثلاً 31 في فبراير) → آخر يوم
      if (next.getMonth() !== from.getMonth()) {
        next = new Date(from.getFullYear(), from.getMonth() + 1, 0, hour, minute, 0, 0)
      }

      if (next.getTime() <= fromTime) {
        // الشهر القادم
        next = new Date(from.getFullYear(), from.getMonth() + 1, targetDom, hour, minute, 0, 0)
        if (next.getMonth() !== (from.getMonth() + 1) % 12) {
          next = new Date(from.getFullYear(), from.getMonth() + 2, 0, hour, minute, 0, 0)
        }
      }
      return next
    }
  }

  return null
}

// ══════════════════════════════════════════════════════════
//  Backfill next_run_at للمهام اللي ما عندها
// ══════════════════════════════════════════════════════════

async function backfillNextRun() {
  try {
    const result = await databaseSystem.query(
      `SELECT id, schedule FROM scheduled_tasks
       WHERE enabled = true AND next_run_at IS NULL`
    )
    for (const row of (result.rows || [])) {
      const sch = parseJson(row.schedule)
      const next = computeNextRun(sch)
      if (next) {
        await databaseSystem.query(
          "UPDATE scheduled_tasks SET next_run_at = $1 WHERE id = $2",
          [next, row.id]
        ).catch(() => {})
      }
    }
  } catch (err) {
    logger.error("SCHEDULER_BACKFILL_FAILED", { error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
//  Execute task
// ══════════════════════════════════════════════════════════

async function executeTask(task) {
  if (!_client) return false

  const guild = _client.guilds.cache.get(task.guild_id)
  if (!guild) {
    logger.error("SCHEDULER_GUILD_NOT_FOUND", { taskId: task.id, guildId: task.guild_id })
    return false
  }

  const channel = guild.channels.cache.get(task.channel_id)
  if (!channel) {
    logger.error("SCHEDULER_CHANNEL_NOT_FOUND", { taskId: task.id, channelId: task.channel_id })
    return false
  }

  if (!channel.isTextBased?.() || !channel.send) {
    logger.error("SCHEDULER_CHANNEL_NOT_SENDABLE", { taskId: task.id })
    return false
  }

  const payload = parseJson(task.payload)
  const type = task.type || "message"

  try {
    if (type === "message") {
      const content = (payload.content || "").toString().slice(0, 2000)
      if (!content.trim()) return false
      await channel.send({ content })
      return true
    }

    if (type === "embed") {
      const embed = new EmbedBuilder()
      if (payload.title) embed.setTitle(String(payload.title).slice(0, 256))
      if (payload.description) embed.setDescription(String(payload.description).slice(0, 4096))
      if (typeof payload.color === "number") embed.setColor(payload.color)
      else embed.setColor(0x5865f2)
      if (payload.image) embed.setImage(String(payload.image))
      if (payload.thumbnail) embed.setThumbnail(String(payload.thumbnail))
      if (payload.footer) embed.setFooter({ text: String(payload.footer).slice(0, 2048) })
      embed.setTimestamp()

      // نفّذ فقط لو فيه عنوان أو وصف
      if (!payload.title && !payload.description) return false

      await channel.send({ embeds: [embed] })
      return true
    }

    if (type === "command") {
      // Placeholder — تنفيذ أوامر مجدولة يحتاج تكامل عميق مع interaction system
      // حالياً: ترسل إشعار في القناة
      logger.warn("SCHEDULER_COMMAND_TYPE_NOT_SUPPORTED", { taskId: task.id })
      return false
    }

    logger.warn("SCHEDULER_UNKNOWN_TYPE", { taskId: task.id, type })
    return false

  } catch (err) {
    logger.error("SCHEDULER_TASK_EXECUTE_FAILED", {
      taskId: task.id,
      error: err.message
    })
    return false
  }
}

// ══════════════════════════════════════════════════════════
//  Main tick — ينفذ المهام الجاهزة
// ══════════════════════════════════════════════════════════

async function tick() {
  if (!_client?.isReady?.()) return

  try {
    // اجلب المهام اللي حان وقتها
    const result = await databaseSystem.query(
      `SELECT * FROM scheduled_tasks
       WHERE enabled = true
       AND next_run_at IS NOT NULL
       AND next_run_at <= NOW()
       ORDER BY next_run_at ASC
       LIMIT $1`,
      [BATCH_SIZE]
    )

    const tasks = result.rows || []
    if (tasks.length === 0) return

    for (const task of tasks) {
      const success = await executeTask(task)

      // احسب next_run_at الجديد
      const sch = parseJson(task.schedule)
      let nextRun = null
      let shouldDisable = false

      if (sch.type === "once") {
        // مهمة لمرة واحدة → عطّلها بعد التنفيذ
        shouldDisable = true
      } else if (sch.type === "recurring") {
        nextRun = computeNextRun(sch)
      }

      // حدّث الـ stats
      try {
        if (shouldDisable) {
          await databaseSystem.query(
            `UPDATE scheduled_tasks
             SET enabled = false,
                 last_run_at = NOW(),
                 next_run_at = NULL,
                 run_count = run_count + 1,
                 success_count = success_count + $1
             WHERE id = $2`,
            [success ? 1 : 0, task.id]
          )
        } else {
          await databaseSystem.query(
            `UPDATE scheduled_tasks
             SET last_run_at = NOW(),
                 next_run_at = $1,
                 run_count = run_count + 1,
                 success_count = success_count + $2
             WHERE id = $3`,
            [nextRun, success ? 1 : 0, task.id]
          )
        }
      } catch (err) {
        logger.error("SCHEDULER_UPDATE_FAILED", {
          taskId: task.id,
          error: err.message
        })
      }
    }

    if (tasks.length > 0) {
      logger.info(`SCHEDULER_RAN ${tasks.length} task(s)`)
    }

  } catch (err) {
    logger.error("SCHEDULER_TICK_FAILED", { error: err.message })
  }
}

// ══════════════════════════════════════════════════════════
//  Start
// ══════════════════════════════════════════════════════════

function start(client) {
  if (!client) {
    logger.error("SCHEDULED_TASKS_RUNNER_START_FAILED no client")
    return
  }
  _client = client

  // backfill عند البدء
  backfillNextRun().catch(() => {})

  // سجّل في scheduler العام (للتنظيف عند الـ shutdown)
  scheduler.register(
    "scheduled-tasks-runner",
    CHECK_INTERVAL,
    tick,
    false
  )

  logger.success("SCHEDULED_TASKS_RUNNER_STARTED")
}

module.exports = {
  start,
  computeNextRun, // للاختبار
  executeTask,    // للاختبار/الاستخدام اليدوي
  tick            // للاختبار/الاستخدام اليدوي
}