// ══════════════════════════════════════════════════════════════════
//  Commands Audit — Lyn Bot
//  المسار: commands_audit.js
//
//  يفحص كل ملفات commands/:
//   1. صحة البنية (data + execute)
//   2. أسماء عربية للـ slash commands
//   3. تكرار الأسماء
//   4. ملفات بدون export صحيح
//   5. SyntaxErrors عند الـ require
//
//  Usage: node commands_audit.js
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()

const fs = require("fs")
const path = require("path")

const COMMANDS_DIR = path.join(__dirname, "commands")

const stats = {
  total: 0,
  valid: 0,
  invalid: 0,
  helpers: 0,
  duplicates: [],
  errors: [],
}

const names = new Set()
const validCommands = []

function walkDir(dir, relativePath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const rel = path.join(relativePath, entry.name)

    if (entry.isDirectory()) {
      walkDir(fullPath, rel)
    } else if (entry.name.endsWith(".js") && !entry.name.startsWith("_")) {
      auditFile(fullPath, rel)
    }
  }
}

function auditFile(fullPath, rel) {
  stats.total++

  let mod
  try {
    delete require.cache[require.resolve(fullPath)]
    mod = require(fullPath)
  } catch (err) {
    stats.invalid++
    stats.errors.push({
      file: rel,
      error: err.message,
    })
    console.log(`❌ ${rel} → ${err.message.slice(0, 80)}`)
    return
  }

  // Check exports
  const hasData = mod && typeof mod === "object" && mod.data
  const hasExecute = mod && typeof mod.execute === "function"

  if (!hasData && !hasExecute) {
    stats.helpers++
    return
  }

  if (!hasData || !hasExecute) {
    stats.invalid++
    stats.errors.push({
      file: rel,
      error: `Missing ${!hasData ? "data" : ""}${!hasData && !hasExecute ? " and " : ""}${!hasExecute ? "execute" : ""}`,
    })
    console.log(`⚠️  ${rel} → missing data/execute`)
    return
  }

  const name = mod.data.name || mod.data?.toJSON?.()?.name
  if (!name) {
    stats.invalid++
    stats.errors.push({ file: rel, error: "No name in data" })
    console.log(`⚠️  ${rel} → no name`)
    return
  }

  // Check duplicates
  if (names.has(name)) {
    stats.duplicates.push({ file: rel, name })
    console.log(`🔴 DUPLICATE: ${rel} → name="${name}"`)
  } else {
    names.add(name)
  }

  // Check Arabic name (per project rule)
  const isArabic = /[\u0600-\u06FF]/.test(name)
  if (!isArabic) {
    console.log(`⚠️  ${rel} → name "${name}" not Arabic`)
  }

  stats.valid++
  validCommands.push({ file: rel, name })
}

console.log("")
console.log("═".repeat(70))
console.log("  COMMANDS AUDIT — Lyn Bot")
console.log("═".repeat(70))
console.log("")

walkDir(COMMANDS_DIR)

console.log("")
console.log("═".repeat(70))
console.log("  COMMAND NAMES (Arabic)")
console.log("═".repeat(70))
console.log("")

validCommands.sort((a, b) => a.name.localeCompare(b.name))
for (const cmd of validCommands) {
  console.log(`  /${cmd.name.padEnd(25)} ${cmd.file}`)
}

console.log("")
console.log("═".repeat(70))
console.log("  SUMMARY")
console.log("═".repeat(70))
console.log("")
console.log(`  Total files:       ${stats.total}`)
console.log(`  ✅ Valid commands: ${stats.valid}`)
console.log(`  🔧 Helpers (no data/execute): ${stats.helpers}`)
console.log(`  ⚠️  Invalid:        ${stats.invalid}`)
console.log(`  🔴 Duplicates:     ${stats.duplicates.length}`)
console.log("")

if (stats.errors.length > 0) {
  console.log("Errors:")
  for (const e of stats.errors) {
    console.log(`  ❌ ${e.file}: ${e.error}`)
  }
  console.log("")
}

if (stats.duplicates.length > 0) {
  console.log("⚠️  DUPLICATES (يجب تصحيحها):")
  for (const d of stats.duplicates) {
    console.log(`  ${d.file} → "${d.name}"`)
  }
  console.log("")
}

if (stats.invalid === 0 && stats.duplicates.length === 0) {
  console.log("🎉 كل الأوامر سليمة!")
} else {
  console.log("⚠️  فيه مشاكل تحتاج إصلاح")
}
console.log("")