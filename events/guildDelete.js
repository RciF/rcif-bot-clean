// ══════════════════════════════════════════════════════════════════
//  guildDelete Event
//  المسار: events/guildDelete.js
//
//  يُستدعى لما البوت يطلع/يطرد من سيرفر.
//
//  السلوك:
//   - يسجّل في الـ logs (للمراقبة)
//   - ⚠️ ما يحذف البيانات تلقائياً (نخليها لو رجع البوت)
//   - الداش فيه زر "مسح بيانات السيرفر" للمستخدم
//
//  لماذا ما نحذف تلقائياً؟
//   - لو طُرد البوت بالخطأ، البيانات تبقى لما يرجع
//   - لو السيرفر اشترى Gold/Diamond، إعداداته ثمينة
//   - التنظيف الأوتوماتيكي عرضة للأخطاء
// ══════════════════════════════════════════════════════════════════

const logger = require("../systems/loggerSystem")

module.exports = {
  name: "guildDelete",

  async execute(guild) {
    try {
      logger.warn("GUILD_LEFT", {
        name: guild?.name || "unknown",
        id: guild?.id || "unknown",
        memberCount: guild?.memberCount || 0,
      })

      // ⚠️ ملاحظة: لا نحذف البيانات تلقائياً
      // البيانات تبقى في القاعدة لو رجع البوت
      // المستخدم يقدر يمسحها يدوياً من الداش
    } catch (err) {
      logger.error("GUILD_DELETE_EVENT_FAILED", { error: err.message })
    }
  },
}