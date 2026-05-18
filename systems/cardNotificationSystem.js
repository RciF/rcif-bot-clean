// ══════════════════════════════════════════════════════════════════
//  CARD NOTIFICATION SYSTEM
//  المسار: systems/cardNotificationSystem.js
//
//  مسؤول عن إرسال DM للمستخدمين لكل أحداث الاشتراك:
//   - subscription_approved   : طلب اشتراك تمت الموافقة عليه
//   - subscription_rejected   : طلب اشتراك مرفوض
//   - subscription_extended   : تمديد يدوي من الأدمن
//   - subscription_gifted     : هدية اشتراك من الأدمن
//   - subscription_cancelled  : إلغاء اشتراك
//   - tier_changed            : تغيير الفئة
//   - subscription_expiring   : قارب على الانتهاء (تنبيه)
//
//  يستدعى من routes/cardSync.js عند استقبال إشعار من الداشبورد
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

// ══════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://rcif-dashboard.onrender.com"

const TIER_DATA = {
  free:      { name: "مجاني",    icon: "🆓", color: 0x64748b },
  basic:     { name: "أساسية",   icon: "🥉", color: 0xcd7f32 },
  advanced:  { name: "متقدمة",   icon: "🥈", color: 0xc0c0c0 },
  legendary: { name: "أسطورية", icon: "👑", color: 0xffd700 },
}

const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6,
  gift:    0xec4899,
  legend:  0xffd700,
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function dashboardButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("🌐 افتح الداشبورد")
      .setStyle(ButtonStyle.Link)
      .setURL(`${DASHBOARD_URL}/dashboard/card`)
  )
}

function subscriptionButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("✨ اشترك من جديد")
      .setStyle(ButtonStyle.Link)
      .setURL(`${DASHBOARD_URL}/dashboard/card/subscription`)
  )
}

function formatDate(date) {
  if (!date) return "غير محدد"
  const d = new Date(date)
  return `<t:${Math.floor(d.getTime() / 1000)}:F>`
}

function formatRelative(date) {
  if (!date) return "غير محدد"
  const d = new Date(date)
  return `<t:${Math.floor(d.getTime() / 1000)}:R>`
}

async function fetchUser(client, userId) {
  if (!client) return null

  try {
    let user = client.users.cache.get(userId)
    if (!user) user = await client.users.fetch(userId).catch(() => null)
    return user
  } catch {
    return null
  }
}

async function sendDM(client, userId, payload) {
  const user = await fetchUser(client, userId)
  if (!user) {
    logger.warn("CARD_DM_USER_NOT_FOUND", { userId })
    return { ok: false, error: "user_not_found" }
  }

  try {
    await user.send(payload)
    return { ok: true }
  } catch (err) {
    // المستخدم مغلق الـ DMs أو حاظر البوت
    logger.warn("CARD_DM_SEND_FAILED", {
      userId,
      error: err.message,
      code: err.code
    })
    return { ok: false, error: err.message, code: err.code }
  }
}

async function markNotificationSent(userId, action) {
  try {
    await databaseSystem.query(
      `UPDATE card_subscription_logs
       SET notification_sent = TRUE, notification_sent_at = NOW()
       WHERE id = (
         SELECT id FROM card_subscription_logs
         WHERE user_id = $1 AND action = $2 AND notification_sent = FALSE
         ORDER BY created_at DESC
         LIMIT 1
       )`,
      [userId, action]
    )
  } catch (err) {
    logger.error("CARD_NOTIFICATION_MARK_FAILED", { userId, action, error: err.message })
  }
}

// ══════════════════════════════════════════════════════════════════
//  EVENT HANDLERS
// ══════════════════════════════════════════════════════════════════

/**
 * طلب اشتراك تمت الموافقة عليه
 *
 * payload: { tier, duration, expires_at, amount }
 */
async function notifyApproved(client, userId, payload) {
  const { tier, duration, expires_at, amount } = payload
  const tierData = TIER_DATA[tier] || TIER_DATA.basic

  const embed = new EmbedBuilder()
    .setColor(tierData.color)
    .setTitle(`✅ تم تفعيل اشتراكك ${tierData.icon}`)
    .setDescription(
      `مبروك! تم تفعيل اشتراك **${tierData.name}** لتخصيص بطاقة المستوى الخاصة بك.\n\n` +
      `ادخل على الداشبورد لاختيار الخلفية والألوان والشارات.`
    )
    .addFields(
      { name: "🎯 الفئة",     value: `${tierData.icon} ${tierData.name}`,             inline: true },
      { name: "📅 المدة",      value: duration === "yearly" ? "سنوي" : "شهري", inline: true },
      { name: "💵 المبلغ",     value: `$${amount}`,                              inline: true },
      { name: "⏱️ ينتهي في",  value: formatDate(expires_at),                    inline: false }
    )
    .setFooter({ text: "شكراً لاشتراكك في Lyn Premium ✨" })
    .setTimestamp()

  return await sendDM(client, userId, {
    embeds: [embed],
    components: [dashboardButton()]
  })
}

/**
 * طلب اشتراك مرفوض
 *
 * payload: { tier, reason }
 */
async function notifyRejected(client, userId, payload) {
  const { tier, reason } = payload
  const tierData = TIER_DATA[tier] || TIER_DATA.basic

  const embed = new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle("❌ تم رفض طلب الاشتراك")
    .setDescription(
      `للأسف، طلب اشتراكك في فئة **${tierData.name}** تم رفضه.\n\n` +
      (reason ? `**السبب:** ${reason}` : "لم يُذكر سبب محدد.") +
      `\n\nيمكنك إرسال طلب جديد من الداشبورد بعد التأكد من بيانات الدفع.`
    )
    .setFooter({ text: "للاستفسار تواصل مع إدارة البوت" })
    .setTimestamp()

  return await sendDM(client, userId, {
    embeds: [embed],
    components: [subscriptionButton()]
  })
}

/**
 * تمديد يدوي من الأدمن
 *
 * payload: { days, tier, old_expires_at, new_expires_at, reason }
 */
async function notifyExtended(client, userId, payload) {
  const { days, tier, old_expires_at, new_expires_at, reason } = payload
  const tierData = TIER_DATA[tier] || TIER_DATA.basic

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`🎁 تم تمديد اشتراكك ${tierData.icon}`)
    .setDescription(
      `الإدارة قررت تمديد اشتراكك في فئة **${tierData.name}** بـ **${days}** ${days === 1 ? "يوم" : "أيام"} إضافية!\n\n` +
      (reason ? `**السبب:** ${reason}` : "")
    )
    .addFields(
      { name: "🎯 الفئة",          value: `${tierData.icon} ${tierData.name}`,        inline: true },
      { name: "➕ الأيام المضافة", value: `**${days}** ${days === 1 ? "يوم" : "أيام"}`, inline: true },
      { name: "⏱️ ينتهي في",      value: formatDate(new_expires_at),                inline: false }
    )
    .setFooter({ text: "شكراً لكونك جزءاً من Lyn Premium ✨" })
    .setTimestamp()

  return await sendDM(client, userId, {
    embeds: [embed],
    components: [dashboardButton()]
  })
}

/**
 * هدية اشتراك من الأدمن
 *
 * payload: { tier, days, expires_at, reason }
 */
async function notifyGifted(client, userId, payload) {
  const { tier, days, expires_at, reason } = payload
  const tierData = TIER_DATA[tier] || TIER_DATA.basic

  const isLegendary = tier === "legendary"

  const embed = new EmbedBuilder()
    .setColor(isLegendary ? COLORS.legend : COLORS.gift)
    .setTitle(`🎁 تهانينا! حصلت على اشتراك مجاني ${tierData.icon}`)
    .setDescription(
      `مبروك! حصلت على هدية اشتراك من إدارة Lyn — فئة **${tierData.name}**!\n\n` +
      (reason ? `**السبب:** ${reason}\n\n` : "") +
      `استمتع بكل ميزات الفئة لمدة **${days}** ${days === 1 ? "يوم" : "أيام"}.\n` +
      `ادخل الداشبورد الآن لتخصيص بطاقتك! ✨`
    )
    .addFields(
      { name: "🎯 الفئة",      value: `${tierData.icon} ${tierData.name}`, inline: true },
      { name: "⏱️ المدة",       value: `${days} ${days === 1 ? "يوم" : "أيام"}`, inline: true },
      { name: "📅 ينتهي في",   value: formatDate(expires_at),               inline: false }
    )
    .setFooter({ text: "هدية من إدارة Lyn 💜" })
    .setTimestamp()

  // ─── شارة خاصة للأسطورية ───
  if (isLegendary) {
    embed.setThumbnail("https://i.imgur.com/legend-badge.png")
  }

  return await sendDM(client, userId, {
    embeds: [embed],
    components: [dashboardButton()]
  })
}

/**
 * إلغاء اشتراك
 *
 * payload: { tier, reason }
 */
async function notifyCancelled(client, userId, payload) {
  const { tier, reason } = payload
  const tierData = TIER_DATA[tier] || TIER_DATA.basic

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle("⚠️ تم إلغاء اشتراكك")
    .setDescription(
      `تم إلغاء اشتراكك في فئة **${tierData.name}**.\n\n` +
      (reason ? `**السبب:** ${reason}\n\n` : "") +
      `بطاقتك راح ترجع للشكل الافتراضي.\n` +
      `لو عندك أي استفسار، تواصل مع إدارة البوت.`
    )
    .setFooter({ text: "تقدر تشترك مرة ثانية في أي وقت" })
    .setTimestamp()

  return await sendDM(client, userId, {
    embeds: [embed],
    components: [subscriptionButton()]
  })
}

/**
 * تغيير الفئة (ترقية أو تخفيض)
 *
 * payload: { old_tier, new_tier, is_upgrade, reason }
 */
async function notifyTierChanged(client, userId, payload) {
  const { old_tier, new_tier, is_upgrade, reason } = payload
  const oldData = TIER_DATA[old_tier] || TIER_DATA.basic
  const newData = TIER_DATA[new_tier] || TIER_DATA.basic

  const embed = new EmbedBuilder()
    .setColor(is_upgrade ? COLORS.success : COLORS.warning)
    .setTitle(is_upgrade ? "📈 تمت ترقية اشتراكك!" : "📉 تم تخفيض اشتراكك")
    .setDescription(
      is_upgrade
        ? `مبروك! تمت ترقيتك من **${oldData.name}** إلى **${newData.name}** ${newData.icon}\n\n` +
          (reason ? `**السبب:** ${reason}\n\n` : "") +
          `استكشف المميزات الجديدة المتاحة لك من الداشبورد!`
        : `تم تخفيض اشتراكك من **${oldData.name}** إلى **${newData.name}** ${newData.icon}\n\n` +
          (reason ? `**السبب:** ${reason}\n\n` : "") +
          `بعض المميزات قد لا تكون متاحة لك حالياً.`
    )
    .addFields(
      { name: "🔻 الفئة السابقة", value: `${oldData.icon} ${oldData.name}`, inline: true },
      { name: "🔺 الفئة الجديدة", value: `${newData.icon} ${newData.name}`, inline: true }
    )
    .setTimestamp()

  return await sendDM(client, userId, {
    embeds: [embed],
    components: [dashboardButton()]
  })
}

/**
 * تنبيه: الاشتراك قارب على الانتهاء
 *
 * payload: { tier, days_left, expires_at }
 */
async function notifyExpiringSoon(client, userId, payload) {
  const { tier, days_left, expires_at } = payload
  const tierData = TIER_DATA[tier] || TIER_DATA.basic

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle("⏰ اشتراكك قارب على الانتهاء")
    .setDescription(
      `اشتراكك في فئة **${tierData.name}** ينتهي خلال **${days_left}** ${days_left === 1 ? "يوم" : "أيام"}.\n\n` +
      `جدّد اشتراكك قبل الانتهاء عشان ما تفقد التخصيصات!`
    )
    .addFields(
      { name: "🎯 الفئة",       value: `${tierData.icon} ${tierData.name}`, inline: true },
      { name: "⏱️ ينتهي",       value: formatRelative(expires_at),         inline: true }
    )
    .setTimestamp()

  return await sendDM(client, userId, {
    embeds: [embed],
    components: [subscriptionButton()]
  })
}

// ══════════════════════════════════════════════════════════════════
//  MAIN ENTRY — يُستدعى من routes/cardSync.js
// ══════════════════════════════════════════════════════════════════

/**
 * إرسال إشعار حسب نوع الحدث
 *
 * @param {Client} client - Discord.js client
 * @param {string} userId
 * @param {string} eventType - نوع الحدث
 * @param {object} payload - بيانات الحدث
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendNotification(client, userId, eventType, payload = {}) {
  try {
    let result

    switch (eventType) {
      case "subscription_approved":
        result = await notifyApproved(client, userId, payload)
        break

      case "subscription_rejected":
        result = await notifyRejected(client, userId, payload)
        break

      case "subscription_extended":
        result = await notifyExtended(client, userId, payload)
        break

      case "subscription_gifted":
        result = await notifyGifted(client, userId, payload)
        break

      case "subscription_cancelled":
        result = await notifyCancelled(client, userId, payload)
        break

      case "tier_changed":
        result = await notifyTierChanged(client, userId, payload)
        break

      case "subscription_expiring":
        result = await notifyExpiringSoon(client, userId, payload)
        break

      default:
        logger.warn("CARD_NOTIFICATION_UNKNOWN_TYPE", { eventType, userId })
        return { ok: false, error: "unknown_event_type" }
    }

    // ─── تسجيل الإشعار كمُرسل ───
    if (result.ok) {
      const actionMap = {
        subscription_approved:  "created",
        subscription_extended:  "extended",
        subscription_gifted:    "gifted",
        subscription_cancelled: "cancelled",
        tier_changed:           "upgraded",
        subscription_rejected:  null,
        subscription_expiring:  null,
      }

      const action = actionMap[eventType]
      if (action) {
        await markNotificationSent(userId, action)
      }
    }

    logger.info("CARD_NOTIFICATION_SENT", {
      userId,
      eventType,
      success: result.ok,
      error: result.error || null
    })

    return result
  } catch (err) {
    logger.error("CARD_NOTIFICATION_FAILED", {
      userId,
      eventType,
      error: err.message,
      stack: err.stack
    })
    return { ok: false, error: err.message }
  }
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = {
  sendNotification,

  // Individual handlers (للاستخدام المباشر لو احتجنا)
  notifyApproved,
  notifyRejected,
  notifyExtended,
  notifyGifted,
  notifyCancelled,
  notifyTierChanged,
  notifyExpiringSoon,
}