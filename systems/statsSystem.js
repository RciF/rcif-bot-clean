// ═══════════════════════════════════════════════════════════════════════
//  STATS SYSTEM v2 — لوحة إحصائيات ذكية
//  الفكرة: embed واحد في قناة نصية يتحدث كل 10 دقائق
//  + ذاكرة يومية (snapshots) + أوقات ذروة + milestones + هوية السيرفر
// ═══════════════════════════════════════════════════════════════════════

const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

// ─── Milestones المدعومة ───
const MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

// ─── Progress bar ───
function buildBar(current, max, length = 12) {
  if (!max || max === 0) return "░".repeat(length)
  const filled = Math.min(Math.round((current / max) * length), length)
  return "█".repeat(filled) + "░".repeat(length - filled)
}

// ─── السهم حسب التغيير ───
function arrow(diff) {
  if (diff > 0) return `↑ +${diff}`
  if (diff < 0) return `↓ ${diff}`
  return "━ لا تغيير"
}

// ─── لقب السيرفر التلقائي ───
function getServerTitle(guild, onlineCount, weeklyGrowth, boostLevel) {
  const onlinePercent = guild.memberCount > 0
    ? (onlineCount / guild.memberCount) * 100
    : 0

  if (boostLevel >= 3)         return "سيرفر أسطوري 👑"
  if (weeklyGrowth >= 100)     return "سيرفر ينفجر نمواً 🚀"
  if (weeklyGrowth >= 50)      return "سيرفر ينمو بسرعة 📈"
  if (weeklyGrowth >= 20)      return "سيرفر في تصاعد 📊"
  if (onlinePercent >= 40)     return "سيرفر نشيط جداً 🔥"
  if (onlinePercent >= 20)     return "سيرفر نشيط ✨"
  if (onlinePercent >= 10)     return "سيرفر متوسط النشاط 💬"
  if (boostLevel >= 2)         return "سيرفر مميز 💜"
  if (boostLevel >= 1)         return "سيرفر مدعوم 🚀"
  if (onlinePercent < 5)       return "سيرفر هادئ 😴"
  return "سيرفر نشيط 🌟"
}

// ═══════════════════════════════════════════════════════════════════════
//  قاعدة البيانات — إنشاء الجداول
// ═══════════════════════════════════════════════════════════════════════

async function ensureTables() {
  // إعدادات اللوحة لكل سيرفر
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS stats_config (
      guild_id            TEXT PRIMARY KEY,
      panel_channel_id    TEXT,
      panel_message_id    TEXT,
      milestone_channel_id TEXT,
      next_milestone      INTEGER DEFAULT 100,
      enabled             BOOLEAN DEFAULT true,
      created_at          TIMESTAMP DEFAULT NOW(),
      updated_at          TIMESTAMP DEFAULT NOW()
    )
  `)

  // لقطات يومية (قلب نظام الذاكرة)
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS stats_snapshots (
      id              SERIAL PRIMARY KEY,
      guild_id        TEXT NOT NULL,
      date            DATE NOT NULL DEFAULT CURRENT_DATE,
      member_count    INTEGER DEFAULT 0,
      online_peak     INTEGER DEFAULT 0,
      online_peak_hour INTEGER DEFAULT 0,
      joined_today    INTEGER DEFAULT 0,
      left_today      INTEGER DEFAULT 0,
      UNIQUE (guild_id, date)
    )
  `)

  // معدل الأعضاء كل ساعة (لحساب أوقات الذروة)
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS stats_hourly (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      hour        INTEGER NOT NULL,
      avg_online  NUMERIC(10,2) DEFAULT 0,
      samples     INTEGER DEFAULT 0,
      UNIQUE (guild_id, hour)
    )
  `)

  // إندكسات للأداء
  await databaseSystem.query(`
    CREATE INDEX IF NOT EXISTS idx_stats_snapshots_guild_date
    ON stats_snapshots (guild_id, date DESC)
  `)
}

// ═══════════════════════════════════════════════════════════════════════
//  إدارة الإعدادات
// ═══════════════════════════════════════════════════════════════════════

async function getConfig(guildId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM stats_config WHERE guild_id = $1",
    [guildId]
  )
}

async function saveConfig(guildId, data) {
  await databaseSystem.query(`
    INSERT INTO stats_config (guild_id, panel_channel_id, panel_message_id, milestone_channel_id, next_milestone, enabled, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (guild_id) DO UPDATE SET
      panel_channel_id     = COALESCE($2, stats_config.panel_channel_id),
      panel_message_id     = COALESCE($3, stats_config.panel_message_id),
      milestone_channel_id = COALESCE($4, stats_config.milestone_channel_id),
      next_milestone       = COALESCE($5, stats_config.next_milestone),
      enabled              = COALESCE($6, stats_config.enabled),
      updated_at           = NOW()
  `, [
    guildId,
    data.panel_channel_id    || null,
    data.panel_message_id    || null,
    data.milestone_channel_id || null,
    data.next_milestone      || null,
    data.enabled !== undefined ? data.enabled : null
  ])
}

async function disableStats(guildId) {
  await databaseSystem.query(
    "UPDATE stats_config SET enabled = false, updated_at = NOW() WHERE guild_id = $1",
    [guildId]
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  Snapshots — الذاكرة اليومية
// ═══════════════════════════════════════════════════════════════════════

async function recordSnapshot(guildId, memberCount, joinedDelta = 0, leftDelta = 0) {
  try {
    await databaseSystem.query(`
      INSERT INTO stats_snapshots (guild_id, date, member_count, joined_today, left_today)
      VALUES ($1, CURRENT_DATE, $2, $3, $4)
      ON CONFLICT (guild_id, date) DO UPDATE SET
        member_count = $2,
        joined_today = stats_snapshots.joined_today + $3,
        left_today   = stats_snapshots.left_today   + $4
    `, [guildId, memberCount, joinedDelta, leftDelta])
  } catch (err) {
    logger.error("STATS_SNAPSHOT_FAILED", { error: err.message, guildId })
  }
}

async function updateOnlinePeak(guildId, onlineCount) {
  try {
    const hour = new Date().getHours()
    await databaseSystem.query(`
      INSERT INTO stats_snapshots (guild_id, date, online_peak, online_peak_hour)
      VALUES ($1, CURRENT_DATE, $2, $3)
      ON CONFLICT (guild_id, date) DO UPDATE SET
        online_peak      = GREATEST(stats_snapshots.online_peak, $2),
        online_peak_hour = CASE
          WHEN $2 > stats_snapshots.online_peak THEN $3
          ELSE stats_snapshots.online_peak_hour
        END
    `, [guildId, onlineCount, hour])
  } catch (err) {
    logger.error("STATS_PEAK_UPDATE_FAILED", { error: err.message })
  }
}

async function updateHourlyStats(guildId, onlineCount) {
  try {
    const hour = new Date().getHours()
    await databaseSystem.query(`
      INSERT INTO stats_hourly (guild_id, hour, avg_online, samples)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (guild_id, hour) DO UPDATE SET
        avg_online = (stats_hourly.avg_online * stats_hourly.samples + $3) / (stats_hourly.samples + 1),
        samples    = stats_hourly.samples + 1
    `, [guildId, hour, onlineCount])
  } catch (err) {
    logger.error("STATS_HOURLY_UPDATE_FAILED", { error: err.message })
  }
}

// ─── جلب البيانات التاريخية ───

async function getWeeklyData(guildId) {
  try {
    const rows = await databaseSystem.queryMany(`
      SELECT date, member_count, joined_today, left_today, online_peak, online_peak_hour
      FROM stats_snapshots
      WHERE guild_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date DESC
    `, [guildId])
    return rows
  } catch {
    return []
  }
}

async function getPeakHour(guildId) {
  try {
    const row = await databaseSystem.queryOne(`
      SELECT hour, avg_online
      FROM stats_hourly
      WHERE guild_id = $1
      ORDER BY avg_online DESC
      LIMIT 1
    `, [guildId])
    return row
  } catch {
    return null
  }
}

async function getTodaySnapshot(guildId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM stats_snapshots WHERE guild_id = $1 AND date = CURRENT_DATE",
    [guildId]
  )
}

async function getYesterdaySnapshot(guildId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM stats_snapshots WHERE guild_id = $1 AND date = CURRENT_DATE - INTERVAL '1 day'",
    [guildId]
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  جلب إحصائيات السيرفر الحية
// ═══════════════════════════════════════════════════════════════════════

async function fetchLiveStats(guild) {
  try {
    await guild.members.fetch()
  } catch {}

  const totalMembers  = guild.memberCount
  const humanMembers  = guild.members.cache.filter(m => !m.user.bot).size
  const botMembers    = guild.members.cache.filter(m => m.user.bot).size
  const onlineMembers = guild.members.cache.filter(m =>
    m.presence?.status && m.presence.status !== "offline"
  ).size

  const textChannels  = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size
  const totalChannels = textChannels + voiceChannels

  const rolesCount    = guild.roles.cache.filter(r => r.id !== guild.id).size
  const boostCount    = guild.premiumSubscriptionCount || 0
  const boostLevel    = guild.premiumTier || 0
  const emojiCount    = guild.emojis.cache.size

  const onlinePercent = totalMembers > 0
    ? Math.round((onlineMembers / totalMembers) * 100)
    : 0

  const humanPercent  = totalMembers > 0
    ? Math.round((humanMembers / totalMembers) * 100)
    : 0

  return {
    totalMembers, humanMembers, botMembers,
    onlineMembers, onlinePercent, humanPercent,
    textChannels, voiceChannels, totalChannels,
    rolesCount, boostCount, boostLevel, emojiCount
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  بناء الـ Embed الرئيسي
// ═══════════════════════════════════════════════════════════════════════

async function buildPanelEmbed(guild) {
  const stats     = await fetchLiveStats(guild)
  const today     = await getTodaySnapshot(guild.id)
  const yesterday = await getYesterdaySnapshot(guild.id)
  const weekData  = await getWeeklyData(guild.id)
  const peakHour  = await getPeakHour(guild.id)

  // حساب التغيير اليومي
  const memberDiff = yesterday
    ? stats.totalMembers - yesterday.member_count
    : 0

  // حساب النمو الأسبوعي
  const oldestWeek = weekData.length > 0 ? weekData[weekData.length - 1] : null
  const weeklyGrowth = oldestWeek
    ? stats.totalMembers - oldestWeek.member_count
    : 0

  // أكثر يوم نمواً هذا الأسبوع
  let bestDay = null
  let bestDayGrowth = 0
  for (const day of weekData) {
    const net = (day.joined_today || 0) - (day.left_today || 0)
    if (net > bestDayGrowth) {
      bestDayGrowth = net
      bestDay = day
    }
  }

  const serverTitle = getServerTitle(guild, stats.onlineMembers, weeklyGrowth, stats.boostLevel)

  // الـ Milestone التالي
  const nextMilestone = MILESTONES.find(m => m > stats.totalMembers) || null
  const prevMilestone = MILESTONES.filter(m => m <= stats.totalMembers).pop() || 0
  const milestonePercent = nextMilestone
    ? Math.round(((stats.totalMembers - prevMilestone) / (nextMilestone - prevMilestone)) * 100)
    : 100

  // ساعة الذروة
  const peakHourText = peakHour
    ? `${peakHour.hour}:00 - ${peakHour.hour + 1}:00`
    : "—"

  const todayPeakText = today?.online_peak
    ? `${today.online_peak} (${today.online_peak_hour}:00)`
    : `${stats.onlineMembers}`

  // بناء الـ embed
  const now = new Date()
  const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true })

  const embed = new EmbedBuilder()
    .setColor(getColorByActivity(stats.onlinePercent, weeklyGrowth))
    .setTitle(`🏠 ${guild.name}`)
    .setDescription(`### ${serverTitle}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))

  // ── قسم الأعضاء ──
  embed.addFields({
    name: "👥 الأعضاء",
    value: [
      `**${stats.totalMembers.toLocaleString("ar-SA")}** عضو  ${arrow(memberDiff)}`,
      `\`${buildBar(stats.humanMembers, stats.totalMembers)}\` ${stats.humanPercent}% بشر`,
      `🟢 متصل الآن: **${stats.onlineMembers}** (${stats.onlinePercent}%)`,
      `👤 بشر: **${stats.humanMembers}** | 🤖 بوتات: **${stats.botMembers}**`,
    ].join("\n"),
    inline: false
  })

  // ── قسم النشاط ──
  embed.addFields({
    name: "⏰ النشاط",
    value: [
      `ذروة اليوم: **${todayPeakText}**`,
      `أوقات الذروة العادية: **${peakHourText}**`,
      weeklyGrowth !== 0
        ? `نمو هذا الأسبوع: ${arrow(weeklyGrowth)}`
        : `هذا الأسبوع: لا تغيير`,
      bestDay && bestDayGrowth > 0
        ? `أفضل يوم: **${formatDate(bestDay.date)}** (+${bestDayGrowth} عضو)`
        : ""
    ].filter(Boolean).join("\n"),
    inline: false
  })

  // ── السيرفر ──
  embed.addFields(
    {
      name: "📡 القنوات",
      value: `💬 نصية: **${stats.textChannels}**\n🔊 صوتية: **${stats.voiceChannels}**\n📊 المجموع: **${stats.totalChannels}**`,
      inline: true
    },
    {
      name: "🏷️ الرتب والإيموجي",
      value: `🏷️ رتب: **${stats.rolesCount}**\n😄 إيموجي: **${stats.emojiCount}**`,
      inline: true
    },
    {
      name: "🚀 البوست",
      value: [
        `المستوى: **${stats.boostLevel}**`,
        `البوستات: **${stats.boostCount}**`,
        getBoostBar(stats.boostLevel)
      ].join("\n"),
      inline: true
    }
  )

  // ── Milestone ──
  if (nextMilestone) {
    const remaining = nextMilestone - stats.totalMembers
    embed.addFields({
      name: "🎯 الـ Milestone القادم",
      value: [
        `**${nextMilestone.toLocaleString("ar-SA")}** عضو — متبقي **${remaining.toLocaleString("ar-SA")}**`,
        `\`${buildBar(stats.totalMembers - prevMilestone, nextMilestone - prevMilestone, 14)}\` ${milestonePercent}%`
      ].join("\n"),
      inline: false
    })
  }

  embed.setFooter({ text: `آخر تحديث: ${timeStr}` })
  embed.setTimestamp()

  return embed
}

// ─── لون الـ embed حسب النشاط ───
function getColorByActivity(onlinePercent, weeklyGrowth) {
  if (weeklyGrowth >= 50)      return 0x00ff88  // أخضر ساطع - نمو قوي
  if (onlinePercent >= 30)     return 0x00c8ff  // أزرق - نشيط
  if (onlinePercent >= 15)     return 0x5865f2  // بنفسجي - متوسط
  if (onlinePercent >= 5)      return 0xf59e0b  // برتقالي - هادئ
  return 0x64748b                               // رمادي - نائم
}

// ─── شريط البوست ───
function getBoostBar(level) {
  const bars = ["░░░", "█░░", "██░", "███"]
  return bars[Math.min(level, 3)] || "░░░"
}

// ─── تنسيق التاريخ ───
function formatDate(date) {
  const d = new Date(date)
  return d.toLocaleDateString("ar-SA", { weekday: "long" })
}

// ═══════════════════════════════════════════════════════════════════════
//  تحديث اللوحة
// ═══════════════════════════════════════════════════════════════════════

async function updatePanel(guild, client) {
  try {
    const config = await getConfig(guild.id)
    if (!config || !config.enabled) return
    if (!config.panel_channel_id || !config.panel_message_id) return

    const channel = guild.channels.cache.get(config.panel_channel_id)
    if (!channel) return

    const perms = channel.permissionsFor(guild.members.me)
    if (!perms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) return

    let msg = null
    try {
      msg = await channel.messages.fetch(config.panel_message_id)
    } catch {
      // الرسالة محذوفة — نعيد إنشاؤها
      const newMsg = await channel.send({ embeds: [await buildPanelEmbed(guild)] })
      await saveConfig(guild.id, { panel_message_id: newMsg.id })
      return
    }

    const embed = await buildPanelEmbed(guild)
    await msg.edit({ embeds: [embed] })

    // تحديث الـ snapshots والـ hourly
    const stats = await fetchLiveStats(guild)
    await updateOnlinePeak(guild.id, stats.onlineMembers)
    await updateHourlyStats(guild.id, stats.onlineMembers)
    await recordSnapshot(guild.id, stats.totalMembers)

    // تحقق من الـ Milestones
    await checkMilestone(guild, stats.totalMembers, config, client)

  } catch (err) {
    logger.error("STATS_PANEL_UPDATE_FAILED", { error: err.message, guildId: guild.id })
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Milestones
// ═══════════════════════════════════════════════════════════════════════

async function checkMilestone(guild, memberCount, config, client) {
  try {
    if (!config.next_milestone) return
    if (memberCount < config.next_milestone) return

    // تم تجاوز الـ milestone!
    const milestone = config.next_milestone
    const nextOne = MILESTONES.find(m => m > memberCount) || null

    // تحديث قاعدة البيانات
    await saveConfig(guild.id, { next_milestone: nextOne })

    // إرسال الاحتفال
    const celebChannel = config.milestone_channel_id
      ? guild.channels.cache.get(config.milestone_channel_id)
      : null

    if (!celebChannel) return

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("🎉 Milestone جديد!")
      .setDescription([
        `## 🏆 ${guild.name} وصل لـ **${milestone.toLocaleString("ar-SA")}** عضو!`,
        "",
        "شكراً لكل عضو ساهم في هذا الإنجاز 💙",
        nextOne ? `\n🎯 الهدف القادم: **${nextOne.toLocaleString("ar-SA")}** عضو` : "🌟 وصلتوا لأعلى مستوى!"
      ].join("\n"))
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .setTimestamp()

    await celebChannel.send({ embeds: [embed] })

  } catch (err) {
    logger.error("STATS_MILESTONE_FAILED", { error: err.message })
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  تحديث كل السيرفرات (يُستدعى من الـ Scheduler)
// ═══════════════════════════════════════════════════════════════════════

async function updateAllGuilds(client) {
  for (const [, guild] of client.guilds.cache) {
    try {
      await updatePanel(guild, client)
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      logger.error("STATS_UPDATE_ALL_FAILED", { error: err.message, guildId: guild.id })
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  إنشاء اللوحة (للأمر /إحصائيات إعداد)
// ═══════════════════════════════════════════════════════════════════════

async function setupPanel(guild, channel, milestoneChannel = null) {
  await ensureTables()

  const embed = await buildPanelEmbed(guild)
  const msg = await channel.send({ embeds: [embed] })

  const stats = await fetchLiveStats(guild)
  const nextMilestone = MILESTONES.find(m => m > stats.totalMembers) || null

  await saveConfig(guild.id, {
    panel_channel_id:     channel.id,
    panel_message_id:     msg.id,
    milestone_channel_id: milestoneChannel?.id || null,
    next_milestone:       nextMilestone,
    enabled:              true
  })

  await recordSnapshot(guild.id, stats.totalMembers)

  return { msg, embed }
}

// ═══════════════════════════════════════════════════════════════════════
//  التقرير الأسبوعي
// ═══════════════════════════════════════════════════════════════════════

async function buildWeeklyReport(guild) {
  const weekData = await getWeeklyData(guild.id)
  const stats    = await fetchLiveStats(guild)
  const peakHour = await getPeakHour(guild.id)

  if (weekData.length === 0) {
    return new EmbedBuilder()
      .setColor(0x64748b)
      .setTitle("📊 لا توجد بيانات كافية")
      .setDescription("اللوحة تحتاج على الأقل يوم واحد لتوليد تقرير.")
  }

  const oldest = weekData[weekData.length - 1]
  const weeklyGrowth = stats.totalMembers - (oldest?.member_count || stats.totalMembers)
  const totalJoined  = weekData.reduce((s, d) => s + (d.joined_today || 0), 0)
  const totalLeft    = weekData.reduce((s, d) => s + (d.left_today   || 0), 0)
  const avgOnline    = weekData.length > 0
    ? Math.round(weekData.reduce((s, d) => s + (d.online_peak || 0), 0) / weekData.length)
    : 0

  // أفضل يوم
  let bestDay = null, bestNet = -Infinity
  for (const d of weekData) {
    const net = (d.joined_today || 0) - (d.left_today || 0)
    if (net > bestNet) { bestNet = net; bestDay = d }
  }

  const embed = new EmbedBuilder()
    .setColor(weeklyGrowth >= 0 ? 0x22c55e : 0xef4444)
    .setTitle(`📊 التقرير الأسبوعي — ${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      {
        name: "👥 الأعضاء",
        value: [
          `الإجمالي الحالي: **${stats.totalMembers.toLocaleString("ar-SA")}**`,
          `النمو هذا الأسبوع: ${arrow(weeklyGrowth)}`,
          `انضم: **${totalJoined}** | غادر: **${totalLeft}**`
        ].join("\n"),
        inline: false
      },
      {
        name: "📈 النشاط",
        value: [
          `متوسط الذروة اليومية: **${avgOnline}** متصل`,
          peakHour ? `أوقات الذروة: **${peakHour.hour}:00 - ${peakHour.hour + 1}:00**` : "",
          bestDay && bestNet > 0
            ? `أفضل يوم: **${formatDate(bestDay.date)}** (+${bestNet} عضو)`
            : "لا يوجد نمو ملحوظ"
        ].filter(Boolean).join("\n"),
        inline: false
      }
    )
    .setFooter({ text: `بيانات آخر ${weekData.length} أيام` })
    .setTimestamp()

  return embed
}

// ═══════════════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  ensureTables,
  setupPanel,
  updatePanel,
  updateAllGuilds,
  getConfig,
  saveConfig,
  disableStats,
  recordSnapshot,
  buildPanelEmbed,
  buildWeeklyReport,
  fetchLiveStats,
  MILESTONES
}