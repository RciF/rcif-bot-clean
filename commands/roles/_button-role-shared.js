const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")

// ══════════════════════════════════════
//  DATABASE HELPERS
// ══════════════════════════════════════

async function ensureTable() {
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS button_role_panels (
      id          SERIAL PRIMARY KEY,
      guild_id    TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      message_id  TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL DEFAULT 'اختر رتبتك',
      description TEXT,
      color       TEXT DEFAULT 'أزرق',
      image_url   TEXT,
      thumbnail   TEXT,
      exclusive   BOOLEAN DEFAULT false,
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `)

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

async function getPanel(messageId) {
  return await databaseSystem.queryOne(
    "SELECT * FROM button_role_panels WHERE message_id = $1",
    [messageId]
  )
}

async function getPanelButtons(messageId) {
  const result = await databaseSystem.query(
    "SELECT * FROM button_roles WHERE message_id = $1 ORDER BY id ASC",
    [messageId]
  )
  return result.rows || []
}

async function getAllPanels(guildId) {
  const result = await databaseSystem.query(
    "SELECT * FROM button_role_panels WHERE guild_id = $1 ORDER BY created_at DESC",
    [guildId]
  )
  return result.rows || []
}

// ══════════════════════════════════════
//  COLOR HELPERS
// ══════════════════════════════════════

function colorToHex(color) {
  const map = {
    "أزرق":   0x5865f2,
    "أخضر":   0x57f287,
    "أحمر":   0xed4245,
    "ذهبي":   0xfbbf24,
    "بنفسجي": 0xa855f7,
    "سماوي":  0x00c8ff,
    "رمادي":  0x4f545c,
    "أبيض":   0xffffff
  }
  return map[color] || 0x5865f2
}

function buttonStyle(color) {
  const map = {
    "أزرق":   ButtonStyle.Primary,
    "بنفسجي": ButtonStyle.Primary,
    "سماوي":  ButtonStyle.Primary,
    "أخضر":   ButtonStyle.Success,
    "أحمر":   ButtonStyle.Danger,
    "رمادي":  ButtonStyle.Secondary,
    "ذهبي":   ButtonStyle.Secondary,
    "أبيض":   ButtonStyle.Secondary
  }
  return map[color] || ButtonStyle.Primary
}

// ══════════════════════════════════════
//  BUILD PANEL MESSAGE
// ══════════════════════════════════════

async function buildPanelMessage(panel, buttons) {
  const embed = new EmbedBuilder()
    .setTitle(panel.title)
    .setColor(colorToHex(panel.color))
    .setTimestamp()

  if (panel.description) embed.setDescription(panel.description)
  if (panel.image_url)   embed.setImage(panel.image_url)
  if (panel.thumbnail)   embed.setThumbnail(panel.thumbnail)

  if (buttons.length === 0) {
    embed.setFooter({ text: "لا توجد أزرار بعد — استخدم /لوحة-رتب إضافة" })
  } else {
    embed.setFooter({
      text: panel.exclusive
        ? "⚡ يمكنك اختيار رتبة واحدة فقط"
        : "✅ يمكنك اختيار أكثر من رتبة — اضغط مرة ثانية للإزالة"
    })
  }

  const components = []
  for (let i = 0; i < Math.min(buttons.length, 25); i += 5) {
    const row = new ActionRowBuilder()
    for (const btn of buttons.slice(i, i + 5)) {
      const b = new ButtonBuilder()
        .setCustomId(`brole_${btn.id}`)
        .setLabel(btn.label)
        .setStyle(buttonStyle(btn.color))
      if (btn.emoji) {
        try { b.setEmoji(btn.emoji) } catch {}
      }
      row.addComponents(b)
    }
    components.push(row)
  }

  return { embeds: [embed], components }
}

// ══════════════════════════════════════
//  COLOR CHOICES (مشتركة بين الأوامر)
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
  getPanelButtons,
  getAllPanels,
  colorToHex,
  buttonStyle,
  buildPanelMessage,
  COLOR_CHOICES,
  COLOR_CHOICES_NO_GOLD
}