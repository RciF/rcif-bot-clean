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
    CREATE TABLE IF NOT EXISTS event_settings (
      guild_id        TEXT PRIMARY KEY,
      manager_role_id TEXT,
      updated_at      TIMESTAMP DEFAULT NOW()
    );
  `)

  await databaseSystem.query(`
    CREATE INDEX IF NOT EXISTS idx_guild_events_guild
    ON guild_events (guild_id, status);
  `)
}

// ══════════════════════════════════════
//  DATABASE — SETTINGS
// ══════════════════════════════════════

async function getEventSettings(guildId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM event_settings WHERE guild_id = $1",
    [guildId]
  )
}

async function setManagerRole(guildId, roleId) {
  await databaseSystem.query(`
    INSERT INTO event_settings (guild_id, manager_role_id)
    VALUES ($1, $2)
    ON CONFLICT (guild_id)
    DO UPDATE SET manager_role_id = $2, updated_at = NOW()
  `, [guildId, roleId])
}

// ══════════════════════════════════════
//  DATABASE — EVENTS
// ══════════════════════════════════════

async function createEvent(data) {
  return await databaseSystem.queryOne(`
    INSERT INTO guild_events
    (guild_id, channel_id, creator_id, title, description, category,
     start_time, end_time, max_attendees, image_url, location, ping_role_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `, [
    data.guild_id, data.channel_id, data.creator_id, data.title,
    data.description || null, data.category || "other",
    data.start_time, data.end_time || null, data.max_attendees || null,
    data.image_url || null, data.location || null, data.ping_role_id || null
  ])
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

async function getGuildEvents(guildId, status = "upcoming", limit = 10) {
  const result = await databaseSystem.query(`
    SELECT e.*,
      COUNT(a.id) FILTER (WHERE a.status = 'going') as going_count,
      COUNT(a.id) FILTER (WHERE a.status = 'maybe') as maybe_count
    FROM guild_events e
    LEFT JOIN event_attendees a ON a.event_id = e.id
    WHERE e.guild_id = $1 AND e.status = $2
    GROUP BY e.id
    ORDER BY e.start_time ASC
    LIMIT $3
  `, [guildId, status, limit])
  return result.rows || []
}

// ══════════════════════════════════════
//  DATABASE — ATTENDEES
// ══════════════════════════════════════

async function getAttendees(eventId) {
  const result = await databaseSystem.query(`
    SELECT * FROM event_attendees
    WHERE event_id = $1
    ORDER BY joined_at ASC
  `, [eventId])
  return result.rows || []
}

async function getUserStatus(eventId, userId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM event_attendees WHERE event_id = $1 AND user_id = $2",
    [eventId, userId]
  )
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
//  PERMISSION HELPER
// ══════════════════════════════════════

async function canManageEvents(interaction) {
  const isAdmin = interaction.member?.permissions?.has?.("Administrator") || false
  if (isAdmin) return true

  const settings = await getEventSettings(interaction.guild.id)
  if (!settings?.manager_role_id) return false

  return interaction.member?.roles?.cache?.has(settings.manager_role_id) || false
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
    const period = timeMatch[3] || ""

    if (period.includes("م") || period.toLowerCase().includes("pm")) {
      if (hour !== 12) hour += 12
    } else if (period.includes("ص") || period.toLowerCase().includes("am")) {
      if (hour === 12) hour = 0
    }
  }

  if (hour === null) return null

  let targetDate = new Date(now)

  if (text.includes("غداً") || text.includes("غدا") || text.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1)
  } else if (text.includes("اليوم") || text.includes("today")) {
    // اليوم
  } else {
    const days = {
      "الأحد": 0, "الاثنين": 1, "الثلاثاء": 2, "الأربعاء": 3,
      "الخميس": 4, "الجمعة": 5, "السبت": 6,
      "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3,
      "thursday": 4, "friday": 5, "saturday": 6
    }

    let found = false
    for (const [dayName, dayNum] of Object.entries(days)) {
      if (text.includes(dayName)) {
        const currentDay = now.getDay()
        let diff = dayNum - currentDay
        if (diff <= 0) diff += 7
        targetDate.setDate(targetDate.getDate() + diff)
        found = true
        break
      }
    }

    if (!found) targetDate.setDate(targetDate.getDate() + 1)
  }

  targetDate.setHours(hour, minute, 0, 0)

  if (targetDate.getTime() <= now.getTime()) return null

  return targetDate.getTime()
}

// ══════════════════════════════════════
//  EMBED + BUTTONS BUILDERS
// ══════════════════════════════════════

async function buildEventEmbed(event, guild, goingCount = 0, maybeCount = 0) {
  const emoji = EVENT_EMOJIS[event.category] || "🎉"
  const color = EVENT_COLORS[event.category] || 0x8b5cf6
  const label = EVENT_LABELS[event.category] || "فعالية"

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${event.title}`)
    .setTimestamp()

  if (event.description) embed.setDescription(event.description)

  const fields = []

  fields.push({ name: "📅 موعد البداية", value: formatTime(event.start_time), inline: false })

  if (event.end_time) {
    fields.push({ name: "🏁 موعد الانتهاء", value: formatTimeShort(event.end_time), inline: true })
  }

  if (event.location) {
    fields.push({ name: "📍 المكان", value: event.location, inline: true })
  }

  fields.push({ name: "🏷️ النوع", value: `${emoji} ${label}`, inline: true })

  let attendanceText = `✅ حاضر: **${goingCount}**`
  if (event.max_attendees) attendanceText += `/${event.max_attendees}`
  attendanceText += `  |  🤔 ربما: **${maybeCount}**`

  fields.push({ name: "👥 الحضور", value: attendanceText, inline: false })

  if (event.status === "live") {
    embed.setFooter({ text: "🔴 الفعالية جارية الآن!" })
  } else if (event.status === "ended") {
    embed.setFooter({ text: "✅ انتهت الفعالية" })
  } else {
    embed.setFooter({ text: `🆔 ${event.id} | اضغط للتسجيل` })
  }

  embed.addFields(fields)

  if (event.image_url) embed.setImage(event.image_url)

  return embed
}

function buildEventButtons(eventId, status = "upcoming") {
  const disabled = status === "ended"

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
      .setLabel("قائمة الحضور")
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
  ensureTables,
  getEventSettings,
  setManagerRole,
  canManageEvents,
  createEvent,
  getEvent,
  updateEventMessage,
  updateEventStatus,
  getGuildEvents,
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