// ══════════════════════════════════════════════════════════════════
//  /حماية وايتلست — إضافة أو إزالة مستخدم/رتبة من القائمة البيضاء
//  المسار: commands/protection/whitelist.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleWhitelist(interaction, guildId) {
  const type   = interaction.options.getString("النوع")
  const action = interaction.options.getString("الإجراء")
  const user   = interaction.options.getUser("المستخدم")
  const role   = interaction.options.getRole("الرتبة")

  // ✅ تحقق من المدخلات
  if (type === "user" && !user) {
    return interaction.reply({
      content: "❌ يجب تحديد مستخدم.",
      ephemeral: true
    })
  }
  if (type === "role" && !role) {
    return interaction.reply({
      content: "❌ يجب تحديد رتبة.",
      ephemeral: true
    })
  }

  const current = await protectionSystem.getSettings(guildId) || {}
  let wlUsers = current.whitelist_users || []
  let wlRoles = current.whitelist_roles || []

  // ══════════════════════════════════════
  //  معالجة الإضافة/الإزالة
  // ══════════════════════════════════════
  if (type === "user") {
    if (action === "add") {
      if (!wlUsers.includes(user.id)) wlUsers.push(user.id)
    } else {
      wlUsers = wlUsers.filter(id => id !== user.id)
    }
  } else {
    if (action === "add") {
      if (!wlRoles.includes(role.id)) wlRoles.push(role.id)
    } else {
      wlRoles = wlRoles.filter(id => id !== role.id)
    }
  }

  await protectionSystem.saveSettings(guildId, {
    ...current,
    whitelist_users: wlUsers,
    whitelist_roles: wlRoles
  })

  const target = type === "user" ? user.toString() : role.toString()
  const actionText = action === "add" ? "تمت الإضافة ➕" : "تمت الإزالة ➖"

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(action === "add" ? COLORS.success : COLORS.danger)
        .setTitle(`🔐 القائمة البيضاء — ${actionText}`)
        .addFields(
          {
            name: type === "user" ? "👤 المستخدم" : "🏷️ الرتبة",
            value: target,
            inline: true
          },
          {
            name: "📊 إجمالي",
            value: `👤 ${wlUsers.length} مستخدم | 🏷️ ${wlRoles.length} رتبة`,
            inline: true
          }
        )
        .setTimestamp()
    ]
  })
}