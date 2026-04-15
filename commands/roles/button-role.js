const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
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
//  HELPERS
// ══════════════════════════════════════

function colorToHex(color) {
  const map = {
    "أزرق":    0x5865f2,
    "أخضر":    0x57f287,
    "أحمر":    0xed4245,
    "ذهبي":    0xfbbf24,
    "بنفسجي":  0xa855f7,
    "سماوي":   0x00c8ff,
    "رمادي":   0x4f545c,
    "أبيض":    0xffffff
  }
  return map[color] || 0x5865f2
}

function buttonStyle(color) {
  const map = {
    "أزرق":    ButtonStyle.Primary,
    "بنفسجي":  ButtonStyle.Primary,
    "سماوي":   ButtonStyle.Primary,
    "أخضر":    ButtonStyle.Success,
    "أحمر":    ButtonStyle.Danger,
    "رمادي":   ButtonStyle.Secondary,
    "ذهبي":    ButtonStyle.Secondary,
    "أبيض":    ButtonStyle.Secondary
  }
  return map[color] || ButtonStyle.Primary
}

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
//  COMMAND DEFINITION
// ══════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوحة-رتب")
    .setDescription("نظام الرتب بالأزرار")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)

    .addSubcommand(sub => sub
      .setName("إنشاء")
      .setDescription("إنشاء لوحة رتب جديدة")
      .addStringOption(o => o.setName("العنوان").setDescription("عنوان اللوحة").setRequired(true))
      .addStringOption(o => o.setName("الوصف").setDescription("وصف اللوحة").setRequired(false))
      .addStringOption(o => o
        .setName("اللون").setDescription("لون الـ Embed").setRequired(false)
        .addChoices(
          { name: "💙 أزرق",   value: "أزرق"   },
          { name: "💚 أخضر",   value: "أخضر"   },
          { name: "❤️ أحمر",   value: "أحمر"   },
          { name: "💛 ذهبي",   value: "ذهبي"   },
          { name: "💜 بنفسجي", value: "بنفسجي" },
          { name: "🩵 سماوي",  value: "سماوي"  },
          { name: "🩶 رمادي",  value: "رمادي"  }
        )
      )
      .addStringOption(o => o.setName("صورة").setDescription("رابط صورة كبيرة").setRequired(false))
      .addStringOption(o => o.setName("ثمبنيل").setDescription("رابط صورة صغيرة").setRequired(false))
      .addBooleanOption(o => o.setName("حصري").setDescription("رتبة واحدة فقط من اللوحة؟").setRequired(false))
    )

    .addSubcommand(sub => sub
      .setName("إضافة")
      .setDescription("إضافة زر رتبة للوحة")
      .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true))
      .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة").setRequired(true))
      .addStringOption(o => o.setName("النص").setDescription("نص الزر").setRequired(true))
      .addStringOption(o => o.setName("الإيموجي").setDescription("إيموجي الزر").setRequired(false))
      .addStringOption(o => o
        .setName("اللون").setDescription("لون الزر").setRequired(false)
        .addChoices(
          { name: "💙 أزرق",   value: "أزرق"   },
          { name: "💚 أخضر",   value: "أخضر"   },
          { name: "❤️ أحمر",   value: "أحمر"   },
          { name: "💜 بنفسجي", value: "بنفسجي" },
          { name: "🩵 سماوي",  value: "سماوي"  },
          { name: "🩶 رمادي",  value: "رمادي"  }
        )
      )
    )

    .addSubcommand(sub => sub
      .setName("حذف-زر")
      .setDescription("حذف زر رتبة من لوحة")
      .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true))
      .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة اللي تبي تحذفها").setRequired(true))
    )

    .addSubcommand(sub => sub
      .setName("تعديل")
      .setDescription("تعديل لوحة موجودة")
      .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true))
      .addStringOption(o => o.setName("العنوان").setDescription("عنوان جديد").setRequired(false))
      .addStringOption(o => o.setName("الوصف").setDescription("وصف جديد").setRequired(false))
      .addStringOption(o => o
        .setName("اللون").setDescription("لون جديد").setRequired(false)
        .addChoices(
          { name: "💙 أزرق",   value: "أزرق"   },
          { name: "💚 أخضر",   value: "أخضر"   },
          { name: "❤️ أحمر",   value: "أحمر"   },
          { name: "💛 ذهبي",   value: "ذهبي"   },
          { name: "💜 بنفسجي", value: "بنفسجي" },
          { name: "🩵 سماوي",  value: "سماوي"  },
          { name: "🩶 رمادي",  value: "رمادي"  }
        )
      )
      .addStringOption(o => o.setName("صورة").setDescription("رابط صورة جديدة").setRequired(false))
      .addStringOption(o => o.setName("ثمبنيل").setDescription("رابط ثمبنيل جديد").setRequired(false))
      .addBooleanOption(o => o.setName("حصري").setDescription("تغيير وضع الحصري").setRequired(false))
    )

    .addSubcommand(sub => sub
      .setName("قائمة")
      .setDescription("عرض كل لوحات الرتب")
    )

    .addSubcommand(sub => sub
      .setName("مسح")
      .setDescription("حذف لوحة رتب بالكامل")
      .addStringOption(o => o.setName("معرف_الرسالة").setDescription("ID الرسالة").setRequired(true))
    ),

  // ══════════════════════════════════════
  //  EXECUTE
  // ══════════════════════════════════════

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للإدارة فقط", ephemeral: true })
      }

      await ensureTable()

      const sub = interaction.options.getSubcommand()

      if (sub === "إنشاء")    return await handleCreate(interaction)
      if (sub === "إضافة")    return await handleAdd(interaction)
      if (sub === "حذف-زر")   return await handleRemove(interaction)
      if (sub === "تعديل")    return await handleEdit(interaction)
      if (sub === "قائمة")    return await handleList(interaction)
      if (sub === "مسح")      return await handleDelete(interaction)

    } catch (err) {
      console.error("[BUTTON-ROLE ERROR]", err)
      const msg = "❌ حدث خطأ في نظام الرتب بالأزرار."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}

// ══════════════════════════════════════
//  CREATE
// ══════════════════════════════════════

async function handleCreate(interaction) {
  const title     = interaction.options.getString("العنوان")
  const desc      = interaction.options.getString("الوصف")
  const color     = interaction.options.getString("اللون") || "أزرق"
  const image     = interaction.options.getString("صورة")
  const thumbnail = interaction.options.getString("ثمبنيل")
  const exclusive = interaction.options.getBoolean("حصري") ?? false

  await interaction.deferReply({ ephemeral: true })

  const panelData = { title, description: desc, color, image_url: image, thumbnail, exclusive }
  const { embeds, components } = await buildPanelMessage(panelData, [])
  const sent = await interaction.channel.send({ embeds, components })

  await databaseSystem.query(`
    INSERT INTO button_role_panels
    (guild_id, channel_id, message_id, title, description, color, image_url, thumbnail, exclusive)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    interaction.guild.id, interaction.channel.id, sent.id,
    title, desc || null, color, image || null, thumbnail || null, exclusive
  ])

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ تم إنشاء اللوحة")
        .addFields(
          { name: "📌 ID الرسالة", value: `\`${sent.id}\``, inline: true },
          { name: "⚡ حصري", value: exclusive ? "نعم — رتبة واحدة فقط" : "لا — أكثر من رتبة", inline: true },
          { name: "➕ الخطوة التالية", value: `استخدم \`/لوحة-رتب إضافة\` وأدخل ID: \`${sent.id}\`` }
        )
    ]
  })
}

// ══════════════════════════════════════
//  ADD
// ══════════════════════════════════════

async function handleAdd(interaction) {
  const messageId = interaction.options.getString("معرف_الرسالة").trim()
  const role      = interaction.options.getRole("الرتبة")
  const label     = interaction.options.getString("النص")
  const emoji     = interaction.options.getString("الإيموجي")
  const color     = interaction.options.getString("اللون") || "أزرق"

  await interaction.deferReply({ ephemeral: true })

  const panel = await getPanel(messageId)
  if (!panel || panel.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة في السيرفر." })
  }

  const existing = await databaseSystem.queryOne(
    "SELECT id FROM button_roles WHERE message_id = $1 AND role_id = $2",
    [messageId, role.id]
  )
  if (existing) {
    return interaction.editReply({ content: `❌ رتبة ${role} مضافة بالفعل.` })
  }

  const buttons = await getPanelButtons(messageId)
  if (buttons.length >= 25) {
    return interaction.editReply({ content: "❌ وصلت الحد الأقصى (25 زر)." })
  }

  const botMember = interaction.guild.members.me
  if (role.position >= botMember.roles.highest.position) {
    return interaction.editReply({ content: "❌ رتبة البوت أقل من هذه الرتبة، ارفع رتبة البوت أولاً." })
  }

  await databaseSystem.query(`
    INSERT INTO button_roles (guild_id, channel_id, message_id, role_id, label, emoji, color)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [interaction.guild.id, panel.channel_id, messageId, role.id, label, emoji || null, color])

  const newButtons = await getPanelButtons(messageId)
  const channel = interaction.guild.channels.cache.get(panel.channel_id)
  if (channel) {
    try {
      const msg = await channel.messages.fetch(messageId)
      const updated = await buildPanelMessage(panel, newButtons)
      await msg.edit(updated)
    } catch {}
  }

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ تم إضافة الزر")
        .addFields(
          { name: "🏷️ الرتبة", value: `${role}`, inline: true },
          { name: "📝 النص",   value: label,       inline: true },
          { name: "🎨 اللون",  value: color,        inline: true }
        )
    ]
  })
}

// ══════════════════════════════════════
//  REMOVE
// ══════════════════════════════════════

async function handleRemove(interaction) {
  const messageId = interaction.options.getString("معرف_الرسالة").trim()
  const role      = interaction.options.getRole("الرتبة")

  await interaction.deferReply({ ephemeral: true })

  const panel = await getPanel(messageId)
  if (!panel || panel.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة." })
  }

  const deleted = await databaseSystem.query(
    "DELETE FROM button_roles WHERE message_id = $1 AND role_id = $2 RETURNING id",
    [messageId, role.id]
  )

  if (!deleted.rows.length) {
    return interaction.editReply({ content: `❌ رتبة ${role} غير موجودة في هذه اللوحة.` })
  }

  const newButtons = await getPanelButtons(messageId)
  const channel = interaction.guild.channels.cache.get(panel.channel_id)
  if (channel) {
    try {
      const msg = await channel.messages.fetch(messageId)
      const updated = await buildPanelMessage(panel, newButtons)
      await msg.edit(updated)
    } catch {}
  }

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("🗑️ تم حذف الزر")
        .setDescription(`تم حذف زر رتبة ${role} من اللوحة.`)
    ]
  })
}

// ══════════════════════════════════════
//  EDIT
// ══════════════════════════════════════

async function handleEdit(interaction) {
  const messageId = interaction.options.getString("معرف_الرسالة").trim()
  const title     = interaction.options.getString("العنوان")
  const desc      = interaction.options.getString("الوصف")
  const color     = interaction.options.getString("اللون")
  const image     = interaction.options.getString("صورة")
  const thumbnail = interaction.options.getString("ثمبنيل")
  const exclusive = interaction.options.getBoolean("حصري")

  await interaction.deferReply({ ephemeral: true })

  const panel = await getPanel(messageId)
  if (!panel || panel.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة." })
  }

  const updates = {}
  if (title !== null)     updates.title = title
  if (desc !== null)      updates.description = desc
  if (color !== null)     updates.color = color
  if (image !== null)     updates.image_url = image
  if (thumbnail !== null) updates.thumbnail = thumbnail
  if (exclusive !== null) updates.exclusive = exclusive

  if (!Object.keys(updates).length) {
    return interaction.editReply({ content: "⚠️ ما حددت أي تعديل." })
  }

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ")
  await databaseSystem.query(
    `UPDATE button_role_panels SET ${sets} WHERE message_id = $1`,
    [messageId, ...Object.values(updates)]
  )

  const updatedPanel = await getPanel(messageId)
  const buttons = await getPanelButtons(messageId)
  const channel = interaction.guild.channels.cache.get(panel.channel_id)
  if (channel) {
    try {
      const msg = await channel.messages.fetch(messageId)
      const updated = await buildPanelMessage(updatedPanel, buttons)
      await msg.edit(updated)
    } catch {}
  }

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle("✏️ تم تعديل اللوحة")
        .setDescription("تم تحديث اللوحة بنجاح.")
    ]
  })
}

// ══════════════════════════════════════
//  LIST
// ══════════════════════════════════════

async function handleList(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const panels = await getAllPanels(interaction.guild.id)

  if (!panels.length) {
    return interaction.editReply({ content: "📭 ما فيه لوحات رتب في هذا السيرفر." })
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📋 لوحات الرتب بالأزرار")
    .setDescription(`إجمالي: **${panels.length}** لوحة`)
    .setTimestamp()

  for (const p of panels.slice(0, 10)) {
    const buttons = await getPanelButtons(p.message_id)
    embed.addFields({
      name: p.title,
      value: [
        `📌 ID: \`${p.message_id}\``,
        `📍 القناة: <#${p.channel_id}>`,
        `🔘 الأزرار: **${buttons.length}**`,
        `⚡ حصري: ${p.exclusive ? "نعم" : "لا"}`
      ].join("\n")
    })
  }

  return interaction.editReply({ embeds: [embed] })
}

// ══════════════════════════════════════
//  DELETE
// ══════════════════════════════════════

async function handleDelete(interaction) {
  const messageId = interaction.options.getString("معرف_الرسالة").trim()

  await interaction.deferReply({ ephemeral: true })

  const panel = await getPanel(messageId)
  if (!panel || panel.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: "❌ ما لقيت هذه اللوحة." })
  }

  await databaseSystem.query("DELETE FROM button_roles WHERE message_id = $1", [messageId])
  await databaseSystem.query("DELETE FROM button_role_panels WHERE message_id = $1", [messageId])

  const channel = interaction.guild.channels.cache.get(panel.channel_id)
  if (channel) {
    try {
      const msg = await channel.messages.fetch(messageId)
      await msg.delete()
    } catch {}
  }

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("🗑️ تم حذف اللوحة")
        .setDescription(`تم حذف لوحة "${panel.title}" بالكامل.`)
    ]
  })
}

// ══════════════════════════════════════
//  BUTTON INTERACTION HANDLER
// ══════════════════════════════════════

module.exports.handleButtonRoleInteraction = async function(interaction) {
  try {
    const btnId = parseInt(interaction.customId.replace("brole_", ""))
    if (isNaN(btnId)) return

    const btnData = await databaseSystem.queryOne(
      "SELECT * FROM button_roles WHERE id = $1",
      [btnId]
    )

    if (!btnData) {
      return interaction.reply({ content: "❌ هذا الزر لم يعد موجوداً.", ephemeral: true })
    }

    const guild  = interaction.guild
    const member = interaction.member
    const role   = guild.roles.cache.get(btnData.role_id)

    if (!role) {
      return interaction.reply({ content: "❌ الرتبة غير موجودة.", ephemeral: true })
    }

    const botMember = guild.members.me
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({ content: "❌ البوت ما يقدر يعطي هذه الرتبة — ارفع رتبة البوت.", ephemeral: true })
    }

    const hasRole = member.roles.cache.has(role.id)

    // ── Exclusive ──
    if (!hasRole) {
      const panel = await getPanel(btnData.message_id)
      if (panel?.exclusive) {
        const allButtons = await getPanelButtons(btnData.message_id)
        for (const btn of allButtons) {
          if (btn.role_id !== role.id && member.roles.cache.has(btn.role_id)) {
            try { await member.roles.remove(btn.role_id, "Button Roles — Exclusive") } catch {}
          }
        }
      }
    }

    // ── Toggle ──
    if (hasRole) {
      await member.roles.remove(role.id, "Button Roles — Remove")
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setDescription(`❌ تم **إزالة** رتبة ${role} منك.`)
        ],
        ephemeral: true
      })
    } else {
      await member.roles.add(role.id, "Button Roles — Add")
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setDescription(`✅ تم **إضافة** رتبة ${role} لك.`)
        ],
        ephemeral: true
      })
    }

  } catch (err) {
    console.error("[BUTTON ROLE INTERACTION ERROR]", err)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ حدث خطأ.", ephemeral: true }).catch(() => {})
    }
  }
}