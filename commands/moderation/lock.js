const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("قفل")
    .setDescription("قفل قناة ومنع الأعضاء من الكتابة فيها")
    .setNameLocalizations({ "en-US": "lock", "en-GB": "lock" })
    .setDescriptionLocalizations({
      "en-US": "Lock a channel and prevent members from sending messages",
      "en-GB": "Lock a channel and prevent members from sending messages"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المراد قفلها (الحالية إذا ما حددت)")
        .setNameLocalizations({ "en-US": "channel", "en-GB": "channel" })
        .setDescriptionLocalizations({ "en-US": "Channel to lock (current if not specified)", "en-GB": "Channel to lock (current if not specified)" })
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب قفل القناة (اختياري)")
        .setNameLocalizations({ "en-US": "reason", "en-GB": "reason" })
        .setDescriptionLocalizations({ "en-US": "Reason for locking (optional)", "en-GB": "Reason for locking (optional)" })
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
      const currentSendPerms = currentPerms?.deny?.has(PermissionFlagsBits.SendMessages)

      // ✅ تحقق: القناة مقفلة بالفعل
      if (currentSendPerms) {
        return interaction.reply({ content: "⚠️ هذي القناة مقفلة بالفعل.", ephemeral: true })
      }

      // ✅ تنفيذ القفل
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
        AddReactions: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false
      }, { reason: `${reason} | بواسطة: ${interaction.user.username}` })

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("🔒 تم قفل القناة")
        .addFields(
          { name: "📍 القناة", value: `${targetChannel}`, inline: true },
          { name: "📝 السبب", value: reason, inline: true },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: false }
        )
        .setFooter({ text: "استخدم /فتح لفتح القناة مرة ثانية" })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // ✅ رسالة في القناة المقفلة (لو مو نفس القناة)
      if (targetChannel.id !== interaction.channel.id) {
        try {
          await targetChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xef4444)
                .setDescription(`🔒 **تم قفل القناة** بواسطة ${interaction.user}\n📝 السبب: ${reason}`)
            ]
          })
        } catch {
          // لو ما قدر يرسل — نتجاهل
        }
      }

    } catch (err) {
      console.error("[LOCK ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء قفل القناة.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء قفل القناة.", ephemeral: true })
    }
  },
}