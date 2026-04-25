// ══════════════════════════════════════════════════════════════════
//  /ترحيب ضبط — ضبط إعدادات الترحيب والوداع
//  المسار: commands/admin/welcome/set.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS, parseMessage } = require("./_shared")

module.exports = async function handleSet(interaction, guildId) {
  const welcomeChannel = interaction.options.getChannel("قناة_الترحيب")
  const goodbyeChannel = interaction.options.getChannel("قناة_الوداع")

  // ✅ تحويل \n النصي لسطر جديد حقيقي
  const welcomeMsg = parseMessage(interaction.options.getString("رسالة_الترحيب"))
  const goodbyeMsg = parseMessage(interaction.options.getString("رسالة_الوداع"))

  await databaseSystem.query(`
    INSERT INTO welcome_settings 
    (guild_id, welcome_channel_id, goodbye_channel_id, welcome_message, goodbye_message, enabled)
    VALUES ($1, $2, $3, $4, $5, true)
    ON CONFLICT (guild_id) DO UPDATE SET
      welcome_channel_id = $2,
      goodbye_channel_id = $3,
      welcome_message = COALESCE($4, welcome_settings.welcome_message),
      goodbye_message = COALESCE($5, welcome_settings.goodbye_message),
      enabled = true
  `, [
    guildId,
    welcomeChannel.id,
    goodbyeChannel?.id || null,
    welcomeMsg || null,
    goodbyeMsg || null
  ])

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle("✅ تم ضبط نظام الترحيب")
    .addFields(
      { name: "📥 قناة الترحيب", value: `${welcomeChannel}`, inline: true },
      {
        name: "📤 قناة الوداع",
        value: goodbyeChannel ? `${goodbyeChannel}` : "غير محددة",
        inline: true
      },
      {
        name: "💬 رسالة الترحيب",
        value: welcomeMsg
          ? `\`\`\`${welcomeMsg.slice(0, 200)}\`\`\``
          : "افتراضية",
        inline: false
      },
      {
        name: "💬 رسالة الوداع",
        value: goodbyeMsg
          ? `\`\`\`${goodbyeMsg.slice(0, 200)}\`\`\``
          : "افتراضية",
        inline: false
      }
    )
    .setFooter({ text: "متغيرات: {user} {username} {server} {count} — \\n للسطر الجديد" })
    .setTimestamp()

  return interaction.reply({ embeds: [embed] })
}