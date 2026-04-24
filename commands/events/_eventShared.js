const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")

// ══════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════

const EVENT_COLORS = {
  gaming:  0x5865f2,
  voice:   0x22c55e,
  movie:   0xef4444,
  contest: 0xf59e0b,
  meeting: 0x06b6d4,
  other:   0x8b5cf6
}

const EVENT_EMOJIS = {
  gaming:  "🎮",
  voice:   "🔊",
  movie:   "🎬",
  contest: "🏆",
  meeting: "📋",
  other:   "🎉"
}

const EVENT_LABELS = {
  gaming:  "نشاط جيمينج",
  voice:   "جلسة صوتية",
  movie:   "سهرة مشاهدة",
  contest: "مسابقة",
  meeting: "اجتماع",
  other:   "فعالية عامة"
}

const EVENT_STATUS = {
  upcoming:  "⏳ قادمة",
  live:      "🔴 جارية الآن",
  ended:     "✅ انتهت",
  cancelled: "❌ ملغية"
}

// ══════════════════════════════════════
//  DATABASE — TABLES
// ══════════════════════════════════════

async function ensureTables() {
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS guild_events (
      id            SERIAL PRIMARY KEY,
      guild_id      TEXT NOT NULL,
      channel_id    TEXT NOT NULL,
      message_id    TEXT,
      creator_id    TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT,
      category      TEXT DEFAULT 'other',
      start_time    BIGINT NOT NULL,
      end_time      BIGINT,
      max_attendees INTEGER,
      status        TEXT DEFAULT 'upcoming',
      image_url     TEXT,
      location      TEXT,
      ping_role_id  TEXT,
      created_at    TIMESTAMP DEFAULT NOW()
    );
  `)

  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS event_attendees (
      id        SERIAL PRIMARY KEY,
      event_id  INTEGER NOT NULL,
      user_id   TEXT NOT NULL,
      status    TEXT DEFAULT 'going',
      joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    );
  `)

  await databaseSystem.query(`
    CREATE INDEX IF NOT EXISTS idx_guild_events_guild
    ON guild_events (guild_id, status);
  `)

  await databaseSystem.query(`
    CREATE INDEX IF NOT EXISTS idx_event_attendees_event
    ON event_attendees (event_id, status);
  `)
}

// ══════════════════════════════════════
//  PERMISSIONS
//  يعتمد فقط على صلاحية Manage Server من Discord
//  (الأدمن يملك كل الصلاحيات تلقائياً)
// ══════════════════════════════════════

function canManageEvents(interaction) {
  return interaction.member?.permissions?.has("ManageGuild") || false
}

// ══════════════════════════════════════
//  LOG HELPER — موحّد مع نظام اللوق الرئيسي
//  يستخدم utils/logSender
// ══════════════════════════════════════

const { sendLog } = require("../../utils/logSender")

async function logEvent(guild, action, event, user) {
  try {
    const eventTypeMap = {
      created:   "event_create",
      cancelled: "event_cancel",
      started:   "event_start",
      ended:     "event_end"
    }

    const eventType = eventTypeMap[action]
    if (!eventType) return

    const color = {
      created:   0x22c55e,
      cancelled: 0xef4444,
      started:   0xf59e0b,
      ended:     0x5865f2
    }[action] || 0x8b5cf6

    const label = {
      created:   "✅ تم إنشاء فعالية",
      cancelled: "❌ تم إلغاء فعالية",
      started:   "🔴 بدأت فعالية",
      ended:     "🏁 انتهت فعالية"
    }[action] || action

    const emoji = EVENT_EMOJIS[event.category] || "🎉"
    const categoryLabel = EVENT_LABELS[event.category] || "فعالية"

    const fields = [
      { name: "📌 الفعالية", value: `${emoji} **${event.title}** (#${event.id})`, inline: false },
      { name: "🏷️ النوع",    value: categoryLabel,           inline: true },
      { name: "👤 بواسطة",   value: `<@${user.id}>`,         inline: true }
    ]

    if (event.start_time) {
      const ts = Math.floor(event.start_time / 1000)
      fields.push({ name: "📅 الموعد", value: `<t:${ts}:f>`, inline: true })
    }

    if (event.location) {
      fields.push({ name: "📍 المكان", value: event.location, inline: true })
    }

    await sendLog(guild.client, guild.id, eventType, {
      title: label,
      color,
      fields,
      footer: `معرف الفعالية: ${event.id}`
    })
  } catch {}
}

// ══════════════════════════════════════
//  DATABASE — EVENTS
// ══════════════════════════════════════

async function createEvent(data) {
  const result = await databaseSystem.query(`
    INSERT INTO guild_events
      (guild_id, channel_id, creator_id, title, description, category,
       start_time, end_time, max_attendees, image_url, location, ping_role_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    data.guild_id,
    data.channel_id,
    data.creator_id,
    data.title,
    data.description || null,
    data.category || "other",
    data.start_time,
    data.end_time || null,
    data.max_attendees || null,
    data.image_url || null,
    data.location || null,
    data.ping_role_id || null
  ])

  return result.rows[0]
}

async function getEvent(eventId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM guild_events WHERE id = $1",
    [eventId]
  )
}

async function updateEventMessage(eventId, messageId) {
  await databaseSystem.query(
    "UPDATE guild_events SET message_id = $1 WHERE id = $2",
    [messageId, eventId]
  )
}

async function updateEventStatus(eventId, status) {
  await databaseSystem.query(
    "UPDATE guild_events SET status = $1 WHERE id = $2",
    [status, eventId]
  )
}

async function getGuildEvents(guildId, status = null, limit = 25) {
  if (status) {
    const result = await databaseSystem.query(`
      SELECT e.*,
             COALESCE((SELECT COUNT(*) FROM event_attendees a
                       WHERE a.event_id = e.id AND a.status = 'going'), 0) AS going_count
      FROM guild_events e
      WHERE e.guild_id = $1 AND e.status = $2
      ORDER BY e.start_time ASC
      LIMIT $3
    `, [guildId, status, limit])
    return result.rows
  }

  const result = await databaseSystem.query(`
    SELECT e.*,
           COALESCE((SELECT COUNT(*) FROM event_attendees a
                     WHERE a.event_id = e.id AND a.status = 'going'), 0) AS going_count
    FROM guild_events e
    WHERE e.guild_id = $1
    ORDER BY e.start_time ASC
    LIMIT $2
  `, [guildId, limit])
  return result.rows
}

async function getEventStats(eventId) {
  return await databaseSystem.queryOne(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'going') AS going_count,
      COUNT(*) FILTER (WHERE status = 'maybe') AS maybe_count,
      COUNT(*) FILTER (WHERE status = 'notgoing') AS notgoing_count
    FROM event_attendees
    WHERE event_id = $1
  `, [eventId])
}

async function getAttendees(eventId) {
  const result = await databaseSystem.query(
    "SELECT * FROM event_attendees WHERE event_id = $1 ORDER BY joined_at ASC",
    [eventId]
  )
  return result.rows
}

async function getUserStatus(eventId, userId) {
  const row = await databaseSystem.queryOne(
    "SELECT status FROM event_attendees WHERE event_id = $1 AND user_id = $2",
    [eventId, userId]
  )
  return row?.status || null
}

async function setAttendeeStatus(eventId, userId, status) {
  await databaseSystem.query(`
    INSERT INTO event_attendees (event_id, user_id, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET status = $3, joined_at = NOW()
  `, [eventId, userId, status])
}

async function removeAttendee(eventId, userId) {
  await databaseSystem.query(
    "DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2",
    [eventId, userId]
  )
}

// ══════════════════════════════════════
//  TIME HELPERS
// ══════════════════════════════════════

function formatTime(timestamp) {
  const ts = Math.floor(timestamp / 1000)
  return `<t:${ts}:F> (<t:${ts}:R>)`
}

function formatTimeShort(timestamp) {
  const ts = Math.floor(timestamp / 1000)
  return `<t:${ts}:f>`
}

function parseDateTime(input) {
  if (!input) return null

  const now = new Date()
  const direct = new Date(input)
  if (!isNaN(direct.getTime()) && direct.getTime() > now.getTime()) {
    return direct.getTime()
  }

  const text = input.trim().toLowerCase()
  let hour = null, minute = 0

  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*([اA-Za-z]*)/u)
  if (timeMatch) {
    hour   = parseInt(timeMatch[1])
    minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0

    const ampm = timeMatch[3]?.toLowerCase() || ""
    if (ampm.includes("م") || ampm.includes("pm")) {
      if (hour < 12) hour += 12
    } else if (ampm.includes("ص") || ampm.includes("am")) {
      if (hour === 12) hour = 0
    }
  }

  const target = new Date(now)

  if (text.includes("غد") || text.includes("tomorrow")) {
    target.setDate(target.getDate() + 1)
  } else if (text.includes("اليوم") || text.includes("today")) {
    // same day
  } else {
    const daysAr = {
      "الأحد": 0, "الاحد": 0, "sunday": 0,
      "الاثنين": 1, "الإثنين": 1, "monday": 1,
      "الثلاثاء": 2, "tuesday": 2,
      "الأربعاء": 3, "الاربعاء": 3, "wednesday": 3,
      "الخميس": 4, "thursday": 4,
      "الجمعة": 5, "friday": 5,
      "السبت": 6, "saturday": 6
    }

    for (const [key, value] of Object.entries(daysAr)) {
      if (text.includes(key)) {
        const currentDay = target.getDay()
        let diff = value - currentDay
        if (diff <= 0) diff += 7
        target.setDate(target.getDate() + diff)
        break
      }
    }
  }

  if (hour !== null) {
    target.setHours(hour, minute, 0, 0)
  }

  if (target.getTime() <= now.getTime()) return null

  return target.getTime()
}

// ══════════════════════════════════════
//  EMBED & BUTTONS BUILDERS
// ══════════════════════════════════════

async function buildEventEmbed(event, guild, goingCount = 0, maybeCount = 0) {
  const color = EVENT_COLORS[event.category] || 0x5865f2
  const emoji = EVENT_EMOJIS[event.category] || "🎉"
  const label = EVENT_LABELS[event.category] || "فعالية"

  const creator = await guild.members.fetch(event.creator_id).catch(() => null)
  const creatorName = creator?.displayName || "غير معروف"

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${event.title}`)
    .setTimestamp()

  if (event.description) {
    embed.setDescription(event.description)
  }

  const fields = [
    { name: "🏷️ النوع",        value: label,                            inline: true },
    { name: "📊 الحالة",       value: EVENT_STATUS[event.status] || event.status, inline: true },
    { name: "👤 المنظّم",       value: `<@${event.creator_id}>`,          inline: true },
    { name: "📅 الموعد",       value: formatTime(event.start_time),     inline: false }
  ]

  if (event.end_time) {
    fields.push({ name: "🏁 الانتهاء", value: formatTime(event.end_time), inline: false })
  }

  if (event.location) {
    fields.push({ name: "📍 المكان", value: event.location, inline: true })
  }

  const maxText = event.max_attendees ? `/${event.max_attendees}` : ""
  fields.push({ name: "👥 حاضر",  value: `${goingCount}${maxText}`, inline: true })
  fields.push({ name: "🤔 ربما",   value: `${maybeCount}`,           inline: true })

  if (event.status === "upcoming") {
    embed.setFooter({ text: `🆔 ${event.id} — اضغط للتسجيل` })
  } else if (event.status === "ended") {
    embed.setFooter({ text: "✅ انتهت الفعالية — شكراً للمشاركين" })
  } else if (event.status === "cancelled") {
    embed.setFooter({ text: "❌ تم إلغاء الفعالية" })
  } else {
    embed.setFooter({ text: `🆔 ${event.id} | اضغط للتسجيل في الفعالية` })
  }

  embed.addFields(fields)

  if (event.image_url) embed.setImage(event.image_url)

  return embed
}

function buildEventButtons(eventId, status = "upcoming") {
  const disabled = status === "ended" || status === "cancelled"

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_going_${eventId}`)
      .setLabel("حاضر ✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),

    new ButtonBuilder()
      .setCustomId(`event_maybe_${eventId}`)
      .setLabel("ربما 🤔")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),

    new ButtonBuilder()
      .setCustomId(`event_notgoing_${eventId}`)
      .setLabel("غياب ❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),

    new ButtonBuilder()
      .setCustomId(`event_attendees_${eventId}`)
      .setLabel("قائمة الحضور 👥")
      .setStyle(ButtonStyle.Primary)
  )
}

// ══════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════

module.exports = {
  EVENT_COLORS,
  EVENT_EMOJIS,
  EVENT_LABELS,
  EVENT_STATUS,
  ensureTables,
  canManageEvents,
  logEvent,
  createEvent,
  getEvent,
  updateEventMessage,
  updateEventStatus,
  getGuildEvents,
  getEventStats,
  getAttendees,
  getUserStatus,
  setAttendeeStatus,
  removeAttendee,
  formatTime,
  formatTimeShort,
  parseDateTime,
  buildEventEmbed,
  buildEventButtons
}