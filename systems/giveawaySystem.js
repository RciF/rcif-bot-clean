// ══════════════════════════════════════════════════════════════════
//  GIVEAWAY SYSTEM
//  المسار: systems/giveawaySystem.js
//
//  مسؤول عن:
//   • إنشاء سحب جديد + رسالة embed + زر مشاركة
//   • تسجيل المشاركين عند الضغط على الزر (مع التحقق من الشروط)
//   • انهاء السحب تلقائياً عند انتهاء الوقت + اختيار الفائزين
//   • Reroll (إعادة اختيار فائز)
//   • إلغاء سحب
//
//  Scheduler tick كل 30 ثانية لفحص السحوبات المنتهية
// ══════════════════════════════════════════════════════════════════

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const databaseSystem = require("./databaseSystem")
const scheduler = require("./schedulerSystem")
const logger = require("./loggerSystem")

let _client = null
const CHECK_INTERVAL = 30 * 1000 // كل 30 ثانية

// ──────────────────────────────────────────────────────────────────
//  COLORS & EMOJIS
// ──────────────────────────────────────────────────────────────────

const COLORS = {
  active:    0xf59e0b,  // أصفر
  ended:     0x22c55e,  // أخضر
  cancelled: 0x64748b   // رمادي
}

const PRIZE_EMOJI = "🎉"
const BUTTON_EMOJI = "🎊"

// ──────────────────────────────────────────────────────────────────
//  Build embed
// ──────────────────────────────────────────────────────────────────

function buildGiveawayEmbed(giveaway, entryCount = 0) {
  const endAtMs = new Date(giveaway.end_at).getTime()
  const endTs = Math.floor(endAtMs / 1000)
  const isActive = giveaway.status === "active"
  const isEnded = giveaway.status === "ended"
  const isCancelled = giveaway.status === "cancelled"

  let title = `${PRIZE_EMOJI} ${giveaway.prize}`
  if (isEnded) title = `🏆 ${giveaway.prize} — انتهى`
  if (isCancelled) title = `❌ ${giveaway.prize} — أُلغي`

  const embed = new EmbedBuilder()
    .setColor(COLORS[giveaway.status] || COLORS.active)
    .setTitle(title)
    .setTimestamp(new Date(giveaway.created_at || Date.now()))

  // الوصف
  let description = ""
  if (giveaway.description) {
    description += `${giveaway.description}\n\n`
  }

  if (isActive) {
    description += `🕒 ينتهي: <t:${endTs}:R> (<t:${endTs}:F>)\n`
    description += `🏅 عدد الفائزين: **${giveaway.winner_count}**\n`
    description += `👥 المشاركون: **${entryCount}**\n`
    description += `👤 مقدّم بواسطة: <@${giveaway.host_id}>\n`

    // الشروط
    const reqs = []
    if (giveaway.required_role) reqs.push(`<@&${giveaway.required_role}>`)
    if (giveaway.required_level > 0) reqs.push(`المستوى ${giveaway.required_level}+`)
    if (reqs.length > 0) {
      description += `\n📋 **الشروط:** ${reqs.join(" + ")}`
    }
  } else if (isEnded) {
    const winners = Array.isArray(giveaway.winners) ? giveaway.winners : []
    if (winners.length === 0) {
      description += `❌ لا يوجد فائزون (لم يشارك أحد أو لم تتحقق الشروط).\n`
    } else {
      description += `🏆 **الفائزون:**\n${winners.map(id => `• <@${id}>`).join("\n")}\n`
    }
    description += `\n👥 إجمالي المشاركين: **${entryCount}**`
  } else if (isCancelled) {
    description += `هذا السحب تم إلغاؤه.`
  }

  embed.setDescription(description)
  return embed
}

function buildGiveawayButton(giveawayId, status = "active") {
  const button = new ButtonBuilder()
    .setCustomId(`giveaway_join_${giveawayId}`)
    .setLabel("اشتراك في السحب")
    .setEmoji(BUTTON_EMOJI)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(status !== "active")

  return new ActionRowBuilder().addComponents(button)
}

// ──────────────────────────────────────────────────────────────────
//  Create giveaway
// ──────────────────────────────────────────────────────────────────

async function createGiveaway({
  guild,
  channelId,
  hostId,
  prize,
  description = null,
  winnerCount = 1,
  durationMs,
  requiredRole = null,
  requiredLevel = 0
}) {
  if (!guild || !channelId || !hostId || !prize) {
    throw new Error("بيانات السحب ناقصة")
  }

  const channel = guild.channels.cache.get(channelId)
  if (!channel?.isTextBased?.()) {
    throw new Error("القناة غير صالحة")
  }

  const botMember = guild.members.me
  if (!botMember?.permissionsIn(channel)?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
    throw new Error("البوت ما عنده صلاحيات في القناة")
  }

  const endAt = new Date(Date.now() + durationMs)

  // ─── 1) أنشئ في DB ───
  const result = await databaseSystem.query(
    `INSERT INTO giveaways
       (guild_id, channel_id, host_id, prize, description, winner_count,
        end_at, required_role, required_level, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
     RETURNING *`,
    [
      guild.id,
      channelId,
      hostId,
      prize.slice(0, 200),
      description ? description.slice(0, 1000) : null,
      Math.max(1, Math.min(parseInt(winnerCount) || 1, 20)),
      endAt,
      requiredRole,
      Math.max(0, parseInt(requiredLevel) || 0)
    ]
  )

  const giveaway = result.rows[0]

  // ─── 2) أرسل embed ───
  try {
    const embed = buildGiveawayEmbed(giveaway, 0)
    const row = buildGiveawayButton(giveaway.id)

    const msg = await channel.send({
      embeds: [embed],
      components: [row]
    })

    // ─── 3) احفظ message_id ───
    await databaseSystem.query(
      "UPDATE giveaways SET message_id = $1 WHERE id = $2",
      [msg.id, giveaway.id]
    )

    giveaway.message_id = msg.id

    logger.info("GIVEAWAY_CREATED", {
      id: giveaway.id,
      guildId: guild.id,
      prize: giveaway.prize
    })

    return giveaway
  } catch (err) {
    // ROLLBACK — احذف من DB لو فشل الإرسال
    await databaseSystem.query("DELETE FROM giveaways WHERE id = $1", [giveaway.id])
    throw new Error(`فشل إرسال السحب: ${err.message}`)
  }
}

// ──────────────────────────────────────────────────────────────────
//  Enter giveaway (لما العضو يضغط الزر)
// ──────────────────────────────────────────────────────────────────

async function enterGiveaway(giveawayId, member) {
  try {
    const giveaway = await databaseSystem.queryOne(
      "SELECT * FROM giveaways WHERE id = $1",
      [giveawayId]
    )

    if (!giveaway) {
      return { ok: false, reason: "السحب غير موجود" }
    }

    if (giveaway.status !== "active") {
      return { ok: false, reason: "السحب انتهى" }
    }

    if (new Date(giveaway.end_at).getTime() <= Date.now()) {
      return { ok: false, reason: "السحب انتهى" }
    }

    // ─── شرط الرتبة ───
    if (giveaway.required_role) {
      const hasRole = member.roles.cache.has(giveaway.required_role)
      if (!hasRole) {
        return {
          ok: false,
          reason: `يلزم رتبة <@&${giveaway.required_role}> للمشاركة`
        }
      }
    }

    // ─── شرط المستوى ───
    if (giveaway.required_level > 0) {
      try {
        const xpRow = await databaseSystem.queryOne(
          "SELECT level FROM xp WHERE user_id = $1 AND guild_id = $2",
          [member.id, member.guild.id]
        )
        const level = parseInt(xpRow?.level) || 0
        if (level < giveaway.required_level) {
          return {
            ok: false,
            reason: `يلزم المستوى ${giveaway.required_level}+ للمشاركة (مستواك الحالي ${level})`
          }
        }
      } catch {
        // لو جدول xp مش موجود، نتجاوز الشرط (ما نمنع المشاركة)
      }
    }

    // ─── سجّل المشاركة ───
    const insertResult = await databaseSystem.query(
      `INSERT INTO giveaway_entries (giveaway_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (giveaway_id, user_id) DO NOTHING
       RETURNING id`,
      [giveawayId, member.id]
    )

    if (insertResult.rows.length === 0) {
      // المستخدم مشارك أصلاً → اسحب مشاركته (toggle)
      await databaseSystem.query(
        "DELETE FROM giveaway_entries WHERE giveaway_id = $1 AND user_id = $2",
        [giveawayId, member.id]
      )
      return { ok: true, toggled: "removed" }
    }

    return { ok: true, toggled: "added" }
  } catch (err) {
    logger.error("GIVEAWAY_ENTER_FAILED", { error: err.message })
    return { ok: false, reason: "حدث خطأ، حاول مرة ثانية" }
  }
}

// ──────────────────────────────────────────────────────────────────
//  Pick winners (random sampling without replacement)
// ──────────────────────────────────────────────────────────────────

function pickWinners(userIds, count) {
  if (!Array.isArray(userIds) || userIds.length === 0) return []
  if (count >= userIds.length) return [...userIds]

  const pool = [...userIds]
  const winners = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    winners.push(pool[idx])
    pool.splice(idx, 1)
  }
  return winners
}

// ──────────────────────────────────────────────────────────────────
//  End giveaway (manually or automatically)
// ──────────────────────────────────────────────────────────────────

async function endGiveaway(giveawayId, options = {}) {
  try {
    const giveaway = await databaseSystem.queryOne(
      "SELECT * FROM giveaways WHERE id = $1",
      [giveawayId]
    )

    if (!giveaway) return { ok: false, reason: "السحب غير موجود" }

    if (giveaway.status !== "active") {
      return { ok: false, reason: "السحب أنهي بالفعل أو أُلغي" }
    }

    // ─── جلب المشاركين ───
    const entriesResult = await databaseSystem.query(
      "SELECT user_id FROM giveaway_entries WHERE giveaway_id = $1",
      [giveawayId]
    )
    const entries = (entriesResult.rows || []).map(r => r.user_id)

    // ─── اختر الفائزين ───
    const winners = pickWinners(entries, giveaway.winner_count)

    // ─── حدّث DB ───
    await databaseSystem.query(
      `UPDATE giveaways SET
         status = 'ended',
         winners = $1::jsonb,
         ended_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(winners), giveawayId]
    )

    giveaway.status = "ended"
    giveaway.winners = winners
    giveaway.ended_at = new Date()

    // ─── حدّث رسالة Discord ───
    if (_client && giveaway.message_id && giveaway.channel_id) {
      try {
        const guild = _client.guilds.cache.get(giveaway.guild_id)
        if (guild) {
          const channel = guild.channels.cache.get(giveaway.channel_id)
          if (channel) {
            const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null)
            if (msg) {
              const embed = buildGiveawayEmbed(giveaway, entries.length)
              const row = buildGiveawayButton(giveaway.id, "ended")
              await msg.edit({ embeds: [embed], components: [row] }).catch(() => {})
            }

            // ─── إشعار الفائزين ───
            if (winners.length > 0) {
              const mentions = winners.map(id => `<@${id}>`).join(" ")
              await channel.send({
                content: `🎉 **مبروك ${mentions}!** فزتم بـ **${giveaway.prize}** — تواصلوا مع <@${giveaway.host_id}>`,
                allowedMentions: { users: winners }
              }).catch(() => {})
            } else {
              await channel.send({
                content: `❌ لا يوجد فائزون في سحب **${giveaway.prize}** — لم يشارك أحد أو لم تتحقق الشروط.`
              }).catch(() => {})
            }
          }
        }
      } catch (err) {
        logger.error("GIVEAWAY_END_DISCORD_UPDATE_FAILED", { error: err.message })
      }
    }

    logger.info("GIVEAWAY_ENDED", {
      id: giveawayId,
      entries: entries.length,
      winners: winners.length
    })

    return { ok: true, winners, entryCount: entries.length }
  } catch (err) {
    logger.error("GIVEAWAY_END_FAILED", { error: err.message })
    return { ok: false, reason: "حدث خطأ في إنهاء السحب" }
  }
}

// ──────────────────────────────────────────────────────────────────
//  Cancel giveaway (لا فائزين)
// ──────────────────────────────────────────────────────────────────

async function cancelGiveaway(giveawayId) {
  try {
    const giveaway = await databaseSystem.queryOne(
      "SELECT * FROM giveaways WHERE id = $1",
      [giveawayId]
    )

    if (!giveaway) return { ok: false, reason: "السحب غير موجود" }
    if (giveaway.status !== "active") {
      return { ok: false, reason: "السحب أُنهي أو أُلغي بالفعل" }
    }

    await databaseSystem.query(
      `UPDATE giveaways SET
         status = 'cancelled',
         ended_at = NOW()
       WHERE id = $1`,
      [giveawayId]
    )

    giveaway.status = "cancelled"

    // ─── حدّث رسالة Discord ───
    if (_client && giveaway.message_id && giveaway.channel_id) {
      try {
        const guild = _client.guilds.cache.get(giveaway.guild_id)
        const channel = guild?.channels?.cache?.get(giveaway.channel_id)
        const msg = await channel?.messages?.fetch(giveaway.message_id).catch(() => null)
        if (msg) {
          const entriesResult = await databaseSystem.query(
            "SELECT COUNT(*)::int AS c FROM giveaway_entries WHERE giveaway_id = $1",
            [giveawayId]
          )
          const entryCount = entriesResult.rows[0]?.c || 0
          const embed = buildGiveawayEmbed(giveaway, entryCount)
          const row = buildGiveawayButton(giveaway.id, "cancelled")
          await msg.edit({ embeds: [embed], components: [row] }).catch(() => {})
        }
      } catch {}
    }

    logger.info("GIVEAWAY_CANCELLED", { id: giveawayId })
    return { ok: true }
  } catch (err) {
    logger.error("GIVEAWAY_CANCEL_FAILED", { error: err.message })
    return { ok: false, reason: "حدث خطأ" }
  }
}

// ──────────────────────────────────────────────────────────────────
//  Reroll (اعادة اختيار فائز جديد)
// ──────────────────────────────────────────────────────────────────

async function rerollGiveaway(giveawayId, count = 1) {
  try {
    const giveaway = await databaseSystem.queryOne(
      "SELECT * FROM giveaways WHERE id = $1",
      [giveawayId]
    )

    if (!giveaway) return { ok: false, reason: "السحب غير موجود" }
    if (giveaway.status !== "ended") {
      return { ok: false, reason: "السحب لم ينتهِ بعد — لا يمكن إعادة السحب" }
    }

    // ─── جلب المشاركين + استبعاد الفائزين السابقين ───
    const entriesResult = await databaseSystem.query(
      "SELECT user_id FROM giveaway_entries WHERE giveaway_id = $1",
      [giveawayId]
    )
    const allEntries = (entriesResult.rows || []).map(r => r.user_id)
    const previousWinners = Array.isArray(giveaway.winners) ? giveaway.winners : []

    const eligible = allEntries.filter(id => !previousWinners.includes(id))
    if (eligible.length === 0) {
      return { ok: false, reason: "لا يوجد مشاركون آخرون لإعادة السحب" }
    }

    const newWinners = pickWinners(eligible, count)
    const allWinners = [...previousWinners, ...newWinners]

    await databaseSystem.query(
      `UPDATE giveaways SET
         winners = $1::jsonb,
         reroll_count = reroll_count + 1
       WHERE id = $2`,
      [JSON.stringify(allWinners), giveawayId]
    )

    // ─── أعلن في القناة ───
    if (_client && giveaway.channel_id) {
      try {
        const guild = _client.guilds.cache.get(giveaway.guild_id)
        const channel = guild?.channels?.cache?.get(giveaway.channel_id)
        if (channel) {
          const mentions = newWinners.map(id => `<@${id}>`).join(" ")
          await channel.send({
            content: `🎲 **إعادة سحب لـ ${giveaway.prize}**\n🎉 الفائز(ون) الجدد: ${mentions} — مبروك!`,
            allowedMentions: { users: newWinners }
          }).catch(() => {})
        }
      } catch {}
    }

    logger.info("GIVEAWAY_REROLLED", {
      id: giveawayId,
      newWinners: newWinners.length
    })

    return { ok: true, newWinners }
  } catch (err) {
    logger.error("GIVEAWAY_REROLL_FAILED", { error: err.message })
    return { ok: false, reason: "حدث خطأ في إعادة السحب" }
  }
}

// ──────────────────────────────────────────────────────────────────
//  Update entry count in message (live)
// ──────────────────────────────────────────────────────────────────

async function refreshGiveawayMessage(giveawayId) {
  try {
    const giveaway = await databaseSystem.queryOne(
      "SELECT * FROM giveaways WHERE id = $1",
      [giveawayId]
    )
    if (!giveaway || giveaway.status !== "active") return
    if (!_client || !giveaway.message_id) return

    const guild = _client.guilds.cache.get(giveaway.guild_id)
    if (!guild) return
    const channel = guild.channels.cache.get(giveaway.channel_id)
    if (!channel) return

    const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null)
    if (!msg) return

    const r = await databaseSystem.query(
      "SELECT COUNT(*)::int AS c FROM giveaway_entries WHERE giveaway_id = $1",
      [giveawayId]
    )
    const count = r.rows[0]?.c || 0

    const embed = buildGiveawayEmbed(giveaway, count)
    const row = buildGiveawayButton(giveaway.id, "active")
    await msg.edit({ embeds: [embed], components: [row] }).catch(() => {})
  } catch {}
}

// ──────────────────────────────────────────────────────────────────
//  Tick — يفحص السحوبات المنتهية كل 30 ثانية
// ──────────────────────────────────────────────────────────────────

async function tick() {
  if (!_client?.isReady?.()) return

  try {
    const r = await databaseSystem.query(
      `SELECT id FROM giveaways
       WHERE status = 'active' AND end_at <= NOW()
       LIMIT 50`
    )

    for (const row of r.rows || []) {
      await endGiveaway(row.id)
    }
  } catch (err) {
    logger.error("GIVEAWAY_TICK_FAILED", { error: err.message })
  }
}

// ──────────────────────────────────────────────────────────────────
//  Start scheduler
// ──────────────────────────────────────────────────────────────────

function startScheduler(client) {
  _client = client
  scheduler.register("giveaway-tick", CHECK_INTERVAL, tick, false)
  logger.info("GIVEAWAY_SCHEDULER_STARTED")
}

// ──────────────────────────────────────────────────────────────────
//  Listing helpers
// ──────────────────────────────────────────────────────────────────

async function getActiveGiveaways(guildId, limit = 25) {
  try {
    const r = await databaseSystem.query(
      `SELECT g.*,
              COALESCE((SELECT COUNT(*) FROM giveaway_entries e
                        WHERE e.giveaway_id = g.id), 0)::int AS entry_count
       FROM giveaways g
       WHERE g.guild_id = $1 AND g.status = 'active'
       ORDER BY g.end_at ASC
       LIMIT $2`,
      [guildId, limit]
    )
    return r.rows || []
  } catch {
    return []
  }
}

async function getGiveaway(giveawayId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM giveaways WHERE id = $1",
    [giveawayId]
  )
}

// ──────────────────────────────────────────────────────────────────
//  Exports
// ──────────────────────────────────────────────────────────────────

module.exports = {
  createGiveaway,
  enterGiveaway,
  endGiveaway,
  cancelGiveaway,
  rerollGiveaway,
  refreshGiveawayMessage,
  getActiveGiveaways,
  getGiveaway,
  startScheduler,
  buildGiveawayEmbed,
  buildGiveawayButton
}