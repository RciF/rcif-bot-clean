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
const categoryFolders = fs.readdirSync(commandsPath)

// ══════════════════════════════════════════════════════════════════
//  COLLECT COMMANDS
//  يدعم:
//  1) commands/<category>/<command>.js          (ملف مستقل)
//  2) commands/<category>/<command>/index.js    (مجلد فرعي)
//  3) commands/<category>/index.js              (category-as-command)
//  4) الملفات اللي تبدأ بـ _ تُتجاهل
// ══════════════════════════════════════════════════════════════════

for (const category of categoryFolders) {
  const categoryPath = path.join(commandsPath, category)

  if (!fs.lstatSync(categoryPath).isDirectory()) continue

  // ── CASE A: index.js في جذر القسم ──
  const categoryIndexPath = path.join(categoryPath, "index.js")
  if (fs.existsSync(categoryIndexPath)) {
    loadAndPush(categoryIndexPath, `${category}/index.js`)
    continue
  }

  // ── CASE B: القسم فيه عدة أوامر ──
  const entries = fs.readdirSync(categoryPath)

  for (const entry of entries) {
    if (entry.startsWith("_")) continue

    const entryPath = path.join(categoryPath, entry)
    const entryStat = fs.lstatSync(entryPath)

    // ملف .js مباشر
    if (entryStat.isFile()) {
      if (!entry.endsWith(".js")) continue
      loadAndPush(entryPath, entry)
      continue
    }

    // مجلد فرعي → index.js
    if (entryStat.isDirectory()) {
      const indexPath = path.join(entryPath, "index.js")

      if (!fs.existsSync(indexPath)) {
        console.log(`  ⚠️ تخطي ${category}/${entry} — ما فيه index.js`)
        continue
      }

      loadAndPush(indexPath, `${entry}/index.js`)
    }
  }
}

function loadAndPush(filePath, displayName) {
  try {
    const command = require(filePath)

    if (command.commands) {
      for (const cmd of command.commands) {
        commands.push(cmd.toJSON())
        console.log(`  ✅ ${cmd.name}`)
      }
    } else if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON())
      console.log(`  ✅ ${command.data.name}`)
    } else {
      console.log(`  ⚠️ تخطي ${displayName} — ناقص data أو execute`)
    }
  } catch (err) {
    console.error(`  ❌ فشل تحميل ${displayName}:`, err.message)
  }
}

const rest = new REST({ version: "10" }).setToken(TOKEN)

;(async () => {
  try {
    console.log(`\n🚀 جاري نشر ${commands.length} أمر...`)
    console.log(`📦 وضع النشر: ${DEPLOY_MODE}\n`)

    if (DEPLOY_MODE === "guild") {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      )
      console.log(`\n✅ تم نشر ${commands.length} أمر في السيرفر ${GUILD_ID}`)
    } else if (DEPLOY_MODE === "global") {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      )
      console.log(`\n✅ تم نشر ${commands.length} أمر عالمياً`)
    } else {
      console.error(`❌ DEPLOY_MODE غير صالح: ${DEPLOY_MODE}`)
      process.exit(1)
    }
  } catch (error) {
    console.error("❌ فشل نشر الأوامر:", error)
    process.exit(1)
  }
})()