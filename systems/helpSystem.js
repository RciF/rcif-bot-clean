// ══════════════════════════════════════════════════════════════════
//  HELP SYSTEM — النظام المركزي للـ /help
//  المسار: systems/helpSystem.js
//
//  المسؤوليات:
//   1) قراءة كل الأوامر من مجلد commands/
//   2) استخراج helpMeta من كل أمر (مع subcommands)
//   3) بناء فهرسة كاملة قابلة للبحث
//   4) توفير دوال للبحث بالـ alias
//   5) جلب الفئات المخفية من قاعدة البيانات
//
//  يدعم 4 هياكل أوامر:
//   - commands/<category>/<command>.js
//   - commands/<category>/<command>/index.js
//   - commands/<category>/index.js (category-as-command)
//   - الملفات اللي تبدأ بـ _ تُتجاهل
//
//  يفك الـ subcommands تلقائياً — كل subcommand يُعامَل كأمر مستقل
//  في الـ /help لو عنده helpMeta خاص فيه.
// ══════════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

// ══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════════

const COMMANDS_PATH = path.join(__dirname, "../commands")

// أوامر مخفية بالكامل من /help (مهما كانت الظروف)
const HIDDEN_COMMANDS = [
  "مطور" // أمر بريفكس مخفي للمطور فقط
]

// فئات معروفة + ميتاداتا العرض
const CATEGORIES_META = {
  moderation: { label: "الإشراف",          icon: "🛡️", color: 0x22d3a2, order: 1  },
  logs:       { label: "السجلات",           icon: "📋", color: 0x00c8ff, order: 2  },
  protection: { label: "الحماية",           icon: "🔒", color: 0xf43f5e, order: 3  },
  welcome:    { label: "الترحيب",           icon: "🤝", color: 0x00ffe7, order: 4  },
  tickets:    { label: "التذاكر",           icon: "🎫", color: 0xa855f7, order: 5  },
  roles:      { label: "الرتب",             icon: "🎭", color: 0xfbbf24, order: 6  },
  xp:         { label: "XP والمستويات",    icon: "⭐", color: 0xa855f7, order: 7  },
  economy:    { label: "الاقتصاد",          icon: "💰", color: 0xfbbf24, order: 8  },
  events:     { label: "الفعاليات",         icon: "🎉", color: 0x00ffe7, order: 9  },
  stats:      { label: "الإحصائيات",        icon: "📊", color: 0x00c8ff, order: 10 },
  ai:         { label: "الذكاء الاصطناعي", icon: "🤖", color: 0x00c8ff, order: 11 },
  info:       { label: "المعلومات",         icon: "ℹ️", color: 0x64748b, order: 12 },
  admin:      { label: "الإعدادات",         icon: "⚙️", color: 0x64748b, order: 13 }
}

// ميتاداتا مستويات الاشتراك (للعرض)
const TIER_META = {
  free:    { label: "مجاني",  emoji: "🆓", color: 0x64748b, level: 0 },
  silver:  { label: "فضي",    emoji: "🥈", color: 0xc0c0c0, level: 1 },
  gold:    { label: "ذهبي",   emoji: "🥇", color: 0xfbbf24, level: 2 },
  diamond: { label: "ماسي",   emoji: "💎", color: 0x60a5fa, level: 3 }
}

// ══════════════════════════════════════════════════════════════════
//  CACHE — فهرسة كاملة في الذاكرة
// ══════════════════════════════════════════════════════════════════

let commandsIndex = null    // Map<commandKey, helpEntry>
let aliasIndex    = null    // Map<alias, commandKey>
let categoriesIndex = null  // Map<categoryId, helpEntry[]>
let lastLoadedAt  = 0

// ══════════════════════════════════════════════════════════════════
//  CORE: تحميل كل الأوامر
// ══════════════════════════════════════════════════════════════════

/**
 * إعادة تحميل الفهرسة من الصفر (يُستدعى مرة عند الإقلاع)
 */
function loadAllCommands() {
  const commands = new Map()
  const aliases  = new Map()
  const categories = new Map()

  if (!fs.existsSync(COMMANDS_PATH)) {
    logger.warn("HELP_COMMANDS_PATH_NOT_FOUND")
    return { commands, aliases, categories }
  }

  let categoryFolders = []

  try {
    categoryFolders = fs.readdirSync(COMMANDS_PATH)
  } catch (err) {
    logger.error("HELP_READ_COMMANDS_FAILED", { error: err.message })
    return { commands, aliases, categories }
  }

  // المرور على كل فئة
  for (const category of categoryFolders) {
    const categoryPath = path.join(COMMANDS_PATH, category)

    let stat
    try {
      stat = fs.lstatSync(categoryPath)
    } catch {
      continue
    }

    if (!stat.isDirectory()) continue

    // CASE A: index.js في جذر القسم (category-as-command)
    const categoryIndexPath = path.join(categoryPath, "index.js")
    if (fs.existsSync(categoryIndexPath)) {
      processCommandFile(categoryIndexPath, category, commands, aliases)
      continue
    }

    // CASE B: القسم فيه عدة أوامر
    let entries = []
    try {
      entries = fs.readdirSync(categoryPath)
    } catch {
      continue
    }

    for (const entry of entries) {
      if (entry.startsWith("_")) continue

      const entryPath = path.join(categoryPath, entry)
      let entryStat

      try {
        entryStat = fs.lstatSync(entryPath)
      } catch {
        continue
      }

      // ملف .js مباشر
      if (entryStat.isFile()) {
        if (!entry.endsWith(".js")) continue
        processCommandFile(entryPath, category, commands, aliases)
        continue
      }

      // مجلد فرعي → index.js
      if (entryStat.isDirectory()) {
        const indexPath = path.join(entryPath, "index.js")
        if (!fs.existsSync(indexPath)) continue
        processCommandFile(indexPath, category, commands, aliases)
      }
    }
  }

  // بناء فهرسة الفئات
  for (const [key, entry] of commands) {
    const cat = entry.category
    if (!categories.has(cat)) categories.set(cat, [])
    categories.get(cat).push(entry)
  }

  // ترتيب الأوامر داخل كل فئة أبجدياً
  for (const [cat, entries] of categories) {
    entries.sort((a, b) => a.name.localeCompare(b.name, "ar"))
  }

  return { commands, aliases, categories }
}

/**
 * معالجة ملف أمر واحد + استخراج helpMeta + فك subcommands
 */
function processCommandFile(filePath, category, commands, aliases) {
  let mod
  try {
    // مسح الـ require cache عشان نضمن قراءة جديدة
    delete require.cache[require.resolve(filePath)]
    mod = require(filePath)
  } catch (err) {
    logger.error("HELP_LOAD_FILE_FAILED", { file: filePath, error: err.message })
    return
  }

  if (!mod) return

  // ── حالة 1: ملف فيه commands array (deployCommands pattern) ──
  if (Array.isArray(mod.commands)) {
    for (const cmd of mod.commands) {
      const builtData = cmd?.toJSON ? cmd.toJSON() : null
      if (!builtData?.name) continue
      registerCommand(builtData, mod, category, commands, aliases)
    }
    return
  }

  // ── حالة 2: ملف فيه data + execute (slash command عادي) ──
  if (!mod.data) return

  const builtData = mod.data?.toJSON ? mod.data.toJSON() : null
  if (!builtData?.name) return

  registerCommand(builtData, mod, category, commands, aliases)
}

/**
 * تسجيل أمر واحد + التعامل مع subcommands لو موجودة
 */
function registerCommand(builtData, mod, category, commands, aliases) {
  const baseName = builtData.name

  // تجاهل الأوامر المخفية
  if (HIDDEN_COMMANDS.includes(baseName)) return

  const baseHelpMeta = mod.helpMeta || null
  const baseDesc     = builtData.description || ""

  // فحص: هل الأمر فيه subcommands؟
  const hasSubcommands = Array.isArray(builtData.options) &&
    builtData.options.some(opt => opt.type === 1) // type 1 = SUB_COMMAND

  if (hasSubcommands) {
    // فك كل subcommand كأمر مستقل
    const subcommands = builtData.options.filter(opt => opt.type === 1)

    // الميتاداتا الخاصة بالـ subcommands (لو موجودة)
    const subMetas = baseHelpMeta?.subcommands || {}

    for (const sub of subcommands) {
      const fullName = `${baseName} ${sub.name}`
      const subMeta  = subMetas[sub.name] || {}

      const entry = buildHelpEntry({
        name: fullName,
        baseName,
        subName: sub.name,
        category: subMeta.category || baseHelpMeta?.category || category,
        description: subMeta.description || sub.description || baseDesc,
        options: sub.options || [],
        meta: { ...baseHelpMeta, ...subMeta },
        isSubcommand: true
      })

      commands.set(fullName, entry)
      registerAliases(entry, aliases)
    }
    return
  }

  // أمر عادي بدون subcommands
  const entry = buildHelpEntry({
    name: baseName,
    baseName,
    subName: null,
    category: baseHelpMeta?.category || category,
    description: baseHelpMeta?.description || baseDesc,
    options: builtData.options || [],
    meta: baseHelpMeta || {},
    isSubcommand: false
  })

  commands.set(baseName, entry)
  registerAliases(entry, aliases)
}

/**
 * بناء help entry موحد
 */
function buildHelpEntry({ name, baseName, subName, category, description, options, meta, isSubcommand }) {
  // معالجة الخيارات (نفك الـ subcommand options لو موجودة)
  const cleanOptions = (options || [])
    .filter(opt => opt.type !== 1 && opt.type !== 2) // استثناء subcommand و subcommand_group
    .map(opt => ({
      name: opt.name,
      description: opt.description || "",
      required: !!opt.required,
      type: opt.type
    }))

  // الـ requirements
  const requirements = meta.requirements || {}

  return {
    // البيانات الأساسية
    name,                                  // "حظر" أو "تذاكر إعداد"
    baseName,                              // "حظر" أو "تذاكر"
    subName,                               // null أو "إعداد"
    isSubcommand,
    category: category || "uncategorized",
    description: description || "بدون وصف",

    // الخيارات (مع وصف لكل خيار)
    options: cleanOptions,

    // المتطلبات
    botRoleHierarchy: requirements.botRoleHierarchy === true,
    userPermissions: Array.isArray(requirements.userPermissions) ? requirements.userPermissions : [],
    subscriptionTier: requirements.subscriptionTier || "free",

    // Aliases للبحث
    aliases: Array.isArray(meta.aliases) ? meta.aliases : [],

    // معلومات إضافية
    cooldown: typeof meta.cooldown === "number" ? meta.cooldown : 0,
    examples: Array.isArray(meta.examples) ? meta.examples : [],
    notes: Array.isArray(meta.notes) ? meta.notes : (meta.notes ? [meta.notes] : []),
    relatedCommands: Array.isArray(meta.relatedCommands) ? meta.relatedCommands : [],

    // علامة: هل عنده helpMeta كامل ولا فقط من البيانات الأساسية؟
    hasMeta: !!meta && Object.keys(meta).length > 0
  }
}

/**
 * تسجيل aliases للبحث السريع
 */
function registerAliases(entry, aliases) {
  // الاسم نفسه يُسجَّل كـ alias
  aliases.set(entry.name.toLowerCase(), entry.name)

  // الاسم الأساسي (لو subcommand) — يُسجَّل كنقطة دخول للأمر الأم
  if (entry.isSubcommand) {
    if (!aliases.has(entry.baseName.toLowerCase())) {
      aliases.set(entry.baseName.toLowerCase(), entry.baseName)
    }
  }

  // الـ aliases المخصصة من helpMeta
  for (const alias of entry.aliases) {
    aliases.set(alias.toLowerCase(), entry.name)
  }
}

// ══════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════════════════════════════

function init() {
  const { commands, aliases, categories } = loadAllCommands()
  commandsIndex = commands
  aliasIndex = aliases
  categoriesIndex = categories
  lastLoadedAt = Date.now()

  logger.success("HELP_SYSTEM_INITIALIZED", {
    totalCommands: commands.size,
    totalAliases: aliases.size,
    totalCategories: categories.size
  })
}

function ensureLoaded() {
  if (!commandsIndex) init()
}

// ══════════════════════════════════════════════════════════════════
//  PUBLIC API — البحث والاستعلام
// ══════════════════════════════════════════════════════════════════

/**
 * جلب أمر بالاسم أو الـ alias
 * يدعم: "حظر" / "ban" / "تذاكر إعداد" / "tickets setup"
 */
function getCommand(query) {
  ensureLoaded()
  if (!query || typeof query !== "string") return null

  const normalized = query.trim().toLowerCase()

  // 1) بحث مباشر
  let resolvedName = aliasIndex.get(normalized)

  // 2) لو ما لقى، جرب بمسافات مختلفة
  if (!resolvedName) {
    // "tickets-setup" → "tickets setup"
    const dashed = normalized.replace(/-/g, " ")
    resolvedName = aliasIndex.get(dashed)
  }

  // 3) لو ما لقى، بحث جزئي ذكي
  if (!resolvedName) {
    for (const [alias, cmdName] of aliasIndex) {
      if (alias.includes(normalized) || normalized.includes(alias)) {
        resolvedName = cmdName
        break
      }
    }
  }

  if (!resolvedName) return null

  return commandsIndex.get(resolvedName) || null
}

/**
 * جلب كل الأوامر في فئة معينة
 */
function getCategoryCommands(categoryId) {
  ensureLoaded()
  return categoriesIndex.get(categoryId) || []
}

/**
 * جلب كل الفئات (مع عدد الأوامر في كل فئة)
 */
function getAllCategories() {
  ensureLoaded()

  const result = []

  for (const [catId, entries] of categoriesIndex) {
    const meta = CATEGORIES_META[catId] || {
      label: catId,
      icon: "📁",
      color: 0x5865f2,
      order: 99
    }

    result.push({
      id: catId,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      order: meta.order,
      count: entries.length
    })
  }

  // ترتيب حسب الـ order
  result.sort((a, b) => a.order - b.order)

  return result
}

/**
 * جلب ميتاداتا فئة معينة
 */
function getCategoryMeta(categoryId) {
  return CATEGORIES_META[categoryId] || null
}

/**
 * جلب ميتاداتا مستوى اشتراك
 */
function getTierMeta(tier) {
  return TIER_META[tier] || TIER_META.free
}

/**
 * بحث متقدم — يرجع كل الأوامر اللي تطابق
 */
function searchCommands(query, limit = 25) {
  ensureLoaded()
  if (!query || typeof query !== "string") return []

  const normalized = query.trim().toLowerCase()
  const matches = []
  const seen = new Set()

  for (const [alias, cmdName] of aliasIndex) {
    if (alias.includes(normalized) && !seen.has(cmdName)) {
      const cmd = commandsIndex.get(cmdName)
      if (cmd) {
        matches.push(cmd)
        seen.add(cmdName)
      }
    }
    if (matches.length >= limit) break
  }

  return matches
}

/**
 * جلب الإحصائيات الكاملة
 */
function getStats() {
  ensureLoaded()

  return {
    totalCommands: commandsIndex.size,
    totalCategories: categoriesIndex.size,
    totalAliases: aliasIndex.size,
    lastLoadedAt
  }
}

// ══════════════════════════════════════════════════════════════════
//  HIDDEN CATEGORIES — جلب الفئات المخفية من قاعدة البيانات
// ══════════════════════════════════════════════════════════════════

/**
 * جلب الفئات المخفية لسيرفر معين
 * الإعداد يأتي من الداشبورد (نضيف الجدول لاحقاً في migration)
 */
async function getHiddenCategories(guildId) {
  if (!guildId) return []

  try {
    const result = await databaseSystem.query(
      "SELECT category_id FROM help_hidden_categories WHERE guild_id = $1",
      [guildId]
    )
    return result.rows.map(r => r.category_id)
  } catch (err) {
    // لو الجدول لسه ما اتعمل — نرجع قائمة فاضية
    return []
  }
}

/**
 * جلب الفئات المرئية لسيرفر معين (مع تطبيق الإخفاء)
 */
async function getVisibleCategories(guildId) {
  const allCategories = getAllCategories()
  const hidden = await getHiddenCategories(guildId)

  if (hidden.length === 0) return allCategories

  return allCategories.filter(c => !hidden.includes(c.id))
}

// ══════════════════════════════════════════════════════════════════
//  RELOAD — لإعادة تحميل الفهرسة (للتطوير)
// ══════════════════════════════════════════════════════════════════

function reload() {
  commandsIndex = null
  aliasIndex = null
  categoriesIndex = null
  init()
  return getStats()
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = {
  // Initialization
  init,
  reload,

  // Lookup
  getCommand,
  getCategoryCommands,
  getAllCategories,
  getCategoryMeta,
  getTierMeta,

  // Search
  searchCommands,

  // Settings
  getHiddenCategories,
  getVisibleCategories,

  // Stats
  getStats,

  // Constants (للوصول من الملفات الأخرى)
  CATEGORIES_META,
  TIER_META,
  HIDDEN_COMMANDS
}