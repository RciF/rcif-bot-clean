const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فتح")
    .setDescription("فتح قناة مقفلة والسماح للأعضاء بالكتابة")
    .setNameLocalizations({ "en-US": "unlock", "en-GB": "unlock" })
    .setDescriptionLocalizations({
      "en-US": "Unlock a locked channel and allow members to send messages",
      "en-GB": "Unlock a locked channel and allow members to send messages"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المراد فتحها (الحالية إذا ما حددت)")
        .setNameLocalizations({ "en-US": "channel", "en-GB": "channel" })
        .setDescriptionLocalizations({ "en-US": "Channel to unlock (current if not specified)", "en-GB": "Channel to unlock (current if not specified)" })
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب فتح القناة (اختياري)")
        .setNameLocalizations({ "en-US": "reason", "en-GB": "reason" })
        .setDescriptionLocalizations({ "en-US": "Reason for unlocking (optional)", "en-GB": "Reason for unlocking (optional)" })
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ تحقق: داخل سيرفر فقط
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetChannel = interaction.options.getChannel("القناة") || interaction.channel
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ تحقق: صلاحية البوت
      const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me)
      if (!botPermissions || !botPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة القنوات** في هذي القناة.", ephemeral: true })
      }

      // ✅ جلب صلاحيات @everyone الحالية
      const everyoneRole = interaction.guild.roles.everyone
      const currentPerms = targetChannel.permissionOverwrites.cache.get(everyoneRole.id)
      const isLocked = currentPerms?.deny?.has(PermissionFlagsBits.SendMessages)

      // ✅ تحقق: القناة مفتوحة أصلاً
      if (!isLocked) {
        return interaction.reply({ content: "⚠️ هذي القناة مفتوحة أصلاً ومو مقفلة.", ephemeral: true })
      }

      // ✅ تنفيذ الفتح
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null,
        AddReactions: null,
        CreatePublicThreads: null,
        CreatePrivateThreads: null
      }, { reason: `${reason} | بواسطة: ${interaction.user.username}` })

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🔓 تم فتح القناة")
        .addFields(
          { name: "📍 القناة", value: `${targetChannel}`, inline: true },
          { name: "📝 السبب", value: reason, inline: true },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false }
        )
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // ✅ رسالة في القناة المفتوحة (لو مو نفس القناة)
      if (targetChannel.id !== interaction.channel.id) {
        try {
          await targetChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x22c55e)
                .setDescription(`🔓 **تم فتح القناة** بواسطة ${interaction.user}\n📝 السبب: ${reason}`)
            ]
          })
        } catch {
          // لو ما قدر يرسل — نتجاهل
        }
      }

    } catch (err) {
      console.error("[UNLOCK ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء فتح القناة.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء فتح القناة.", ephemeral: true })
    }
  },
}