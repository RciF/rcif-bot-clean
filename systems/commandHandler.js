const fs = require("fs")
const path = require("path")
const logger = require("./loggerSystem")

// ══════════════════════════════════════════════════════════════════
//  COMMAND HANDLER
//  يدعم 4 هياكل للأوامر:
//
//  1) commands/<category>/<command>.js
//     ← أمر في ملف واحد (النمط القديم)
//
//  2) commands/<category>/<command>/index.js
//     ← أمر في مجلد فرعي (للأوامر الكبيرة مع ساب-كوماندات)
//
//  3) commands/<category>/index.js
//     ← القسم كله = أمر واحد (category-as-command)
//     يُستخدم لما القسم فيه أمر واحد فقط وعايزينه في نفس جذر القسم
//     كل الملفات الأخرى في القسم تُعامَل كـ handlers داخلية
//
//  4) الملفات اللي تبدأ بـ _ تُتجاهل (shared/helpers)
// ══════════════════════════════════════════════════════════════════

module.exports = (client) => {

  const commandsPath = path.join(__dirname, "../commands")

  if (!fs.existsSync(commandsPath)) {
    logger.warn("COMMANDS_FOLDER_NOT_FOUND")
    return
  }

  if (!client.commands) {
    client.commands = new Map()
  }

  let loaded = 0
  let skipped = 0

  let categoryFolders = []

  try {
    categoryFolders = fs.readdirSync(commandsPath)
  } catch (err) {
    logger.error("COMMAND_FOLDER_READ_FAILED", { error: err.message })
    return
  }

  // ══════════════════════════════════════
  //  المرور على كل فئة
  // ══════════════════════════════════════
  for (const category of categoryFolders) {

    const categoryPath = path.join(commandsPath, category)
    let stat

    try {
      stat = fs.lstatSync(categoryPath)
    } catch {
      continue
    }

    if (!stat.isDirectory()) continue

    // ══════════════════════════════════════
    //  CASE A: القسم كله = أمر واحد
    //  (في index.js في جذر القسم)
    // ══════════════════════════════════════
    const categoryIndexPath = path.join(categoryPath, "index.js")

    if (fs.existsSync(categoryIndexPath)) {
      const result = loadCommandFile(client, categoryIndexPath, `${category}/index.js`)
      if (result === "loaded") loaded++
      else if (result === "skipped") skipped++
      continue
    }

    // ══════════════════════════════════════
    //  CASE B: القسم يحتوي عدة أوامر
    //  (ملفات أو مجلدات فرعية)
    // ══════════════════════════════════════
    let entries = []

    try {
      entries = fs.readdirSync(categoryPath)
    } catch {
      continue
    }

    for (const entry of entries) {

      // تجاهل الملفات اللي تبدأ بـ _
      if (entry.startsWith("_")) continue

      const entryPath = path.join(categoryPath, entry)
      let entryStat

      try {
        entryStat = fs.lstatSync(entryPath)
      } catch {
        continue
      }

      // ── ملف .js مباشر (النمط القديم) ──
      if (entryStat.isFile()) {
        if (!entry.endsWith(".js")) continue

        const result = loadCommandFile(client, entryPath, entry)
        if (result === "loaded") loaded++
        else if (result === "skipped") skipped++
        continue
      }

      // ── مجلد فرعي → نقرأ index.js ──
      if (entryStat.isDirectory()) {
        const indexPath = path.join(entryPath, "index.js")

        if (!fs.existsSync(indexPath)) {
          logger.warn(`NESTED_COMMAND_MISSING_INDEX ${category}/${entry}`)
          skipped++
          continue
        }

        const result = loadCommandFile(client, indexPath, `${entry}/index.js`)
        if (result === "loaded") loaded++
        else if (result === "skipped") skipped++
      }

    }

  }

  logger.success(`COMMANDS_LOADED ${loaded}`)

  if (skipped > 0) {
    logger.warn(`COMMANDS_SKIPPED ${skipped}`)
  }

}

// ══════════════════════════════════════════════════════════════════
//  LOAD SINGLE COMMAND FILE
// ══════════════════════════════════════════════════════════════════

function loadCommandFile(client, filePath, displayName) {

  try {

    delete require.cache[require.resolve(filePath)]
    const command = require(filePath)

    if (!command || !command.data || !command.data.name) {
      logger.warn(`INVALID_COMMAND_FILE ${displayName}`)
      return "skipped"
    }

    // ══════════════════════════════════════
    //  دعم الملفات التي تصدّر commands[]
    //  كل أمر يُسجَّل بـ sub-object الخاص به
    //  حتى يكون execute الصح عند الاستدعاء
    // ══════════════════════════════════════
    const commandList = command.commands
      ? command.commands
      : [command.data]

    let registered = false

    for (const cmd of commandList) {
      const name = cmd.name

      if (client.commands.has(name)) {
        logger.warn(`DUPLICATE_COMMAND ${name}`)
        continue
      }

      // ابحث عن الـ sub-object الصح للأمر
      let cmdObj = command
      if (command.commands) {
        const key = Object.keys(command).find(k =>
          command[k]?.data?.name === name
        )
        if (key) cmdObj = command[key]
      }

      client.commands.set(name, cmdObj)
      registered = true
    }

    return registered ? "loaded" : "skipped"

  } catch (error) {

    logger.error("COMMAND_LOAD_FAILED", {
      file: displayName,
      error: error.message
    })

    return "skipped"

  }

}