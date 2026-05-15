// ══════════════════════════════════════════════════════════════════
//  Events Audit — Lyn Bot
//  المسار: events_audit.js
//
//  يفحص:
//   1. كل ملفات events/*.js (slash event files)
//   2. handlers/*.js (helpers)
//   3. الترابط بينهم
//   4. صحة الـ exports
// ══════════════════════════════════════════════════════════════════

require("dotenv").config()

const fs = require("fs")
const path = require("path")

const EVENTS_DIR = path.join(__dirname, "events")

const stats = {
  total: 0,
  valid: 0,
  handlers: 0,
  invalid: 0,
  errors: [],
}

const validEvents = []
const validHandlers = []

function walkDir(dir, relativePath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const rel = path.join(relativePath, entry.name)

    if (entry.isDirectory()) {
      walkDir(fullPath, rel)
    } else if (entry.name.endsWith(".js")) {
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
    stats.errors.push({ file: rel, error: err.message })
    console.log(`❌ ${rel} → ${err.message.slice(0, 80)}`)
    return
  }

  // Discord event file: { name, execute }
  const hasName = mod && typeof mod === "object" && mod.name
  const hasExecute = mod && typeof mod.execute === "function"

  if (hasName && hasExecute) {
    stats.valid++
    validEvents.push({ file: rel, name: mod.name })
    return
  }

  // Handler file: any exported function
  const exports = Object.keys(mod || {})
  if (exports.length > 0) {
    stats.handlers++
    validHandlers.push({ file: rel, exports })
    return
  }

  stats.invalid++
  stats.errors.push({ file: rel, error: "No exports" })
  console.log(`⚠️  ${rel} → no exports`)
}

console.log("")
console.log("═".repeat(70))
console.log("  EVENTS AUDIT — Lyn Bot")
console.log("═".repeat(70))
console.log("")

walkDir(EVENTS_DIR)

console.log("═".repeat(70))
console.log("  REGISTERED EVENTS (with name + execute)")
console.log("═".repeat(70))
console.log("")

validEvents.sort((a, b) => a.name.localeCompare(b.name))
for (const e of validEvents) {
  console.log(`  ${e.name.padEnd(25)} ${e.file}`)
}

console.log("")
console.log("═".repeat(70))
console.log("  HANDLERS (called manually)")
console.log("═".repeat(70))
console.log("")

validHandlers.sort((a, b) => a.file.localeCompare(b.file))
for (const h of validHandlers) {
  console.log(`  ${h.file.padEnd(40)} exports: ${h.exports.join(", ")}`)
}

console.log("")
console.log("═".repeat(70))
console.log("  SUMMARY")
console.log("═".repeat(70))
console.log("")
console.log(`  Total files:        ${stats.total}`)
console.log(`  ✅ Discord events:   ${stats.valid}`)
console.log(`  🔧 Handlers:        ${stats.handlers}`)
console.log(`  ❌ Invalid:         ${stats.invalid}`)
console.log("")

if (stats.errors.length > 0) {
  console.log("Errors:")
  for (const e of stats.errors) {
    console.log(`  ❌ ${e.file}: ${e.error}`)
  }
  console.log("")
}

if (stats.invalid === 0) {
  console.log("🎉 كل الأحداث سليمة!")
} else {
  console.log("⚠️  فيه مشاكل تحتاج إصلاح")
}
console.log("")