require("dotenv").config()

const { REST, Routes } = require("discord.js")
const fs = require("fs")
const path = require("path")

const TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID

// ✅ وضع النشر
// DEPLOY_MODE=guild   → فقط في GUILD_ID (أسرع — للتطوير والاختبار)
// DEPLOY_MODE=global  → عالمياً فقط (للإنتاج — بعد التأكد)
const DEPLOY_MODE = process.env.DEPLOY_MODE || "guild"

// ✅ تحقق من المتغيرات
if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN مفقود في .env")
  process.exit(1)
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID مفقود في .env")
  process.exit(1)
}

if (DEPLOY_MODE === "guild" && !GUILD_ID) {
  console.error("❌ DEPLOY_MODE=guild لكن GUILD_ID مفقود في .env")
  process.exit(1)
}

const commands = []

const commandsPath = path.join(__dirname, "../commands")
const commandFolders = fs.readdirSync(commandsPath)

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder)

  if (!fs.lstatSync(folderPath).isDirectory()) continue

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"))

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file)
    const command = require(filePath)

    // ══════════════════════════════════════
    //  دعم الملفات التي تصدّر commands[]
    // ══════════════════════════════════════
    if (command.commands) {
      for (const cmd of command.commands) {
        commands.push(cmd.toJSON())
        console.log(`  ✅ ${cmd.name}`)
      }
    } else if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON())
      console.log(`  ✅ ${command.data.name}`)
    } else {
      console.log(`  ⚠️ تخطي ${file} — ناقص data أو execute`)
    }
  }
}

const rest = new REST({ version: "10" }).setToken(TOKEN)

;(async () => {
  try {
    console.log(`\n🚀 جاري نشر ${commands.length} أمر...`)
    console.log(`📦 وضع النشر: ${DEPLOY_MODE}\n`)

    if (DEPLOY_MODE === "guild") {
      // ═══════════════════════════════════════
      //  نشر في السيرفر المحدد فقط (فوري)
      // ═══════════════════════════════════════
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      )
      console.log(`✅ تم نشر الأوامر في السيرفر: ${GUILD_ID}`)
      console.log("⚡ الأوامر متاحة فوراً في هذا السيرفر فقط")

    } else if (DEPLOY_MODE === "global") {
      // ═══════════════════════════════════════
      //  نشر عالمياً (كل السيرفرات — حتى ساعة)
      // ═══════════════════════════════════════
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      )
      console.log("✅ تم نشر الأوامر عالمياً (كل السيرفرات)")
      console.log("⏳ ملاحظة: الأوامر العالمية تاخذ حتى ساعة عشان تظهر")

    } else {
      console.error(`❌ DEPLOY_MODE غير صالح: ${DEPLOY_MODE}`)
      console.error("   القيم المسموحة: guild | global")
      process.exit(1)
    }

    console.log("\n✨ اكتمل النشر بنجاح!")

  } catch (error) {
    console.error("❌ فشل نشر الأوامر:", error)
    process.exit(1)
  }
})()