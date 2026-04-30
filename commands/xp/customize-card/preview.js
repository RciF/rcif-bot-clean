// ══════════════════════════════════════════════════════════════════
//  /تخصيص_بطاقة معاينة — معاينة البطاقة الحالية
// ══════════════════════════════════════════════════════════════════

const { AttachmentBuilder } = require("discord.js")
const cardCustomizationSystem = require("../../../systems/cardCustomizationSystem")
const { generateRankCard } = require("../../../systems/rankCardSystem")
const levelSystem = require("../../../systems/levelSystem")

module.exports = async function handlePreview(interaction) {
  await interaction.deferReply()

  const userId = interaction.user.id
  const xpData = await levelSystem.getUserXPData(userId, interaction.guild.id)

  if (!xpData) {
    return interaction.editReply({
      content: "❌ ما عندك بيانات XP بعد. اكتب في السيرفر أول!"
    })
  }

  const custom   = await cardCustomizationSystem.getCustomization(userId)
  const isPremium = await cardCustomizationSystem.isPremium(userId)
  const member   = await interaction.guild.members.fetch(userId).catch(() => null)

  try {
    const imageBuffer = await generateRankCard({
      username: member?.displayName || interaction.user.username,
      discriminator: interaction.user.discriminator || "0",
      avatarURL: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
      level: xpData.level,
      rank: xpData.rank,
      currentXP: xpData.currentXP,
      requiredXP: xpData.requiredXP,
      totalXP: xpData.totalXP,
      progressPercent: xpData.progressPercent,
      customization: custom
    })

    const attachment = new AttachmentBuilder(imageBuffer, { name: "rank-preview.png" })

    return interaction.editReply({
      content: isPremium
        ? "✨ **معاينة بطاقتك المخصصة**"
        : "👁️ **معاينة بدون تخصيص** — اشترك لتفعيل التخصيص\n**$2.99/شهر** أو **$18/سنة**",
      files: [attachment]
    })
  } catch (err) {
    console.error("[PREVIEW ERROR]", err)
    return interaction.editReply({ content: "❌ فشل توليد البطاقة." })
  }
}