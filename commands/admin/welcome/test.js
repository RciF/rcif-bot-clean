// ══════════════════════════════════════════════════════════════════
//  /ترحيب اختبار — اختبار رسالة الترحيب
//  المسار: commands/admin/welcome/test.js
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../../../systems/databaseSystem")

module.exports = async function handleTest(interaction, guildId) {
  const settings = await databaseSystem.queryOne(
    "SELECT * FROM welcome_settings WHERE guild_id = $1",
    [guildId]
  )

  if (!settings) {
    return interaction.reply({
      content: "❌ اضبط الإعدادات أولاً بـ /ترحيب ضبط",
      ephemeral: true
    })
  }

  // تشغيل event الـ guildMemberAdd يدوياً للاختبار
  const memberAddEvent = require("../../../events/logs/guildMemberAdd")
  await memberAddEvent.execute(interaction.member, interaction.client)

  return interaction.reply({
    content: "✅ تم إرسال رسالة اختبار!",
    ephemeral: true
  })
}