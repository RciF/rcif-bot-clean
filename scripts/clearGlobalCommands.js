require("dotenv").config()

const { REST, Routes } = require("discord.js")

const TOKEN     = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ DISCORD_TOKEN, CLIENT_ID مطلوبين في .env")
  process.exit(1)
}

const rest = new REST({ version: "10" }).setToken(TOKEN)

;(async () => {
  try {
    console.log(`\n🗑️  جاري حذف كل الأوامر العالمية (Global)...\n`)

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [] }
    )

    console.log("✅ تم حذف كل الأوامر العالمية بنجاح")
    console.log("⚠️  Discord يحتاج حتى ساعة عشان يحدّث الكاش")
    console.log("💡 سوي Ctrl+R في Discord لتحديث فوري")
    console.log("\nℹ️  لإعادة النشر: node scripts/deployCommands.js\n")

  } catch (error) {
    console.error("❌ فشل حذف الأوامر:", error)
    process.exit(1)
  }
})()