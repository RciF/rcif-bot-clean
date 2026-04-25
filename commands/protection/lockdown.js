// ══════════════════════════════════════════════════════════════════
//  /حماية لوكداون — تفعيل أو إيقاف Lockdown يدوياً
//  المسار: commands/protection/lockdown.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleLockdown(interaction, guildId) {
  const action = interaction.options.getString("الإجراء")
  const reason = interaction.options.getString("السبب") || "تفعيل يدوي من الأدمن"
  const settings = await protectionSystem.getSettings(guildId) || {}

  await interaction.deferReply()

  // ══════════════════════════════════════
  //  تفعيل Lockdown
  // ══════════════════════════════════════
  if (action === "on") {
    if (protectionSystem.isInLockdown(guildId)) {
      return interaction.editReply({
        content: "⚠️ السيرفر في Lockdown بالفعل."
      })
    }

    await protectionSystem.activateLockdown(interaction.guild, settings)

    const embed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle("🔒 تم تفعيل Lockdown")
      .setDescription("تم قفل جميع القنوات النصية.\nسيتم الرفع تلقائياً بعد 10 دقائق.")
      .addFields(
        { name: "📝 السبب",   value: reason,                inline: true },
        { name: "👮 بواسطة",  value: `${interaction.user}`, inline: true }
      )
      .setTimestamp()

    // ✅ إرسال للوق
    await protectionSystem.sendLog(interaction.guild, settings, embed)

    return interaction.editReply({ embeds: [embed] })
  }

  // ══════════════════════════════════════
  //  إيقاف Lockdown
  // ══════════════════════════════════════
  if (!protectionSystem.isInLockdown(guildId)) {
    return interaction.editReply({
      content: "⚠️ السيرفر ليس في Lockdown."
    })
  }

  await protectionSystem.deactivateLockdown(interaction.guild, settings)

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle("🔓 تم رفع Lockdown")
    .setDescription("تم فتح جميع القنوات النصية.")
    .addFields(
      { name: "📝 السبب",   value: reason,                inline: true },
      { name: "👮 بواسطة",  value: `${interaction.user}`, inline: true }
    )
    .setTimestamp()

  await protectionSystem.sendLog(interaction.guild, settings, embed)

  return interaction.editReply({ embeds: [embed] })
}