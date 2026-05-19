/**
 * ═══════════════════════════════════════════════════════════
 *  Alias Suggestions — اقتراحات اختصارات ذكية لكل أمر
 *
 *  تُستخدم في placeholder حقل الـ aliases في AliasesInput
 *  لتعرض للمستخدم أمثلة مناسبة للأمر الذي يعدّله.
 * ═══════════════════════════════════════════════════════════
 */

const ALIAS_SUGGESTIONS = {
  // ─── moderation ───
  'حظر':              ['ban', 'b'],
  'فك_الحظر':         ['unban', 'ub'],
  'طرد':              ['kick', 'k'],
  'اسكت':             ['mute', 'm'],
  'فك_الكتم':         ['unmute', 'um'],
  'مسح':              ['clear', 'c'],
  'تحذير':            ['warn', 'w'],
  'التحذيرات':        ['warns', 'warnings'],
  'مسح_التحذيرات':   ['clearwarns', 'cw'],
  'قفل':              ['lock', 'l'],
  'فتح':              ['unlock', 'ul'],
  'بطيء':             ['slow', 'slowmode'],
  'لقب':              ['nick', 'nickname'],
  'رتبة':             ['role', 'r'],

  // ─── economy ───
  'رصيد':             ['balance', 'bal'],
  'يومي':             ['daily', 'd'],
  'عمل':              ['work', 'job'],
  'متجر':             ['shop', 'store'],
  'شراء':             ['buy', 'purchase'],
  'بيع':              ['sell'],
  'ممتلكاتي':         ['inv', 'inventory'],
  'تحويل':            ['pay', 'transfer'],
  'متصدرين':          ['rich', 'top'],

  // ─── level ───
  'مستوى':            ['rank', 'level'],
  'متصدرين_xp':       ['leaderboard', 'lb'],
  'بطاقتي':           ['card', 'mycard'],

  // ─── info ───
  'مساعدة':           ['help', 'h'],
  'بوت':              ['bot', 'botinfo'],
  'السيرفر':          ['server', 'serverinfo'],
  'معلومات':          ['user', 'userinfo'],
  'صورة':             ['avatar', 'av'],

  // ─── ai ───
  'ذكاء':             ['ai', 'ask'],

  // ─── admin ───
  'الإعدادات':        ['settings', 'config'],
  'ضبط':              ['setup', 's'],
  'إعلان':            ['announce', 'ann'],

  // ─── logs ───
  'لوق':              ['log', 'logs'],
  'ضبط_لوق':         ['setlog', 'sl'],
  'تحقق_لوحة':       ['verify', 'verification'],

  // ─── protection / automod / welcome / tickets / roles / events / giveaway / stats ───
  'حماية':            ['protect', 'guard'],
  'إشراف':            ['automod', 'mod'],
  'ترحيب':            ['welcome', 'welc'],
  'تذاكر':            ['ticket', 'tickets'],
  'فعالية-إنشاء':     ['event', 'newevent'],
  'فعالية-عرض':       ['eventview', 'ev'],
  'فعالية-قائمة':     ['eventlist', 'el'],
  'فعالية-حضور':      ['attendees', 'att'],
  'فعالية-بدء':       ['eventstart', 'es'],
  'فعالية-إنهاء':     ['eventend', 'ee'],
  'فعالية-إلغاء':     ['eventcancel', 'ec'],
  'فعالية-تذكير':     ['eventremind', 'er'],
  'سحب':              ['giveaway', 'gw'],
  'إحصائيات':         ['stats', 'st'],
}

/**
 * يرجّع اقتراحات الـ aliases لأمر معيّن
 * @param {string} commandName - اسم الأمر
 * @returns {string[]} - مصفوفة من الاقتراحات (مثل ['ban', 'b'])
 */
export function getAliasSuggestions(commandName) {
  return ALIAS_SUGGESTIONS[commandName] || []
}

/**
 * يبني نص placeholder من الاقتراحات
 * @param {string} commandName - اسم الأمر
 * @returns {string} - نص الـ placeholder
 */
export function getAliasPlaceholder(commandName) {
  const suggestions = getAliasSuggestions(commandName)
  if (suggestions.length === 0) {
    return 'اكتب اختصار واضغط Enter'
  }
  if (suggestions.length === 1) {
    return `اكتب اختصار — مثلاً: ${suggestions[0]}`
  }
  return `اكتب اختصار — مثلاً: ${suggestions[0]} أو !${suggestions[1]}`
}