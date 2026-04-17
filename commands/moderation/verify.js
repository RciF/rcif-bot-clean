// commands/moderation/verify.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

// ← حط الـ IDs هنا بعد ما تشغّل setup-server.js
const MEMBER_ROLE_ID  = process.env.VERIFY_MEMBER_ROLE_ID  || ""
const NEW_MEMBER_ROLE = process.env.VERIFY_NEW_ROLE_ID      || ""

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("تحقق من حسابك للوصول للسيرفر")
    .setDMPermission(false),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const member = interaction.member

      // تحقق: هل عنده رول عضو بالفعل؟
      if (MEMBER_ROLE_ID && member.roles.cache.has(MEMBER_ROLE_ID)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x22C55E)
              .setTitle("✅ أنت موثّق بالفعل!")
              .setDescription("لديك صلاحية الوصول لكل قنوات السيرفر.")
              .setTimestamp()
          ],
          ephemeral: true
        })
      }

      // إعطاء رول عضو
      if (MEMBER_ROLE_ID) {
        await member.roles.add(MEMBER_ROLE_ID, "Verification")
      }

      // إزالة رول جديد
      if (NEW_MEMBER_ROLE && member.roles.cache.has(NEW_MEMBER_ROLE)) {
        await member.roles.remove(NEW_MEMBER_ROLE, "Verified")
      }

      const embed = new EmbedBuilder()
        .setColor(0x22C55E)
        .setTitle("✅ تم التحقق بنجاح!")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`مرحباً **${interaction.user.username}**! 🎉\nتم منحك صلاحية الوصول للسيرفر.`)
        .addFields(
          { name: "🌐 الداشبورد", value: "https://rcif-dashboard.onrender.com", inline: true },
          { name: "💰 الاشتراكات", value: "اطّلع على خطط الاشتراك في قناة #الاشتراكات", inline: true }
        )
        .setFooter({ text: "Lyn Bot — بوت عربي متكامل" })
        .setTimestamp()

      return interaction.reply({ embeds: [embed], ephemeral: true })

    } catch (err) {
      console.error("[VERIFY ERROR]", err)
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء التحقق.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء التحقق.", ephemeral: true })
    }
  }
}