// ══════════════════════════════════════════════════════════════════
//  EVENT REMINDER SYSTEM
//  المسار: systems/eventReminderSystem.js
//
//  يقرأ من جدولين:
//   1) guild_events (البوت):
//      title, description, channel_id, start_time (BIGINT ms),
//      max_attendees, status, reminder_sent, started_notified
//   2) events (الداش):
//      title, description, channel, starts_at (TIMESTAMP),
//      max_participants, image, reminder_hours
//
//  يضيف لجدول events أعمدة tracking خفيفة (reminder_sent, started_notified, status)
//  بدون إعادة هيكلة الجدول.
// ══════════════════════════════════════════════════════════════════

const database = require("./databaseSystem")
const logger = require("./loggerSystem")
const scheduler = require("./schedulerSystem")

const CHECK_INTERVAL = 60 * 1000

let _client = null

// ══════════════════════════════════════
//  Ensure dashboard `events` has tracking columns
// ══════════════════════════════════════

async function ensureEventsTable() {
  try {
    // الجدول قد لا يكون موجوداً (نشأه الداش عبر migrate.js) — نتأكد بشكل lazy
    const exists = await database.queryOne(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'events'
      ) AS exists
    `).catch(() => null)

    if (!exists?.exists) return false

    // أضف أعمدة tracking لو ناقصة (لا تؤثر على schema الداش)
    await database.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`).catch(() => {})
    await database.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS started_notified BOOLEAN DEFAULT false`).catch(() => {})
    await database.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming'`).catch(() => {})

    return true
  } catch {
    return false
  }
}

// ══════════════════════════════════════
//  Normalize — يحوّل صف من أي جدول لشكل موحّد
// ══════════════════════════════════════

function normalizeBotEvent(row) {
  if (!row) return null
  return {
    _source: "guild_events",
    id: row.id,
    guild_id: row.guild_id,
    channel_id: row.channel_id,
    title: row.title,
    description: row.description,
    start_time_ms: row.start_time != null ? Number(row.start_time) : null,
    reminder_hours: 1, // البوت دائماً ساعة قبل
    reminder_sent: row.reminder_sent === true,
    started_notified: row.started_notified === true,
    status: row.status || "upcoming"
  }
}

function normalizeDashEvent(row) {
  if (!row) return null
  const startsAt = row.starts_at ? new Date(row.starts_at) : null
  return {
    _source: "events",
    id: row.id,
    guild_id: row.guild_id,
    channel_id: row.channel, // الداش يحفظ في `channel`
    title: row.title,
    description: row.description,
    start_time_ms: startsAt && !isNaN(startsAt.getTime()) ? startsAt.getTime() : null,
    reminder_hours: parseInt(row.reminder_hours) || 1,
    reminder_sent: row.reminder_sent === true,
    started_notified: row.started_notified === true,
    status: row.status || "upcoming"
  }
}

// ══════════════════════════════════════
//  Pending reminders — من الجدولين
// ══════════════════════════════════════

async function getPendingReminders() {
  const all = []
  const now = Date.now()

  // 1) guild_events (البوت) — تذكير ساعة قبل
  try {
    const oneHourLater = now + 60 * 60 * 1000
    const r1 = await database.query(`
      SELECT * FROM guild_events
      WHERE status = 'upcoming'
      AND reminder_sent = false
      AND start_time <= $1
      AND start_time > $2
    `, [oneHourLater, now]).catch(() => null)

    if (r1?.rows) {
      for (const row of r1.rows) {
        const ev = normalizeBotEvent(row)
        if (ev) all.push(ev)
      }
    }
  } catch (err) {
    logger.error("REMINDER_FETCH_BOT_FAILED", { error: err.message })
  }

  // 2) events (الداش) — تذكير reminder_hours قبل
  const dashOk = await ensureEventsTable()
  if (dashOk) {
    try {
      // اجلب كل اللي ما تذكروا بعد، وفلتر في الكود حسب reminder_hours
      const r2 = await database.query(`
        SELECT * FROM events
        WHERE COALESCE(status, 'upcoming') = 'upcoming'
        AND COALESCE(reminder_sent, false) = false
        AND starts_at > NOW()
      `).catch(() => null)

      if (r2?.rows) {
        for (const row of r2.rows) {
          const ev = normalizeDashEvent(row)
          if (!ev || !ev.start_time_ms) continue

          const reminderMs = ev.reminder_hours * 60 * 60 * 1000
          const reminderTime = ev.start_time_ms - reminderMs

          if (now >= reminderTime && now < ev.start_time_ms) {
            all.push(ev)
          }
        }
      }
    } catch (err) {
      logger.error("REMINDER_FETCH_DASH_FAILED", { error: err.message })
    }
  }

  return all
}

// ══════════════════════════════════════
//  Pending start notifications
// ══════════════════════════════════════

async function getPendingStartNotifications() {
  const all = []
  const now = Date.now()

  // 1) guild_events
  try {
    const r1 = await database.query(`
      SELECT * FROM guild_events
      WHERE status = 'upcoming'
      AND started_notified = false
      AND start_time <= $1
    `, [now]).catch(() => null)

    if (r1?.rows) {
      for (const row of r1.rows) {
        const ev = normalizeBotEvent(row)
        if (ev) all.push(ev)
      }
    }
  } catch (err) {
    logger.error("START_NOTIFY_FETCH_BOT_FAILED", { error: err.message })
  }

  // 2) events
  const dashOk = await ensureEventsTable()
  if (dashOk) {
    try {
      const r2 = await database.query(`
        SELECT * FROM events
        WHERE COALESCE(status, 'upcoming') = 'upcoming'
        AND COALESCE(started_notified, false) = false
        AND starts_at <= NOW()
      `).catch(() => null)

      if (r2?.rows) {
        for (const row of r2.rows) {
          const ev = normalizeDashEvent(row)
          if (ev) all.push(ev)
        }
      }
    } catch (err) {
      logger.error("START_NOTIFY_FETCH_DASH_FAILED", { error: err.message })
    }
  }

  return all
}

// ══════════════════════════════════════
//  Update tracking flags (يعرف الجدول المصدر)
// ══════════════════════════════════════

async function markReminderSent(event) {
  try {
    if (event._source === "guild_events") {
      await database.query(
        "UPDATE guild_events SET reminder_sent = true WHERE id = $1",
        [event.id]
      )
    } else if (event._source === "events") {
      await database.query(
        "UPDATE events SET reminder_sent = true WHERE id = $1",
        [event.id]
      )
    }
  } catch (err) {
    logger.error("REMINDER_MARK_SENT_FAILED", { error: err.message, source: event._source })
  }
}

async function markStarted(event) {
  try {
    if (event._source === "guild_events") {
      await database.query(
        "UPDATE guild_events SET started_notified = true, status = 'live' WHERE id = $1",
        [event.id]
      )
    } else if (event._source === "events") {
      await database.query(
        "UPDATE events SET started_notified = true, status = 'live' WHERE id = $1",
        [event.id]
      )
    }
  } catch (err) {
    logger.error("START_MARK_FAILED", { error: err.message, source: event._source })
  }
}

// ══════════════════════════════════════
//  Get attendees (للجدول الأصلي فقط — الداش ما عنده attendees)
// ══════════════════════════════════════

async function getAttendees(event) {
  if (event._source !== "guild_events") return []
  try {
    const result = await database.query(
      "SELECT * FROM event_attendees WHERE event_id = $1 AND status = 'going'",
      [event.id]
    )
    return result.rows || []
  } catch {
    return []
  }
}

// ══════════════════════════════════════
//  Send reminder
// ══════════════════════════════════════

async function sendReminder(client, event) {
  try {
    const guild = client.guilds.cache.get(event.guild_id)
    if (!guild) return

    const channel = guild.channels.cache.get(event.channel_id)
    if (!channel || !channel.isTextBased?.()) return

    const attendees = await getAttendees(event)
    const ts = Math.floor(event.start_time_ms / 1000)
    const mentions = attendees.slice(0, 20).map(a => `<@${a.user_id}>`).join(" ")

    const hoursText = event.reminder_hours === 1 ? "ساعة" : `${event.reminder_hours} ساعات`
    const baseMsg = `⏰ **تذكير!** فعالية **${event.title}** تبدأ خلال ${hoursText}! <t:${ts}:R>`
    const message = mentions ? `${baseMsg}\n${mentions}` : baseMsg

    await channel.send({
      content: message,
      allowedMentions: { users: attendees.slice(0, 20).map(a => a.user_id) }
    })

    await markReminderSent(event)
    logger.info("REMINDER_SENT", { eventId: event.id, source: event._source, title: event.title })
  } catch (err) {
    logger.error("REMINDER_SEND_FAILED", {
      eventId: event.id,
      source: event._source,
      error: err.message
    })
  }
}

// ══════════════════════════════════════
//  Send start notification
// ══════════════════════════════════════

async function sendStartNotification(client, event) {
  try {
    const guild = client.guilds.cache.get(event.guild_id)
    if (!guild) return

    const channel = guild.channels.cache.get(event.channel_id)
    if (!channel || !channel.isTextBased?.()) return

    const attendees = await getAttendees(event)
    const mentions = attendees.slice(0, 20).map(a => `<@${a.user_id}>`).join(" ")

    const baseMsg = `🔴 **بدأت الفعالية الآن!** ${event.title}`
    const message = mentions
      ? `${baseMsg}\n${mentions}${attendees.length > 20 ? ` و**${attendees.length - 20}** آخرين` : ""}`
      : baseMsg

    await channel.send({
      content: message,
      allowedMentions: { users: attendees.slice(0, 20).map(a => a.user_id) }
    })

    await markStarted(event)
    logger.info("START_NOTIFICATION_SENT", { eventId: event.id, source: event._source, title: event.title })
  } catch (err) {
    logger.error("START_NOTIFICATION_FAILED", {
      eventId: event.id,
      source: event._source,
      error: err.message
    })
  }
}

// ══════════════════════════════════════
//  Tick
// ══════════════════════════════════════

async function tick() {
  if (!_client?.isReady?.()) return
  try {
    const reminders = await getPendingReminders()
    for (const ev of reminders) await sendReminder(_client, ev)

    const starts = await getPendingStartNotifications()
    for (const ev of starts) await sendStartNotification(_client, ev)
  } catch (err) {
    logger.error("REMINDER_SCHEDULER_ERROR", { error: err.message })
  }
}

// ══════════════════════════════════════
//  Start
// ══════════════════════════════════════

function startScheduler(client) {
  _client = client

  // ضمان الأعمدة الإضافية في events (lazy)
  ensureEventsTable().catch(() => {})

  scheduler.register("event-reminder", CHECK_INTERVAL, tick, false)

  logger.info("EVENT_REMINDER_SCHEDULER_STARTED")
}

module.exports = {
  startScheduler
}