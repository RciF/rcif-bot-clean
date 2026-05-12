// ══════════════════════════════════════════════════════════════════
//  Button Role Panels — SHARED HELPERS
//  المسار: commands/roles/_button-role-shared.js
//
//  ⚠️ SCHEMA BRIDGE:
//   البوت (legacy) يخزن أزرار اللوحة في جدول مستقل: button_roles
//   الداش (الجديد) يخزن الأزرار في عمود JSONB: button_role_panels.buttons
//   هذا الملف يدمج الاثنين عشان أي لوحة (من أي مصدر) تشتغل.
//
//  customId formats المدعومة:
//   - brole_<numeric_id>      ← لوحات قديمة من البوت (button_roles.id)
//   - brole_p_<panelId>_<i>   ← لوحات الداش (panel.id + index في buttons[])
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")

// ══════════════════════════════════════
//  ENSURE TABLES (+ defensive migrations)
// ══════════════════════════════════════

async function ensureTable() {
  // الجدول الرئيسي (مشترك مع الداش)
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS button_role_panels (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      channel_id  TEXT,
      message_id  TEXT UNIQUE,
      title       TEXT NOT NULL DEFAULT 'اختر رتبتك',
      description TEXT,
      color       TEXT DEFAULT 'أزرق',
      image_url   TEXT,
      thumbnail   TEXT,
      exclusive   BOOLEAN DEFAULT false,
      buttons     JSONB DEFAULT '[]'::jsonb,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    );
  `)

  // ⚠️ Defensive migrations — لو الجدول تم إنشاؤه قديماً من الداش
  //    (CREATE TABLE IF NOT EXISTS أعلاه ما يضيف أعمدة لجدول قائم)
  //    نضيف الأعمدة الناقصة بـ ALTER ADD COLUMN IF NOT EXISTS
  const altersMain = [
    "ADD COLUMN IF NOT EXISTS channel_id  TEXT",
    "ADD COLUMN IF NOT EXISTS message_id  TEXT",
    "ADD COLUMN IF NOT EXISTS title       TEXT",
    "ADD COLUMN IF NOT EXISTS description TEXT",
    "ADD COLUMN IF NOT EXISTS color       TEXT",
    "ADD COLUMN IF NOT EXISTS image_url   TEXT",
    "ADD COLUMN IF NOT EXISTS thumbnail   TEXT",
    "ADD COLUMN IF NOT EXISTS exclusive   BOOLEAN DEFAULT false",
    "ADD COLUMN IF NOT EXISTS buttons     JSONB DEFAULT '[]'::jsonb",
    "ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP DEFAULT NOW()",
    "ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP DEFAULT NOW()"
  ]
  for (const clause of altersMain) {
    try {
      await databaseSystem.query(`ALTER TABLE button_role_panels ${clause};`)
    } catch (e) {
      // column already exists / type clash — ignore safely
    }
  }

  // ⚠️ إصلاح حرج: لو الداش أنشأ color كـ INT، حوّله TEXT
  //    البوت يستخدم أسماء عربية ("بنفسجي")، والداش يستخدم أرقام (10181046)
  //    TEXT يستوعب الاثنين عبر colorToHex()
  try {
    await databaseSystem.query(
      `ALTER TABLE button_role_panels ALTER COLUMN color TYPE TEXT USING color::TEXT;`
    )
  } catch (e) {
    // already TEXT or other safe failure — ignore
  }

  // الجدول القديم (للأوامر — تُحفظ فيه الأزرار من /لوحة-رتب-إضافة)
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS button_roles (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      message_id  TEXT NOT NULL,
      role_id     TEXT NOT NULL,
      label       TEXT NOT NULL,
      emoji       TEXT,
      color       TEXT NOT NULL DEFAULT 'أزرق',
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `)
}

// ══════════════════════════════════════
//  URL VALIDATOR
//  يمنع تمرير نص غير URL إلى setImage/setThumbnail
//  (discord.js يرمي ValidationError لو القيمة ما تطابق URL)
// ══════════════════════════════════════

function isValidHttpUrl(value) {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

// ══════════════════════════════════════
//  JSONB parser
// ══════════════════════════════════════

function parseButtons(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

// ══════════════════════════════════════
//  GET PANEL — يعمل مع message_id أو panel.id
// ══════════════════════════════════════

async function getPanel(messageId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM button_role_panels WHERE message_id = $1",
    [messageId]
  )
}

async function getPanelById(panelId) {
  const id = parseInt(panelId)
  if (!isFinite(id)) return null
  return await databaseSystem.queryOne(
    "SELECT * FROM button_role_panels WHERE id = $1",
    [id]
  )
}

// ══════════════════════════════════════
//  GET BUTTONS — bridge بين الجدولين
//
//  الإرجاع: array من {id, role_id, label, emoji, color, source}
//   source: 'legacy' للجدول القديم | 'jsonb' للجدول الجديد
//   id: للـ legacy = button_roles.id (number)
//       للـ jsonb  = "p_<panelId>_<index>"
// ══════════════════════════════════════

async function getPanelButtons(messageId) {
  const result = []

  // 1) الأزرار من button_roles (legacy — للأوامر)
  try {
    const legacy = await databaseSystem.query(
      "SELECT * FROM button_roles WHERE message_id = $1 ORDER BY id ASC",
      [messageId]
    )
    for (const row of (legacy.rows || [])) {
      result.push({
        id: row.id,
        role_id: row.role_id,
        label: row.label,
        emoji: row.emoji,
        color: row.color || "أزرق",
        source: "legacy"
      })
    }
  } catch {}

  // 2) الأزرار من button_role_panels.buttons JSONB (الداش)
  try {
    const panel = await databaseSystem.queryOne(
      "SELECT id, buttons FROM button_role_panels WHERE message_id = $1",
      [messageId]
    )
    if (panel) {
      const arr = parseButtons(panel.buttons)
      arr.forEach((b, idx) => {
        if (!b || !b.role_id) return
        result.push({
          id: `p_${panel.id}_${idx}`,
          role_id: b.role_id,
          label: b.label || "اختر",
          emoji: b.emoji || null,
          color: b.color || "أزرق",
          source: "jsonb"
        })
      })
    }
  } catch {}

  return result
}

// ✅ مساعد: ابحث عن زر بالـ customId سواء legacy أو jsonb
async function findButtonByCustomId(customId) {
  if (!customId || !customId.startsWith("brole_")) return null
  const rest = customId.slice("brole_".length)

  // jsonb format: p_<panelId>_<index>
  if (rest.startsWith("p_")) {
    const parts = rest.split("_")
    if (parts.length < 3) return null
    const panelId = parseInt(parts[1])
    const idx = parseInt(parts[2])
    if (!isFinite(panelId) || !isFinite(idx)) return null

    const panel = await getPanelById(panelId)
    if (!panel) return null
    const arr = parseButtons(panel.buttons)
    const b = arr[idx]
    if (!b || !b.role_id) return null

    return {
      id: `p_${panelId}_${idx}`,
      role_id: b.role_id,
      label: b.label || "اختر",
      emoji: b.emoji || null,
      color: b.color || "أزرق",
      source: "jsonb",
      panel_message_id: panel.message_id,
      panel_id: panel.id,
      panel
    }
  }

  // legacy format: numeric id
  const numericId = parseInt(rest)
  if (!isFinite(numericId)) return null

  const row = await databaseSystem.queryOne(
    "SELECT * FROM button_roles WHERE id = $1",
    [numericId]
  )
  if (!row) return null

  const panel = await getPanel(row.message_id)
  return {
    id: row.id,
    role_id: row.role_id,
    label: row.label,
    emoji: row.emoji,
    color: row.color || "أزرق",
    source: "legacy",
    panel_message_id: row.message_id,
    panel_id: panel?.id,
    panel: panel || null
  }
}

// ══════════════════════════════════════
//  GET ALL PANELS
// ══════════════════════════════════════

async function getAllPanels(guildId) {
  const result = await databaseSystem.query(
    "SELECT * FROM button_role_panels WHERE guild_id = $1 ORDER BY created_at DESC",
    [guildId]
  )
  return result.rows || []
}

// ══════════════════════════════════════
//  COLOR HELPERS — يدعم رقم (داش) أو نص عربي (بوت)
// ══════════════════════════════════════

const ARABIC_COLOR_MAP = {
  "أزرق":   0x5865f2,
  "أخضر":   0x57f287,
  "أحمر":   0xed4245,
  "ذهبي":   0xfbbf24,
  "بنفسجي": 0xa855f7,
  "سماوي":  0x00c8ff,
  "رمادي":  0x4f545c,
  "أبيض":   0xffffff
}

function colorToHex(color) {
  if (typeof color === "number" && isFinite(color)) return color
  if (typeof color === "string") {
    if (ARABIC_COLOR_MAP[color] !== undefined) return ARABIC_COLOR_MAP[color]
    // hex string
    const trimmed = color.trim().replace(/^#/, "")
    if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return parseInt(trimmed, 16)
  }
  return 0x5865f2
}

// ══════════════════════════════════════
//  BUTTON STYLE — يدعم نص عربي/إنجليزي/رقم
// ══════════════════════════════════════

const ARABIC_STYLE_MAP = {
  "أزرق":   ButtonStyle.Primary,
  "بنفسجي": ButtonStyle.Primary,
  "سماوي":  ButtonStyle.Primary,
  "أخضر":   ButtonStyle.Success,
  "أحمر":   ButtonStyle.Danger,
  "رمادي":  ButtonStyle.Secondary,
  "ذهبي":   ButtonStyle.Secondary,
  "أبيض":   ButtonStyle.Secondary
}

const ENGLISH_STYLE_MAP = {
  primary: ButtonStyle.Primary,
  blue: ButtonStyle.Primary,
  success: ButtonStyle.Success,
  green: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  red: ButtonStyle.Danger,
  secondary: ButtonStyle.Secondary,
  gray: ButtonStyle.Secondary,
  grey: ButtonStyle.Secondary
}

function buttonStyle(color) {
  if (typeof color === "number") {
    if ([1, 2, 3, 4].includes(color)) return color // ButtonStyle enum
    return ButtonStyle.Primary
  }
  if (typeof color === "string") {
    if (ARABIC_STYLE_MAP[color] !== undefined) return ARABIC_STYLE_MAP[color]
    const lower = color.toLowerCase()
    if (ENGLISH_STYLE_MAP[lower] !== undefined) return ENGLISH_STYLE_MAP[lower]
  }
  return ButtonStyle.Primary
}

// ══════════════════════════════════════
//  BUTTON EMOJI SANITIZER
//  - يقبل: Custom Discord <:name:id> / <a:name:id>
//  - يقبل: أي Unicode emoji (flags 🇸🇦 + ZWJ + كل شي)
//  - يرفض: نص عادي، :shortcodes:، فاضي
// ══════════════════════════════════════

function sanitizeButtonEmoji(raw) {
  if (!raw || typeof raw !== "string") return null
  const s = raw.trim()
  if (!s) return null

  if (/^<a?:[a-zA-Z0-9_]{2,32}:\d{17,21}>$/.test(s)) return s
  if (/^:[a-zA-Z0-9_+-]+:$/.test(s)) return null

  const cps = Array.from(s)
  const isEmojiCp = (cp) => (
    (cp >= 0x1F300 && cp <= 0x1FAFF) ||
    (cp >= 0x2600  && cp <= 0x27BF)  ||
    (cp >= 0x2300  && cp <= 0x23FF)  ||
    (cp >= 0x25A0  && cp <= 0x25FF)  ||
    (cp >= 0x2B00  && cp <= 0x2BFF)  ||
    (cp >= 0x1F1E6 && cp <= 0x1F1FF) ||
    cp === 0xFE0F || cp === 0x200D
  )
  if (!cps.every(c => isEmojiCp(c.codePointAt(0)))) return null
  return s
}



async function buildPanelMessage(panel, buttons) {
  const embed = new EmbedBuilder()
    .setTitle(panel.title || "اختر رتبتك")
    .setColor(colorToHex(panel.color))
    .setTimestamp()

  if (panel.description) embed.setDescription(panel.description)

  // ✅ حماية: ما نمرر setImage/setThumbnail إلا لقيم URL صحيحة
  if (isValidHttpUrl(panel.image_url)) embed.setImage(panel.image_url.trim())
  if (isValidHttpUrl(panel.thumbnail)) embed.setThumbnail(panel.thumbnail.trim())

  if (!buttons || buttons.length === 0) {
    embed.setFooter({ text: "لا توجد أزرار بعد" })
  } else {
    embed.setFooter({
      text: panel.exclusive
        ? "⚡ يمكنك اختيار رتبة واحدة فقط"
        : "✅ يمكنك اختيار أكثر من رتبة — اضغط مرة ثانية للإزالة"
    })
  }

  const components = []
  const visible = (buttons || []).slice(0, 25)

  for (let i = 0; i < visible.length; i += 5) {
    const row = new ActionRowBuilder()
    for (const btn of visible.slice(i, i + 5)) {
      // ✅ customId: legacy = brole_<id> / jsonb = brole_p_<panelId>_<idx>
      const customId = `brole_${btn.id}`

      const b = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel((btn.label || "اختر").slice(0, 80))
        .setStyle(buttonStyle(btn.color))

      if (btn.emoji) {
        const safeEmoji = sanitizeButtonEmoji(btn.emoji)
        if (safeEmoji) {
          try {
            const customMatch = safeEmoji.match(/^<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,21})>$/)
            if (customMatch) {
              b.setEmoji({
                name: customMatch[2],
                id: customMatch[3],
                animated: customMatch[1] === "a"
              })
            } else {
              b.setEmoji({ name: safeEmoji })
            }
          } catch {}
        }
      }
      row.addComponents(b)
    }
    components.push(row)
  }

  return { embeds: [embed], components }
}

// ══════════════════════════════════════
//  COLOR CHOICES (للأوامر)
// ══════════════════════════════════════

const COLOR_CHOICES = [
  { name: "💙 أزرق",   value: "أزرق"   },
  { name: "💚 أخضر",   value: "أخضر"   },
  { name: "❤️ أحمر",   value: "أحمر"   },
  { name: "💛 ذهبي",   value: "ذهبي"   },
  { name: "💜 بنفسجي", value: "بنفسجي" },
  { name: "🩵 سماوي",  value: "سماوي"  },
  { name: "🩶 رمادي",  value: "رمادي"  }
]

const COLOR_CHOICES_NO_GOLD = COLOR_CHOICES.filter(c => c.value !== "ذهبي")

module.exports = {
  ensureTable,
  getPanel,
  getPanelById,
  getPanelButtons,
  findButtonByCustomId,
  getAllPanels,
  colorToHex,
  buttonStyle,
  buildPanelMessage,
  parseButtons,
  isValidHttpUrl,
  sanitizeButtonEmoji,
  COLOR_CHOICES,
  COLOR_CHOICES_NO_GOLD
}