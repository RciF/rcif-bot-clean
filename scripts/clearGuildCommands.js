require("dotenv").config()

const { REST, Routes } = require("discord.js")

const TOKEN     = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID  = process.env.GUILD_ID

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ DISCORD_TOKEN, CLIENT_ID, GUILD_ID مطلوبين في .env")
  process.exit(1)
}

const rest = new REST({ version: "10" }).setToken(TOKEN)

;(async () => {
  try {
    console.log(`\n🗑️  جاري حذف كل أوامر السيرفر: ${GUILD_ID}\n`)

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    )

    console.log("✅ تم حذف كل أوامر الـ guild بنجاح")
    console.log("⚡ الأوامر العالمية (global) راح تبقى موجودة")
    console.log("\nℹ️  لو تبي تعيد النشر: node scripts/deployCommands.js\n")

  } catch (error) {
    console.error("❌ فشل حذف الأوامر:", error)
    process.exit(1)
  }
})()