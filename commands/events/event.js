const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const logger = require("../../systems/loggerSystem")

// ══════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════

const EVENT_COLORS = {
  gaming:    0x5865f2,
  voice:     0x22c55e,
  movie:     0xef4444,
  contest:   0xf59e0b,
  meeting:   0x06b6d4,
  other:     0x8b5cf6
}

const EVENT_EMOJIS = {
  gaming:    "🎮",
  voice:     "🔊",
  movie:     "🎬",
  contest:   "🏆",
  meeting:   "📋",
  other:     "🎉"
}

const EVENT_LABELS = {
  gaming:    "نشاط جيمينج",
  voice:     "جلسة صوتية",
  movie:     "سهرة مشاهدة",
  contest:   "مسابقة",
  meeting:   "اجتماع",
  other:     "فعالية عامة"
}

// ══════════════════════════════════════
//  DATABASE
// ══════════════════════════════════════

async function ensureTables() {
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS guild_events (
      id           SERIAL PRIMARY KEY,
      guild_id     TEXT NOT NULL,
      channel_id   TEXT NOT NULL,
      message_id   TEXT,
      creator_id   TEXT NOT NULL,
      title        TEXT NOT NULL,
      description  TEXT,
      category     TEXT DEFAULT 'other',
      start_time   BIGINT NOT NULL,
      end_time     BIGINT,
      max_attendees INTEGER,
      status       TEXT DEFAULT 'upcoming',
      image_url    TEXT,
      location     TEXT,
      ping_role_id TEXT,
      created_at   TIMESTAMP DEFAULT NOW()
    );
  `)

  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS event_attendees (
      id         SERIAL PRIMARY KEY,
      event_id   INTEGER NOT NULL,
      user_id    TEXT NOT NULL,
      status     TEXT DEFAULT 'going',
      joined_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    );
  `)

  await databaseSystem.query(`
    CREATE INDEX IF NOT EXISTS idx_guild_events_guild
    ON guild_events (guild_id, status);
  `)
}

async function createEvent(data) {
  const result = await databaseSystem.queryOne(`
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
  return result
}

async function getEvent(eventId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM guild_events WHERE id = $1",
    [eventId]
  )
}

async function getEventByMessage(messageId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM guild_events WHERE message_id = $1",
    [messageId]
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
//  EMBED BUILDERS
// ══════════════════════════════════════

function formatTime(timestamp) {
  const ts = Math.floor(timestamp / 1000)
  return `<t:${ts}:F> (<t:${ts}:R>)`
}

function formatTimeShort(timestamp) {
  const ts = Math.floor(timestamp / 1000)
  return `<t:${ts}:f>`
}

async function buildEventEmbed(event, guild, goingCount = 0, maybeCount = 0) {
  const emoji = EVENT_EMOJIS[event.category] || "🎉"
  const color = EVENT_COLORS[event.category] || 0x8b5cf6
  const label = EVENT_LABELS[event.category] || "فعالية"

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${event.title}`)
    .setTimestamp()

  if (event.description) {
    embed.setDescription(event.description)
  }

  const fields = []

  fields.push({
    name: "📅 موعد البداية",
    value: formatTime(event.start_time),
    inline: false
  })

  if (event.end_time) {
    fields.push({
      name: "🏁 موعد الانتهاء",
      value: formatTimeShort(event.end_time),
      inline: true
    })
  }

  if (event.location) {
    fields.push({
      name: "📍 المكان",
      value: event.location,
      inline: true
    })
  }

  fields.push({
    name: "🏷️ النوع",
    value: `${emoji} ${label}`,
    inline: true
  })

  // حضور
  let attendanceText = `✅ حاضر: **${goingCount}**`
  if (event.max_attendees) {
    attendanceText += `/${event.max_attendees}`
  }
  attendanceText += `  |  🤔 ربما: **${maybeCount}**`

  fields.push({
    name: "👥 الحضور",
    value: attendanceText,
    inline: false
  })

  if (event.status === "live") {
    embed.setFooter({ text: "🔴 الفعالية جارية الآن!" })
  } else if (event.status === "ended") {
    embed.setFooter({ text: "✅ انتهت الفعالية" })
  } else {
    embed.setFooter({ text: `🆔 ${event.id} | اضغط للتسجيل` })
  }

  embed.addFields(fields)

  if (event.image_url) {
    embed.setImage(event.image_url)
  }

  return embed
}

function buildEventButtons(eventId, status = "upcoming") {
  const disabled = status === "ended"

  const row = new ActionRowBuilder().addComponents(
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

  return row
}

// ══════════════════════════════════════
//  PARSE DATE HELPER
// ══════════════════════════════════════

/**
 * يقبل صيغ مختلفة:
 * - "غداً 8م" / "غداً 8:30م"
 * - "الجمعة 9م"
 * - "2025-12-25 20:00"
 * - أو timestamp رقمي
 */
function parseDateTime(input) {
  if (!input) return null

  const now = new Date()

  // محاولة parse مباشر
  const direct = new Date(input)
  if (!isNaN(direct.getTime()) && direct.getTime() > now.getTime()) {
    return direct.getTime()
  }

  const text = input.trim().toLowerCase()

  // استخراج الوقت: "8م" "8:30م" "20:00" "8pm" "8 am"
  let hour = null, minute = 0

  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*([اA-Za-z]*)/u)
  if (timeMatch) {
    hour = parseInt(timeMatch[1])
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
    // يوم الأسبوع
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

    if (!found) {
      // افتراض: الأسبوع القادم
      targetDate.setDate(targetDate.getDate() + 1)
    }
  }

  targetDate.setHours(hour, minute, 0, 0)

  if (targetDate.getTime() <= now.getTime()) {
    return null
  }

  return targetDate.getTime()
}

// ══════════════════════════════════════
//  COMMAND
// ══════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فعالية")
    .setDescription("نظام الفعاليات والأنشطة")
    .setDMPermission(false)

    // ── إنشاء ──
    .addSubcommand(sub =>
      sub.setName("إنشاء")
        .setDescription("إنشاء فعالية جديدة في السيرفر")
        .addStringOption(o =>
          o.setName("العنوان").setDescription("عنوان الفعالية").setRequired(true).setMaxLength(100)
        )
        .addStringOption(o =>
          o.setName("الموعد")
            .setDescription('موعد الفعالية — مثال: "غداً 8م" أو "الجمعة 9:30م" أو "2025-12-25 20:00"')
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("النوع")
            .setDescription("نوع الفعالية")
            .setRequired(false)
            .addChoices(
              { name: "🎮 جيمينج", value: "gaming" },
              { name: "🔊 جلسة صوتية", value: "voice" },
              { name: "🎬 سهرة مشاهدة", value: "movie" },
              { name: "🏆 مسابقة", value: "contest" },
              { name: "📋 اجتماع", value: "meeting" },
              { name: "🎉 أخرى", value: "other" }
            )
        )
        .addStringOption(o =>
          o.setName("الوصف").setDescription("وصف الفعالية").setRequired(false).setMaxLength(500)
        )
        .addStringOption(o =>
          o.setName("المكان").setDescription("مكان الفعالية (قناة صوتية أو رابط)").setRequired(false)
        )
        .addIntegerOption(o =>
          o.setName("الحد_الأقصى")
            .setDescription("أقصى عدد مسجلين (اتركه فاضي للا محدود)")
            .setRequired(false)
            .setMinValue(2)
            .setMaxValue(500)
        )
        .addStringOption(o =>
          o.setName("موعد_الانتهاء")
            .setDescription("موعد انتهاء الفعالية (اختياري)")
            .setRequired(false)
        )
        .addRoleOption(o =>
          o.setName("بينج").setDescription("رتبة يتم تنبيهها عند نشر الفعالية").setRequired(false)
        )
        .addChannelOption(o =>
          o.setName("القناة")
            .setDescription("القناة اللي تنشر فيها الفعالية (الافتراضي: القناة الحالية)")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(o =>
          o.setName("صورة").setDescription("رابط صورة بانر للفعالية").setRequired(false)
        )
    )

    // ── عرض ──
    .addSubcommand(sub =>
      sub.setName("عرض")
        .setDescription("عرض فعالية محددة")
        .addIntegerOption(o =>
          o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
        )
    )

    // ── القائمة ──
    .addSubcommand(sub =>
      sub.setName("قائمة")
        .setDescription("عرض الفعاليات القادمة في السيرفر")
    )

    // ── إلغاء ──
    .addSubcommand(sub =>
      sub.setName("إلغاء")
        .setDescription("إلغاء فعالية (للمنشئ أو الأدمن)")
        .addIntegerOption(o =>
          o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
        )
        .addStringOption(o =>
          o.setName("السبب").setDescription("سبب الإلغاء").setRequired(false)
        )
    )

    // ── تفعيل ──
    .addSubcommand(sub =>
      sub.setName("بدء")
        .setDescription("تفعيل الفعالية (جارية الآن)")
        .addIntegerOption(o =>
          o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
        )
    )

    // ── إنهاء ──
    .addSubcommand(sub =>
      sub.setName("إنهاء")
        .setDescription("إنهاء فعالية جارية")
        .addIntegerOption(o =>
          o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
        )
    )

    // ── الحضور ──
    .addSubcommand(sub =>
      sub.setName("حضور")
        .setDescription("عرض قائمة المسجلين في فعالية")
        .addIntegerOption(o =>
          o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
        )
    )

    // ── تذكير ──
    .addSubcommand(sub =>
      sub.setName("تذكير")
        .setDescription("إرسال تذكير لجميع المسجلين في فعالية")
        .addIntegerOption(o =>
          o.setName("الرقم").setDescription("رقم الفعالية").setRequired(true).setMinValue(1)
        )
        .addStringOption(o =>
          o.setName("الرسالة").setDescription("رسالة التذكير المخصصة").setRequired(false)
        )
    ),

  // ══════════════════════════════════════
  //  EXECUTE
  // ══════════════════════════════════════

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      await ensureTables()

      const sub = interaction.options.getSubcommand()

      if (sub === "إنشاء") return await handleCreate(interaction)
      if (sub === "عرض")   return await handleView(interaction)
      if (sub === "قائمة") return await handleList(interaction)
      if (sub === "إلغاء") return await handleCancel(interaction)
      if (sub === "بدء")   return await handleStart(interaction)
      if (sub === "إنهاء") return await handleEnd(interaction)
      if (sub === "حضور")  return await handleAttendees(interaction)
      if (sub === "تذكير") return await handleRemind(interaction)

    } catch (err) {
      logger.error("EVENT_COMMAND_ERROR", { error: err.message })

      const msg = "❌ حدث خطأ في نظام الفعاليات."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  HANDLERS
// ══════════════════════════════════════

async function handleCreate(interaction) {
  await interaction.deferReply()

  const title       = interaction.options.getString("العنوان")
  const timeInput   = interaction.options.getString("الموعد")
  const category    = interaction.options.getString("النوع") || "other"
  const description = interaction.options.getString("الوصف")
  const location    = interaction.options.getString("المكان")
  const maxPeople   = interaction.options.getInteger("الحد_الأقصى")
  const endInput    = interaction.options.getString("موعد_الانتهاء")
  const pingRole    = interaction.options.getRole("بينج")
  const channel     = interaction.options.getChannel("القناة") || interaction.channel
  const imageUrl    = interaction.options.getString("صورة")

  // parse الوقت
  const startTime = parseDateTime(timeInput)
  if (!startTime) {
    return interaction.editReply({
      content: `❌ موعد غير صحيح: \`${timeInput}\`\n**أمثلة صحيحة:**\n• \`غداً 8م\`\n• \`الجمعة 9:30م\`\n• \`2025-12-25 20:00\``,
    })
  }

  let endTime = null
  if (endInput) {
    endTime = parseDateTime(endInput)
    if (!endTime || endTime <= startTime) {
      return interaction.editReply({ content: "❌ موعد الانتهاء يجب أن يكون بعد موعد البداية." })
    }
  }

  // تحقق صلاحيات البوت في القناة المستهدفة
  const botPerms = channel.permissionsFor(interaction.guild.members.me)
  if (!botPerms?.has(["SendMessages", "EmbedLinks"])) {
    return interaction.editReply({ content: `❌ البوت ما يقدر يرسل في ${channel}.` })
  }

  // إنشاء الفعالية في قاعدة البيانات
  const event = await createEvent({
    guild_id: interaction.guild.id,
    channel_id: channel.id,
    creator_id: interaction.user.id,
    title, description, category,
    start_time: startTime,
    end_time: endTime,
    max_attendees: maxPeople,
    image_url: imageUrl,
    location,
    ping_role_id: pingRole?.id || null
  })

  if (!event) {
    return interaction.editReply({ content: "❌ فشل في إنشاء الفعالية." })
  }

  // بناء الـ Embed
  const embed = await buildEventEmbed(event, interaction.guild, 0, 0)
  const buttons = buildEventButtons(event.id)

  // إرسال الفعالية في القناة
  const content = pingRole ? `<@&${pingRole.id}> 🎉 فعالية جديدة!` : null

  const eventMsg = await channel.send({
    content,
    embeds: [embed],
    components: [buttons],
    allowedMentions: { roles: pingRole ? [pingRole.id] : [] }
  })

  // حفظ message ID
  await updateEventMessage(event.id, eventMsg.id)

  // رسالة تأكيد للمنشئ
  const confirmEmbed = new EmbedBuilder()
    .setColor(EVENT_COLORS[category] || 0x8b5cf6)
    .setTitle(`${EVENT_EMOJIS[category]} تم إنشاء الفعالية! 🎉`)
    .addFields(
      { name: "🆔 رقم الفعالية", value: `**#${event.id}**`, inline: true },
      { name: "📢 القناة", value: `${channel}`, inline: true },
      { name: "📅 الموعد", value: formatTimeShort(startTime), inline: true },
      { name: "📌 الرابط", value: `[انقر هنا](${eventMsg.url})`, inline: true }
    )
    .setFooter({ text: "يمكن للأعضاء التسجيل عبر الأزرار في رسالة الفعالية" })
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
}

async function handleView(interaction) {
  const eventId = interaction.options.getInteger("الرقم")

  await interaction.deferReply()

  const event = await getEvent(eventId)
  if (!event || event.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ فعالية غير موجودة في هذا السيرفر." })
  }

  const attendees = await getAttendees(eventId)
  const goingCount = attendees.filter(a => a.status === "going").length
  const maybeCount = attendees.filter(a => a.status === "maybe").length

  const embed = await buildEventEmbed(event, interaction.guild, goingCount, maybeCount)
  const buttons = buildEventButtons(event.id, event.status)

  return interaction.editReply({ embeds: [embed], components: [buttons] })
}

async function handleList(interaction) {
  await interaction.deferReply()

  const events = await getGuildEvents(interaction.guild.id, "upcoming", 10)
  const liveEvents = await getGuildEvents(interaction.guild.id, "live", 5)
  const allEvents = [...liveEvents, ...events]

  if (allEvents.length === 0) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x64748b)
          .setTitle("📅 لا توجد فعاليات قادمة")
          .setDescription("ما فيه فعاليات مجدولة حالياً.\nاستخدم `/فعالية إنشاء` لإنشاء فعالية جديدة!")
          .setTimestamp()
      ]
    })
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📅 الفعاليات القادمة")
    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
    .setTimestamp()

  let description = ""

  for (const ev of allEvents) {
    const emoji = EVENT_EMOJIS[ev.category] || "🎉"
    const statusBadge = ev.status === "live" ? " 🔴 **جارية الآن**" : ""
    const ts = Math.floor(ev.start_time / 1000)
    const attendees = parseInt(ev.going_count || 0)
    const maxText = ev.max_attendees ? `/${ev.max_attendees}` : ""

    description += `${emoji} **${ev.title}**${statusBadge}\n`
    description += `   🆔 #${ev.id} | 📅 <t:${ts}:f> | 👥 ${attendees}${maxText} حاضر\n\n`
  }

  embed.setDescription(description)
  embed.setFooter({ text: `استخدم /فعالية عرض [رقم] للتفاصيل` })

  return interaction.editReply({ embeds: [embed] })
}

async function handleCancel(interaction) {
  const eventId = interaction.options.getInteger("الرقم")
  const reason  = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

  await interaction.deferReply({ ephemeral: true })

  const event = await getEvent(eventId)
  if (!event || event.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ فعالية غير موجودة." })
  }

  // فقط المنشئ أو الأدمن
  const isAdmin = commandGuardSystem.requireAdmin(interaction)
  if (event.creator_id !== interaction.user.id && !isAdmin) {
    return interaction.editReply({ content: "❌ فقط منشئ الفعالية أو الأدمن يقدر يلغيها." })
  }

  if (event.status === "ended" || event.status === "cancelled") {
    return interaction.editReply({ content: "❌ الفعالية منتهية أو ملغية بالفعل." })
  }

  await updateEventStatus(eventId, "cancelled")

  // تحديث رسالة الفعالية
  if (event.message_id && event.channel_id) {
    try {
      const channel = interaction.guild.channels.cache.get(event.channel_id)
      if (channel) {
        const msg = await channel.messages.fetch(event.message_id).catch(() => null)
        if (msg) {
          const cancelEmbed = new EmbedBuilder()
            .setColor(0x64748b)
            .setTitle(`❌ ${event.title} — ملغية`)
            .setDescription(`**السبب:** ${reason}`)
            .addFields({ name: "✏️ ألغاها", value: `${interaction.user}`, inline: true })
            .setTimestamp()

          await msg.edit({ embeds: [cancelEmbed], components: [] })
        }
      }
    } catch {}
  }

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x64748b)
        .setTitle("✅ تم إلغاء الفعالية")
        .addFields(
          { name: "🎉 الفعالية", value: event.title, inline: true },
          { name: "📝 السبب", value: reason, inline: true }
        )
        .setTimestamp()
    ]
  })
}

async function handleStart(interaction) {
  const eventId = interaction.options.getInteger("الرقم")

  await interaction.deferReply({ ephemeral: true })

  const event = await getEvent(eventId)
  if (!event || event.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ فعالية غير موجودة." })
  }

  const isAdmin = commandGuardSystem.requireAdmin(interaction)
  if (event.creator_id !== interaction.user.id && !isAdmin) {
    return interaction.editReply({ content: "❌ فقط منشئ الفعالية أو الأدمن." })
  }

  if (event.status !== "upcoming") {
    return interaction.editReply({ content: "❌ الفعالية ليست في حالة قادمة." })
  }

  await updateEventStatus(eventId, "live")

  // تحديث رسالة الفعالية
  if (event.message_id && event.channel_id) {
    try {
      const channel = interaction.guild.channels.cache.get(event.channel_id)
      if (channel) {
        const msg = await channel.messages.fetch(event.message_id).catch(() => null)
        if (msg) {
          const attendees = await getAttendees(eventId)
          const goingCount = attendees.filter(a => a.status === "going").length
          const maybeCount = attendees.filter(a => a.status === "maybe").length

          const liveEvent = { ...event, status: "live" }
          const updatedEmbed = await buildEventEmbed(liveEvent, interaction.guild, goingCount, maybeCount)
          const buttons = buildEventButtons(eventId, "live")

          await msg.edit({ embeds: [updatedEmbed], components: [buttons] })

          // إرسال تنبيه في القناة
          const going = attendees.filter(a => a.status === "going")
          const mentions = going.slice(0, 10).map(a => `<@${a.user_id}>`).join(" ")

          if (mentions) {
            await channel.send({
              content: `🔴 **الفعالية بدأت الآن!**\n${mentions}${going.length > 10 ? ` و${going.length - 10} آخرين` : ""}`,
              allowedMentions: { users: going.slice(0, 10).map(a => a.user_id) }
            })
          }
        }
      }
    } catch {}
  }

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("🔴 الفعالية بدأت!")
        .setDescription(`تم تفعيل **${event.title}** — الفعالية جارية الآن`)
        .setTimestamp()
    ]
  })
}

async function handleEnd(interaction) {
  const eventId = interaction.options.getInteger("الرقم")

  await interaction.deferReply({ ephemeral: true })

  const event = await getEvent(eventId)
  if (!event || event.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ فعالية غير موجودة." })
  }

  const isAdmin = commandGuardSystem.requireAdmin(interaction)
  if (event.creator_id !== interaction.user.id && !isAdmin) {
    return interaction.editReply({ content: "❌ فقط منشئ الفعالية أو الأدمن." })
  }

  await updateEventStatus(eventId, "ended")

  if (event.message_id && event.channel_id) {
    try {
      const channel = interaction.guild.channels.cache.get(event.channel_id)
      if (channel) {
        const msg = await channel.messages.fetch(event.message_id).catch(() => null)
        if (msg) {
          const attendees = await getAttendees(eventId)
          const goingCount = attendees.filter(a => a.status === "going").length
          const maybeCount = attendees.filter(a => a.status === "maybe").length

          const endedEvent = { ...event, status: "ended" }
          const embed = await buildEventEmbed(endedEvent, interaction.guild, goingCount, maybeCount)
          const disabledButtons = buildEventButtons(eventId, "ended")

          await msg.edit({ embeds: [embed], components: [disabledButtons] })

          // رسالة اختتام
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle("✅ انتهت الفعالية")
                .setDescription(`**${event.title}** اختتمت!\nشكراً لجميع المشاركين 🎉`)
                .addFields({ name: "👥 إجمالي الحضور المسجل", value: `${goingCount} شخص`, inline: true })
                .setTimestamp()
            ]
          })
        }
      }
    } catch {}
  }

  return interaction.editReply({ content: "✅ تم إنهاء الفعالية بنجاح." })
}

async function handleAttendees(interaction) {
  const eventId = interaction.options.getInteger("الرقم")

  await interaction.deferReply({ ephemeral: true })

  const event = await getEvent(eventId)
  if (!event || event.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ فعالية غير موجودة." })
  }

  const attendees = await getAttendees(eventId)

  if (attendees.length === 0) {
    return interaction.editReply({ content: "📭 لا يوجد مسجلون بعد في هذه الفعالية." })
  }

  const going = attendees.filter(a => a.status === "going")
  const maybe = attendees.filter(a => a.status === "maybe")

  const embed = new EmbedBuilder()
    .setColor(EVENT_COLORS[event.category] || 0x5865f2)
    .setTitle(`👥 حضور: ${event.title}`)
    .setTimestamp()

  if (going.length > 0) {
    const list = going.slice(0, 20).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n")
    embed.addFields({
      name: `✅ حاضر (${going.length})`,
      value: list + (going.length > 20 ? `\n... و${going.length - 20} آخرين` : ""),
      inline: false
    })
  }

  if (maybe.length > 0) {
    const list = maybe.slice(0, 10).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n")
    embed.addFields({
      name: `🤔 ربما (${maybe.length})`,
      value: list,
      inline: false
    })
  }

  if (event.max_attendees) {
    const remaining = event.max_attendees - going.length
    embed.setFooter({ text: `${going.length}/${event.max_attendees} مكان | متبقي: ${Math.max(0, remaining)}` })
  }

  return interaction.editReply({ embeds: [embed] })
}

async function handleRemind(interaction) {
  const eventId = interaction.options.getInteger("الرقم")
  const customMsg = interaction.options.getString("الرسالة")

  await interaction.deferReply({ ephemeral: true })

  const event = await getEvent(eventId)
  if (!event || event.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ فعالية غير موجودة." })
  }

  const isAdmin = commandGuardSystem.requireAdmin(interaction)
  if (event.creator_id !== interaction.user.id && !isAdmin) {
    return interaction.editReply({ content: "❌ فقط منشئ الفعالية أو الأدمن." })
  }

  if (event.status === "ended" || event.status === "cancelled") {
    return interaction.editReply({ content: "❌ الفعالية منتهية أو ملغية." })
  }

  const going = (await getAttendees(eventId)).filter(a => a.status === "going")

  if (going.length === 0) {
    return interaction.editReply({ content: "📭 لا يوجد مسجلون لإرسال التذكير لهم." })
  }

  const channel = interaction.guild.channels.cache.get(event.channel_id)
  if (!channel) {
    return interaction.editReply({ content: "❌ القناة غير موجودة." })
  }

  const ts = Math.floor(event.start_time / 1000)
  const mentions = going.slice(0, 20).map(a => `<@${a.user_id}>`).join(" ")

  const reminderMsg = customMsg
    || `⏰ تذكير! فعالية **${event.title}** تبدأ <t:${ts}:R>`

  await channel.send({
    content: `${mentions}\n${reminderMsg}`,
    allowedMentions: { users: going.slice(0, 20).map(a => a.user_id) }
  })

  return interaction.editReply({
    content: `✅ تم إرسال التذكير لـ **${going.length}** شخص!`
  })
}

// ══════════════════════════════════════
//  BUTTON HANDLER (يُستدعى من interactionCreate.js)
// ══════════════════════════════════════

module.exports.handleEventButton = async function(interaction) {
  try {
    const [, action, eventIdStr] = interaction.customId.split("_")
    const eventId = parseInt(eventIdStr)

    if (!eventId || isNaN(eventId)) return

    const event = await getEvent(eventId)
    if (!event || event.guild_id !== interaction.guild.id) {
      return interaction.reply({ content: "❌ الفعالية غير موجودة.", ephemeral: true })
    }

    if (event.status === "ended" || event.status === "cancelled") {
      return interaction.reply({ content: "❌ هذه الفعالية منتهية أو ملغية.", ephemeral: true })
    }

    // ── عرض الحضور ──
    if (action === "attendees") {
      const attendees = await getAttendees(eventId)
      const going = attendees.filter(a => a.status === "going")
      const maybe = attendees.filter(a => a.status === "maybe")

      const embed = new EmbedBuilder()
        .setColor(EVENT_COLORS[event.category] || 0x5865f2)
        .setTitle(`👥 حضور: ${event.title}`)

      if (going.length > 0) {
        embed.addFields({
          name: `✅ حاضر (${going.length})`,
          value: going.slice(0, 15).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n") +
            (going.length > 15 ? `\n... +${going.length - 15}` : ""),
          inline: false
        })
      }

      if (maybe.length > 0) {
        embed.addFields({
          name: `🤔 ربما (${maybe.length})`,
          value: maybe.slice(0, 10).map((a, i) => `${i + 1}. <@${a.user_id}>`).join("\n"),
          inline: false
        })
      }

      if (going.length === 0 && maybe.length === 0) {
        embed.setDescription("لا يوجد مسجلون بعد.")
      }

      return interaction.reply({ embeds: [embed], ephemeral: true })
    }

    // ── التسجيل / الإلغاء ──
    const userId = interaction.user.id
    const currentStatus = await getUserStatus(eventId, userId)

    let newStatus = null
    let replyText = ""

    if (action === "going") {
      if (currentStatus?.status === "going") {
        await removeAttendee(eventId, userId)
        replyText = "❌ تم إلغاء تسجيلك كـ **حاضر**"
      } else {
        // تحقق من الحد الأقصى
        if (event.max_attendees) {
          const going = (await getAttendees(eventId)).filter(a => a.status === "going")
          if (going.length >= event.max_attendees) {
            return interaction.reply({ content: "❌ وصلت الفعالية للحد الأقصى من المسجلين!", ephemeral: true })
          }
        }
        await setAttendeeStatus(eventId, userId, "going")
        replyText = "✅ تم تسجيلك كـ **حاضر** في الفعالية!"
      }
    } else if (action === "maybe") {
      if (currentStatus?.status === "maybe") {
        await removeAttendee(eventId, userId)
        replyText = "❌ تم إلغاء تسجيلك كـ **ربما**"
      } else {
        await setAttendeeStatus(eventId, userId, "maybe")
        replyText = "🤔 تم تسجيلك كـ **ربما** في الفعالية!"
      }
    } else if (action === "notgoing") {
      await removeAttendee(eventId, userId)
      replyText = "✅ تم تسجيل **غيابك** عن الفعالية"
    }

    // تحديث رسالة الفعالية
    if (event.message_id) {
      try {
        const channel = interaction.guild.channels.cache.get(event.channel_id)
        if (channel) {
          const msg = await channel.messages.fetch(event.message_id).catch(() => null)
          if (msg) {
            const attendees = await getAttendees(eventId)
            const goingCount = attendees.filter(a => a.status === "going").length
            const maybeCount = attendees.filter(a => a.status === "maybe").length

            const updatedEmbed = await buildEventEmbed(event, interaction.guild, goingCount, maybeCount)
            await msg.edit({ embeds: [updatedEmbed] })
          }
        }
      } catch {}
    }

    return interaction.reply({ content: replyText, ephemeral: true })

  } catch (err) {
    logger.error("EVENT_BUTTON_ERROR", { error: err.message })
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ", ephemeral: true }).catch(() => {})
    }
  }
}