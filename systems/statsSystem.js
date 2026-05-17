// ═══════════════════════════════════════════════════════════════════════
//  STATS SYSTEM v2 — لوحة إحصائيات ذكية
//  الفكرة: embed واحد في قناة نصية يتحدث كل 10 دقائق
//  + ذاكرة يومية (snapshots) + أوقات ذروة + milestones + هوية السيرفر
//
//  ⚠️ ملاحظة: الجداول (stats_config, stats_snapshots, stats_hourly)
//     الآن تُنشأ من migration 034_stats_tables.js
//     ensureTables() محتفظ بيها للتوافق الخلفي فقط ولا تعمل شي
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
//  قاعدة البيانات — الجداول تتولاها migration 034
//  ensureTables() محتفظ بيها للتوافق الخلفي فقط
// ═══════════════════════════════════════════════════════════════════════

async function ensureTables() {
  // ✅ الجداول تُنشأ الآن من systems/migrations/migrations/034_stats_tables.js
  //    لا حاجة لإنشائها هنا — كل schema في مكان واحد
  return
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
    logger.error("STATS_ONLINE_PEAK_FAILED", { error: err.message, guildId })
  }
}

async function getRecentSnapshots(guildId, days = 7) {
  const result = await databaseSystem.query(`
    SELECT * FROM stats_snapshots
    WHERE guild_id = $1
      AND date >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY date DESC
  `, [guildId])
  return result.rows || []
}

async function getYesterdaySnapshot(guildId) {
  const result = await databaseSystem.queryOne(`
    SELECT * FROM stats_snapshots
    WHERE guild_id = $1 AND date = CURRENT_DATE - INTERVAL '1 day'
  `, [guildId])
  return result || null
}

async function recordHourlyAverage(guildId, onlineCount) {
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
    logger.error("STATS_HOURLY_FAILED", { error: err.message, guildId })
  }
}

async function getPeakHour(guildId) {
  const result = await databaseSystem.queryOne(`
    SELECT hour, avg_online FROM stats_hourly
    WHERE guild_id = $1
    ORDER BY avg_online DESC
    LIMIT 1
  `, [guildId])
  return result || null
}

// ═══════════════════════════════════════════════════════════════════════
//  حساب القيم
// ═══════════════════════════════════════════════════════════════════════

function countOnlineMembers(guild) {
  if (!guild.members?.cache) return 0
  let count = 0
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue
    const status = member.presence?.status
    if (status && status !== "offline") count++
  }
  return count
}

function countBots(guild) {
  if (!guild.members?.cache) return 0
  let count = 0
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) count++
  }
  return count
}

function countByStatus(guild, status) {
  if (!guild.members?.cache) return 0
  let count = 0
  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue
    if (member.presence?.status === status) count++
  }
  return count
}

function getNextMilestone(currentCount) {
  for (const m of MILESTONES) {
    if (m > currentCount) return m
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════
//  بناء Embed اللوحة
// ═══════════════════════════════════════════════════════════════════════

async function buildPanelEmbed(guild) {
  const memberCount = guild.memberCount || 0
  const onlineCount = countOnlineMembers(guild)
  const botCount    = countBots(guild)
  const humanCount  = memberCount - botCount

  const onlinePercent = memberCount > 0 ? Math.round((onlineCount / memberCount) * 100) : 0
  const onlineBar     = buildBar(onlineCount, memberCount, 12)

  // ─── snapshots لحساب التغيير ───
  const yesterday = await getYesterdaySnapshot(guild.id)
  const yesterdayMembers = yesterday?.member_count || memberCount

  const dailyDiff = memberCount - yesterdayMembers
  const snapshots = await getRecentSnapshots(guild.id, 7)

  const weeklyStart = snapshots[snapshots.length - 1]?.member_count || memberCount
  const weeklyGrowth = memberCount - weeklyStart

  const totalJoined = snapshots.reduce((s, x) => s + (x.joined_today || 0), 0)
  const totalLeft   = snapshots.reduce((s, x) => s + (x.left_today || 0), 0)

  // ─── ذروة المتصلين ───
  const peakHour = await getPeakHour(guild.id)
  const peakText = peakHour
    ? `🕐 ذروة المتصلين: **${peakHour.hour}:00** (~${Math.round(peakHour.avg_online)} متصل)`
    : "🕐 ذروة المتصلين: جاري التحليل..."

  // ─── milestone ───
  const nextMile = getNextMilestone(memberCount)
  const mileBar  = nextMile ? buildBar(memberCount, nextMile, 12) : "█".repeat(12)
  const mileText = nextMile
    ? `🎯 المعلم القادم: **${nextMile}** عضو\n${mileBar} (${Math.round((memberCount / nextMile) * 100)}%)`
    : `🎯 لقد تجاوزت كل المعالم المعروفة! 👑`

  // ─── لقب السيرفر ───
  const boostLevel = guild.premiumTier || 0
  const serverTitle = getServerTitle(guild, onlineCount, weeklyGrowth, boostLevel)

  const channels = guild.channels.cache
  const textChannels  = channels.filter(c => c.type === ChannelType.GuildText).size
  const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size
  const categories    = channels.filter(c => c.type === ChannelType.GuildCategory).size

  const roles = guild.roles.cache.size - 1 // -1 لـ @everyone
  const emojis = guild.emojis.cache.size
  const boostCount = guild.premiumSubscriptionCount || 0

  // ─── الإيمبد ───
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: guild.name,
      iconURL: guild.iconURL({ dynamic: true, size: 128 }) || undefined
    })
    .setTitle(`📊 ${serverTitle}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
    .addFields(
      {
        name: "👥 الأعضاء",
        value: [
          `**${memberCount.toLocaleString("ar-SA")}** عضو`,
          `🤖 بوتات: **${botCount}** | 👤 بشر: **${humanCount}**`,
          `📅 اليوم: ${arrow(dailyDiff)}`,
          `📊 الأسبوع: ${arrow(weeklyGrowth)}`
        ].join("\n"),
        inline: false
      },
      {
        name: "🟢 المتصلون الآن",
        value: [
          `**${onlineCount}** / ${memberCount} (${onlinePercent}%)`,
          onlineBar,
          peakText
        ].join("\n"),
        inline: false
      },
      {
        name: "📈 آخر 7 أيام",
        value: [
          `📥 انضموا: **${totalJoined}**`,
          `📤 غادروا: **${totalLeft}**`,
          `📊 صافي النمو: ${arrow(totalJoined - totalLeft)}`
        ].join("\n"),
        inline: true
      },
      {
        name: "🎯 معلم النمو",
        value: mileText,
        inline: true
      },
      {
        name: "🏠 السيرفر",
        value: [
          `📝 قنوات نصية: **${textChannels}**`,
          `🔊 قنوات صوتية: **${voiceChannels}**`,
          `📂 كاتيقوريات: **${categories}**`,
          `🏷️ رتب: **${roles}** | 😀 إيموجي: **${emojis}**`,
          `🚀 بوست: **${boostCount}** (المستوى ${boostLevel})`
        ].join("\n"),
        inline: false
      }
    )
    .setFooter({ text: `آخر تحديث` })
    .setTimestamp()

  return embed
}

// ═══════════════════════════════════════════════════════════════════════
//  تحديث اللوحة
// ═══════════════════════════════════════════════════════════════════════

async function updatePanel(guild, client) {
  try {
    const config = await getConfig(guild.id)
    if (!config || !config.enabled) return false
    if (!config.panel_channel_id || !config.panel_message_id) return false

    const channel = guild.channels.cache.get(config.panel_channel_id)
    if (!channel) return false

    let message
    try {
      message = await channel.messages.fetch(config.panel_message_id)
    } catch {
      return false
    }

    const embed = await buildPanelEmbed(guild)
    await message.edit({ embeds: [embed] })

    // record stats
    await recordSnapshot(guild.id, guild.memberCount || 0)
    const onlineCount = countOnlineMembers(guild)
    await updateOnlinePeak(guild.id, onlineCount)
    await recordHourlyAverage(guild.id, onlineCount)

    // milestone check
    await checkMilestone(guild, client, config)

    return true
  } catch (err) {
    logger.error("STATS_UPDATE_PANEL_FAILED", { error: err.message, guildId: guild.id })
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Milestone check
// ═══════════════════════════════════════════════════════════════════════

async function checkMilestone(guild, client, config) {
  try {
    const memberCount = guild.memberCount || 0
    const nextMile = config.next_milestone || getNextMilestone(memberCount)

    if (!nextMile || memberCount < nextMile) return

    // وصل للـ milestone
    const channelId = config.milestone_channel_id || config.panel_channel_id
    const channel = guild.channels.cache.get(channelId)

    if (channel) {
      const newNext = getNextMilestone(memberCount)

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`🎉 وصلنا لـ ${memberCount.toLocaleString("ar-SA")} عضو!`)
        .setDescription([
          `**شكراً لكل عضو في ${guild.name}!**`,
          ``,
          `🎯 المعلم التالي: **${newNext ? newNext.toLocaleString("ar-SA") : "غير محدود"}**`
        ].join("\n"))
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || null)
        .setTimestamp()

      await channel.send({ embeds: [embed] }).catch(() => {})

      // حدّث الـ next milestone
      await saveConfig(guild.id, { next_milestone: newNext })
    }
  } catch (err) {
    logger.error("STATS_MILESTONE_FAILED", { error: err.message })
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  Weekly Report
// ═══════════════════════════════════════════════════════════════════════

async function buildWeeklyReport(guild) {
  const snapshots = await getRecentSnapshots(guild.id, 7)

  const totalJoined = snapshots.reduce((s, x) => s + (x.joined_today || 0), 0)
  const totalLeft   = snapshots.reduce((s, x) => s + (x.left_today || 0), 0)

  const startMembers = snapshots[snapshots.length - 1]?.member_count || guild.memberCount
  const endMembers   = guild.memberCount || 0
  const growth = endMembers - startMembers
  const growthPercent = startMembers > 0
    ? ((growth / startMembers) * 100).toFixed(1)
    : "0.0"

  const peakOnline = snapshots.reduce((max, s) => Math.max(max, s.online_peak || 0), 0)

  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined })
    .setTitle("📊 التقرير الأسبوعي")
    .setDescription("ملخص نشاط السيرفر آخر **7 أيام**")
    .addFields(
      {
        name: "👥 الأعضاء",
        value: [
          `بداية الأسبوع: **${startMembers.toLocaleString("ar-SA")}**`,
          `نهاية الأسبوع: **${endMembers.toLocaleString("ar-SA")}**`,
          `📈 النمو: ${arrow(growth)} (${growthPercent}%)`
        ].join("\n"),
        inline: false
      },
      {
        name: "📥 الانضمامات",
        value: `**${totalJoined}** عضو جديد`,
        inline: true
      },
      {
        name: "📤 المغادرات",
        value: `**${totalLeft}** عضو`,
        inline: true
      },
      {
        name: "🟢 ذروة المتصلين",
        value: `**${peakOnline}** متصل`,
        inline: true
      }
    )
    .setFooter({ text: "التقرير الأسبوعي — تم توليده تلقائياً" })
    .setTimestamp()
}

// ═══════════════════════════════════════════════════════════════════════
//  Setup / Initial Panel
// ═══════════════════════════════════════════════════════════════════════

async function setupPanel(guild, channel, milestoneChannel) {
  // ابني الإيمبد الأول
  const embed = await buildPanelEmbed(guild)

  // ابعث الرسالة
  const message = await channel.send({ embeds: [embed] })

  // احفظ الـ config
  const memberCount = guild.memberCount || 0
  await saveConfig(guild.id, {
    panel_channel_id:     channel.id,
    panel_message_id:     message.id,
    milestone_channel_id: milestoneChannel?.id || channel.id,
    next_milestone:       getNextMilestone(memberCount),
    enabled:              true
  })

  // أول snapshot
  await recordSnapshot(guild.id, memberCount)

  return message
}

// ═══════════════════════════════════════════════════════════════════════
//  Get all enabled guilds (للـ scheduler)
// ═══════════════════════════════════════════════════════════════════════

async function getEnabledGuilds() {
  const result = await databaseSystem.query(
    "SELECT * FROM stats_config WHERE enabled = true"
  )
  return result.rows || []
}

// ═══════════════════════════════════════════════════════════════════════
//  Increment join/leave counters (يُستدعى من events)
// ═══════════════════════════════════════════════════════════════════════

async function incrementJoin(guildId, memberCount) {
  await recordSnapshot(guildId, memberCount, 1, 0)
}

async function incrementLeave(guildId, memberCount) {
  await recordSnapshot(guildId, memberCount, 0, 1)
}

// ═══════════════════════════════════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  ensureTables,
  getConfig,
  saveConfig,
  disableStats,
  recordSnapshot,
  updateOnlinePeak,
  recordHourlyAverage,
  getRecentSnapshots,
  getYesterdaySnapshot,
  getPeakHour,
  buildPanelEmbed,
  updatePanel,
  buildWeeklyReport,
  setupPanel,
  getEnabledGuilds,
  incrementJoin,
  incrementLeave,
  countOnlineMembers,
  countBots,
  countByStatus,
  getNextMilestone,
  MILESTONES
}