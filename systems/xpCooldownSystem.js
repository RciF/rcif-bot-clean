// systems/xpCooldownSystem.js
// ═══════════════════════════════════════════════════════════
//  XP Cooldown System — طبقة كولداون أولية (advisory)
//  ═════════════════════════════════════════════════════════
//  هذا الكولداون يطبق على مستوى المستخدم العالمي (بدون guild_id)
//  ويعمل كحماية أولى لتقليل الحمل قبل ما نوصل لـ levelSystem.
//  الكولداون الفعلي per-guild موجود في levelSystem.addXP.
//
//  لاحظ: الكولداون هنا قصير (5 ثوانٍ) عشان ما يمنع المستخدم
//  من كسب XP في سيرفرات مختلفة بنفس الوقت.
// ═══════════════════════════════════════════════════════════

const scheduler = require("./schedulerSystem")

const cooldowns = new Map()
const COOLDOWN = 5 * 1000 // 5 ثوانٍ — حماية أولية فقط
const MAX_ENTRIES = 10000

// ✅ FIX: cleanup تلقائي عبر scheduler
scheduler.register(
  "xp-cooldown-system-cleanup",
  5 * 60 * 1000, // كل 5 دقائق
  () => {
    const now = Date.now()

    for (const [userId, lastTime] of cooldowns.entries()) {
      if (now - lastTime > 60 * 1000) {
        cooldowns.delete(userId)
      }
    }

    // safety net
    if (cooldowns.size > MAX_ENTRIES) {
      cooldowns.clear()
    }
  },
  false
)

function canGainXP(userId) {
    const now = Date.now()

    if (!cooldowns.has(userId)) {
        cooldowns.set(userId, now)
        return true
    }

    const lastXP = cooldowns.get(userId)

    if (now - lastXP < COOLDOWN) {
        return false
    }

    cooldowns.set(userId, now)
    return true
}

module.exports = {
    canGainXP
}