const database = require("./databaseSystem")
const logger = require("./loggerSystem")

const CHECK_INTERVAL = 60 * 1000 // كل دقيقة
const ONE_HOUR = 60 * 60 * 1000

// ✅ جلب الفعاليات القادمة اللي تحتاج تذكير
async function getPendingReminders() {
  try {
    const now = Date.now()
    const oneHourLater = now + ONE_HOUR

    // فعاليات بعد ساعة ولم يُرسل لها تذكير
    const result = await database.queryMany(`
      SELECT * FROM guild_events
      WHERE status = 'upcoming'
      AND reminder_sent = false
      AND start_time <= $1
      AND start_time > $2
    `, [oneHourLater, now])

    return result || []
  } catch (error) {
    logger.error("REMINDER_FETCH_FAILED", { error: error.message })
    return []
  }
}

// ✅ جلب الفعاليات اللي حان وقتها ولم يُرسل إشعار البدء
async function getPendingStartNotifications() {
  try {
    const now = Date.now()

    const result = await database.queryMany(`
      SELECT * FROM guild_events
      WHERE status = 'upcoming'
      AND started_notified = false
      AND start_time <= $1
    `, [now])

    return result || []
  } catch (error) {
    logger.error("START_NOTIFICATION_FETCH_FAILED", { error: error.message })
    return []
  }
}

// ✅ إرسال تذكير ساعة قبل
async function sendReminder(client, event) {
  try {
    const guild = client.guilds.cache.get(event.guild_id)
    if (!guild) return

    const channel = guild.channels.cache.get(event.channel_id)
    if (!channel) return

    // جلب المسجلين
    const attendees = await database.queryMany(
      "SELECT * FROM event_attendees WHERE event_id = $1 AND status = 'going'",
      [event.id]
    )

    const ts = Math.floor(event.start_time / 1000)
    const mentions = attendees.slice(0, 20).map(a => `<@${a.user_id}>`).join(" ")

    const message = attendees.length > 0
      ? `⏰ **تذكير!** فعالية **${event.title}** تبدأ خلال ساعة! <t:${ts}:R>\n${mentions}`
      : `⏰ **تذكير!** فعالية **${event.title}** تبدأ خلال ساعة! <t:${ts}:R>`

    await channel.send({
      content: message,
      allowedMentions: { users: attendees.slice(0, 20).map(a => a.user_id) }
    })

    // ✅ تحديث reminder_sent
    await database.execute(
      "UPDATE guild_events SET reminder_sent = true WHERE id = $1",
      [event.id]
    )

    logger.info("REMINDER_SENT", { eventId: event.id, title: event.title })

  } catch (error) {
    logger.error("REMINDER_SEND_FAILED", { eventId: event.id, error: error.message })
  }
}

// ✅ إشعار بدء الفعالية
async function sendStartNotification(client, event) {
  try {
    const guild = client.guilds.cache.get(event.guild_id)
    if (!guild) return

    const channel = guild.channels.cache.get(event.channel_id)
    if (!channel) return

    // جلب المسجلين
    const attendees = await database.queryMany(
      "SELECT * FROM event_attendees WHERE event_id = $1 AND status = 'going'",
      [event.id]
    )

    const mentions = attendees.slice(0, 20).map(a => `<@${a.user_id}>`).join(" ")

    const message = attendees.length > 0
      ? `🔴 **بدأت الفعالية الآن!** ${event.title}\n${mentions}${attendees.length > 20 ? ` و**${attendees.length - 20}** آخرين` : ""}`
      : `🔴 **بدأت الفعالية الآن!** ${event.title}`

    await channel.send({
      content: message,
      allowedMentions: { users: attendees.slice(0, 20).map(a => a.user_id) }
    })

    // ✅ تحديث status و started_notified
    await database.execute(
      "UPDATE guild_events SET started_notified = true, status = 'live' WHERE id = $1",
      [event.id]
    )

    logger.info("START_NOTIFICATION_SENT", { eventId: event.id, title: event.title })

  } catch (error) {
    logger.error("START_NOTIFICATION_FAILED", { eventId: event.id, error: error.message })
  }
}

// ✅ تشغيل الـ scheduler
function startScheduler(client) {
  setInterval(async () => {
    try {
      // تذكيرات ساعة قبل
      const reminders = await getPendingReminders()
      for (const event of reminders) {
        await sendReminder(client, event)
      }

      // إشعارات البدء
      const startNotifications = await getPendingStartNotifications()
      for (const event of startNotifications) {
        await sendStartNotification(client, event)
      }

    } catch (error) {
      logger.error("REMINDER_SCHEDULER_ERROR", { error: error.message })
    }
  }, CHECK_INTERVAL)

  logger.info("EVENT_REMINDER_SCHEDULER_STARTED")
}

module.exports = {
  startScheduler
}
