/**
 * ═══════════════════════════════════════════════════════════
 *  Command Aliases — Usage Tracker
 *
 *  مسؤول عن:
 *  - إخبار الداشبورد إن أمر استخدم في سيرفر معيّن
 *  - يُستخدم لـ /commands/leaderboard
 *
 *  ⚠️ غير محظور (non-blocking) — لا نوقف تنفيذ الأمر
 *
 *  endpoint المستخدم:
 *    POST /api/bot/guild/:guildId/track-usage
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  trackUsage
//  يرسل إشعار للداشبورد بإن أمر استخدم
// ════════════════════════════════════════════════════════════

async function trackUsage(guildId, commandName) {
  if (!guildId || !commandName) return

  const dashUrl = process.env.DASHBOARD_URL || "http://localhost:4000"
  const botSecret = process.env.BOT_SECRET || ""

  if (!botSecret) return

  try {
    await fetch(`${dashUrl}/api/bot/guild/${guildId}/track-usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": botSecret,
      },
      body: JSON.stringify({ command_name: commandName }),
      signal: AbortSignal.timeout(2000),
    }).catch(() => {})
  } catch {
    // تجاهل تماماً — هذا للـ analytics فقط
  }
}

module.exports = {
  trackUsage,
}