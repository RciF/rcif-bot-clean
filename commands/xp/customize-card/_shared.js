// ══════════════════════════════════════════════════════════════════
//  CUSTOMIZE-CARD COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

const cardCustomizationSystem = require("../../../systems/cardCustomizationSystem")

// ── ألوان الثيمات ──
const THEME_CHOICES = [
  { name: "🟡 ذهبي (افتراضي)", value: "amber"  },
  { name: "🔵 أزرق",           value: "blue"   },
  { name: "🟣 بنفسجي",         value: "purple" },
  { name: "🟢 أخضر",           value: "green"  },
  { name: "🔴 أحمر",           value: "red"    },
  { name: "🩷 وردي",           value: "pink"   },
  { name: "🩵 سماوي",          value: "cyan"   },
  { name: "🟠 برتقالي",        value: "orange" },
  { name: "⚪ أبيض",           value: "white"  },
]

// ── ألوان الـ Embeds ──
const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6,
  neutral: 0x5865f2,
  premium: 0xf59e0b,
}

// ── التحقق من Premium ──
async function requirePremium(interaction) {
  const premium = await cardCustomizationSystem.isPremium(interaction.user.id)

  if (!premium) {
    const { EmbedBuilder } = require("discord.js")
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.premium)
          .setTitle("👑 يحتاج اشتراك شخصي")
          .setDescription("تخصيص البطاقة متاح للمشتركين فقط")
          .addFields(
            { name: "💳 الأسعار",     value: "**$2.99/شهر** أو **$18/سنة**",       inline: true },
            { name: "✨ المميزات",    value: "خلفية مخصصة\nلون ثيم\nصورة شخصية\nشارة Premium", inline: true },
            { name: "📩 كيف أشترك؟", value: "تواصل مع إدارة البوت",               inline: false }
          )
          .setFooter({ text: "التخصيص عالمي — يظهر في كل السيرفرات" })
          .setTimestamp()
      ],
      flags: 64
    })
    return false
  }

  return true
}

module.exports = {
  THEME_CHOICES,
  COLORS,
  requirePremium
}
