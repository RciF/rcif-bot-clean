const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("صورة")
    .setDescription("عرض صورة عضو بجودة عالية")
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("اختر العضو (اتركه فاضي لعرض صورتك)")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("النوع")
        .setDescription("نوع الصورة")
        .setRequired(false)
        .addChoices(
          { name: "🖼️ صورة البروفايل | Avatar",  value: "avatar" },
          { name: "🎨 البانر | Banner",            value: "banner" }
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      await interaction.deferReply()

      const targetUser = interaction.options.getUser("العضو") || interaction.user
      const type       = interaction.options.getString("النوع") || "avatar"

      // ✅ جلب المستخدم بكل التفاصيل (عشان نحصل البانر)
      const fetchedUser = await targetUser.fetch()
      const member      = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      // ✅ صورة البروفايل
      if (type === "avatar") {

        // صورة السيرفر (لو عنده كنية مخصصة في السيرفر)
        const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 })
        const globalAvatar = fetchedUser.displayAvatarURL({ dynamic: true, size: 4096 })

        const hasServerAvatar = serverAvatar && serverAvatar !== globalAvatar

        // ✅ روابط التحميل بكل الصيغ
        const formats = ["png", "jpg", "webp"]
        if (fetchedUser.avatar?.startsWith("a_")) formats.unshift("gif")

        const downloadLinks = formats
          .map(f => `[${f.toUpperCase()}](${fetchedUser.displayAvatarURL({ extension: f, size: 4096 })})`)
          .join(" | ")

        const embed = new EmbedBuilder()
          .setColor(member?.roles.highest?.color || 0x5865f2)
          .setTitle(`🖼️ صورة ${member?.displayName || fetchedUser.username}`)
          .setImage(hasServerAvatar ? serverAvatar : globalAvatar)
          .addFields({
            name: "📥 تحميل",
            value: downloadLinks,
            inline: false
          })
          .setFooter({
            text: `طلب من: ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp()

        // ✅ أزرار التبديل بين صورة السيرفر والعالمية
        const components = []

        if (hasServerAvatar) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("show_global")
              .setLabel("الصورة العالمية")
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("🌐"),
            new ButtonBuilder()
              .setCustomId("show_server")
              .setLabel("صورة السيرفر")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("🏠")
          )
          components.push(row)
        }

        const response = await interaction.editReply({
          embeds: [embed],
          components
        })

        // ✅ انتظار الأزرار لو موجودة
        if (hasServerAvatar) {
          const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
          })

          collector.on("collect", async i => {
            try {
              const showGlobal = i.customId === "show_global"
              const newImage   = showGlobal ? globalAvatar : serverAvatar

              await i.update({
                embeds: [
                  EmbedBuilder.from(embed)
                    .setImage(newImage)
                    .setTitle(`🖼️ صورة ${member?.displayName || fetchedUser.username} ${showGlobal ? "(عالمية)" : "(السيرفر)"}`)
                ],
                components
              })
            } catch {}
          })

          collector.on("end", async () => {
            try {
              await interaction.editReply({ components: [] })
            } catch {}
          })
        }

        return

      }

      // ✅ البانر
      if (type === "banner") {
        const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 4096 })

        if (!bannerURL) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x64748b)
                .setTitle("🎨 لا يوجد بانر")
                .setDescription(`${fetchedUser} ما عنده بانر مضاف على حسابه.`)
                .setThumbnail(fetchedUser.displayAvatarURL({ dynamic: true, size: 128 }))
                .setTimestamp()
            ]
          })
        }

        const formats = ["png", "jpg", "webp"]
        if (fetchedUser.banner?.startsWith("a_")) formats.unshift("gif")

        const downloadLinks = formats
          .map(f => `[${f.toUpperCase()}](${fetchedUser.bannerURL({ extension: f, size: 4096 })})`)
          .join(" | ")

        const embed = new EmbedBuilder()
          .setColor(fetchedUser.accentColor || member?.roles.highest?.color || 0x5865f2)
          .setTitle(`🎨 بانر ${member?.displayName || fetchedUser.username}`)
          .setImage(bannerURL)
          .addFields({
            name: "📥 تحميل",
            value: downloadLinks,
            inline: false
          })
          .setFooter({
            text: `طلب من: ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp()

        return interaction.editReply({ embeds: [embed] })
      }

    } catch (error) {
      console.error("[AVATAR ERROR]", error)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حصل خطأ في عرض الصورة" })
      }
      return interaction.reply({
        content: "❌ حصل خطأ في عرض الصورة",
        ephemeral: true
      })
    }
  },
}