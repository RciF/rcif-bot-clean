// ═══════════════════════════════════════════════════════════
//  Lyn Support Server — Setup Script
//  شغّله مرة وحدة فقط: node setup-server.js
//  ⚠️ يحذف كل القنوات والرولات الحالية
// ═══════════════════════════════════════════════════════════

require("dotenv").config()
const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = require("discord.js")

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
})

const GUILD_ID = "1490775708291694684" // ← حط ID سيرفرك هنا

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function safeDelete(item) {
  try { await item.delete() } catch {}
  await sleep(300)
}

async function makeChannel(guild, opts) {
  await sleep(400)
  return guild.channels.create(opts)
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`)

  const guild = await client.guilds.fetch(GUILD_ID)
  if (!guild) { console.error("❌ Guild not found"); process.exit(1) }

  // ───────────────────────────────────────────────
  //  1. حذف القنوات الحالية
  // ───────────────────────────────────────────────
  console.log("\n🗑️  Deleting all channels...")
  const channels = await guild.channels.fetch()
  for (const [, ch] of channels) await safeDelete(ch)

  // ───────────────────────────────────────────────
  //  2. حذف الرولات الحالية
  // ───────────────────────────────────────────────
  console.log("🗑️  Deleting all roles...")
  const roles = await guild.roles.fetch()
  for (const [, role] of roles) {
    if (role.id === guild.id || role.managed) continue
    await safeDelete(role)
  }

  // ───────────────────────────────────────────────
  //  3. إنشاء الرولات
  // ───────────────────────────────────────────────
  console.log("\n🎭 Creating roles...")

  // @everyone — أقل صلاحية (يشوف قنوات الترحيب فقط)
  await guild.roles.everyone.edit({
    permissions: [PermissionFlagsBits.ViewChannel]
  })
  await sleep(300)

  // ── الإدارة ──
  const ownerRole = await guild.roles.create({
    name: "👑 المالك", color: 0xFFD700, hoist: true,
    permissions: [PermissionFlagsBits.Administrator]
  })
  await sleep(300)

  const adminRole = await guild.roles.create({
    name: "⚙️ الإدارة", color: 0xFF4444, hoist: true,
    permissions: [PermissionFlagsBits.Administrator]
  })
  await sleep(300)

  const devRole = await guild.roles.create({
    name: "🔧 المطور", color: 0x00C8FF, hoist: true,
    permissions: [PermissionFlagsBits.Administrator]
  })
  await sleep(300)

  const supportRole = await guild.roles.create({
    name: "🎫 فريق الدعم", color: 0x00FFE7, hoist: true,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.MoveMembers,
    ]
  })
  await sleep(300)

  // ── الاشتراكات ──
  const diamondRole = await guild.roles.create({
    name: "💎 Diamond", color: 0x00FFE7, hoist: true,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ]
  })
  await sleep(300)

  const goldRole = await guild.roles.create({
    name: "👑 Gold", color: 0xFFD700, hoist: true,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ]
  })
  await sleep(300)

  const silverRole = await guild.roles.create({
    name: "⭐ Silver", color: 0x94A3B8, hoist: true,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ]
  })
  await sleep(300)

  // ── الأعضاء ──
  const memberRole = await guild.roles.create({
    name: "✅ عضو", color: 0x22C55E, hoist: true,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.UseApplicationCommands,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ]
  })
  await sleep(300)

  const newMemberRole = await guild.roles.create({
    name: "👤 جديد", color: 0x64748B, hoist: false,
    permissions: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ReadMessageHistory,
    ]
  })
  await sleep(300)

  const botRole = await guild.roles.create({
    name: "🤖 البوتات", color: 0x5865F2, hoist: true,
    permissions: [PermissionFlagsBits.Administrator]
  })
  await sleep(300)

  console.log("✅ Roles created!")

  // ───────────────────────────────────────────────
  //  4. Permission Builders
  // ───────────────────────────────────────────────

  const ADMIN_ROLES  = [ownerRole, adminRole, devRole]
  const SUB_ROLES    = [diamondRole, goldRole, silverRole]
  const ALL_MEMBERS  = [diamondRole, goldRole, silverRole, memberRole]
  const SUPPORT_TEAM = [ownerRole, adminRole, devRole, supportRole]

  // قناة للقراءة فقط (كل الأعضاء)
  const readOnly = (extra = []) => [
    { id: guild.id,    deny:  [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions] },
    ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] })),
    ...extra
  ]

  // قناة للأعضاء الموثّقين فقط
  const membersOnly = (extra = []) => [
    { id: guild.id,    deny:  [PermissionFlagsBits.ViewChannel] },
    { id: newMemberRole, deny: [PermissionFlagsBits.ViewChannel] },
    ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
    ...extra
  ]

  // قناة للمشتركين فقط
  const subsOnly = (roles = SUB_ROLES, extra = []) => [
    { id: guild.id,    deny:  [PermissionFlagsBits.ViewChannel] },
    ...roles.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
    ...SUPPORT_TEAM.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] })),
    ...extra
  ]

  // قناة للإدارة فقط
  const adminOnly = (extra = []) => [
    { id: guild.id,   deny: [PermissionFlagsBits.ViewChannel] },
    ...ADMIN_ROLES.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
    ...extra
  ]

  // قناة للوق (قراءة للإدارة فقط، كتابة للبوت)
  const logChannel = (extra = []) => [
    { id: guild.id,   deny: [PermissionFlagsBits.ViewChannel] },
    ...ADMIN_ROLES.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] })),
    { id: botRole,    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ...extra
  ]

  // قناة الفيريفيكيشن (كل الناس تشوف وتكتب)
  const verifyChannel = [
    { id: guild.id,        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: newMemberRole,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    { id: memberRole,      deny:  [PermissionFlagsBits.SendMessages] },
  ]

  // قناة عامة للقراءة (كل الناس تشوف)
  const publicRead = [
    { id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
    ...ADMIN_ROLES.map(r => ({ id: r, allow: [PermissionFlagsBits.SendMessages] }))
  ]

  // ───────────────────────────────────────────────
  //  5. إنشاء القنوات
  // ───────────────────────────────────────────────
  console.log("\n📁 Creating channels...")

  // ════════════════════════════════
  //  🌟 الترحيب — يشوفه الكل
  // ════════════════════════════════
  const welcomeCat = await makeChannel(guild, {
    name: "━━━━ 🌟 الترحيب ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, allow: [PermissionFlagsBits.ViewChannel] }
    ]
  })

  // التحقق — يكتب فيه الجدد فقط
  await makeChannel(guild, {
    name: "✅│التحقق",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "اكتب /verify أو اضغط الزر للحصول على رول عضو والوصول للسيرفر",
    permissionOverwrites: verifyChannel
  })

  await makeChannel(guild, {
    name: "👋│الترحيب",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "رسائل الترحيب بالأعضاء الجدد",
    permissionOverwrites: publicRead
  })

  await makeChannel(guild, {
    name: "📋│القوانين",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "قوانين السيرفر — اقرأها قبل المشاركة",
    permissionOverwrites: publicRead
  })

  await makeChannel(guild, {
    name: "📢│الإعلانات",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "إعلانات البوت والتحديثات المهمة",
    permissionOverwrites: publicRead
  })

  await makeChannel(guild, {
    name: "🔄│التحديثات",
    type: ChannelType.GuildText,
    parent: welcomeCat,
    topic: "Changelog — آخر تحديثات البوت",
    permissionOverwrites: publicRead
  })

  // ════════════════════════════════
  //  💬 عام — للأعضاء الموثّقين
  // ════════════════════════════════
  const generalCat = await makeChannel(guild, {
    name: "━━━━ 💬 عام ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id,        deny:  [PermissionFlagsBits.ViewChannel] },
      { id: newMemberRole,   deny:  [PermissionFlagsBits.ViewChannel] },
      ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] }))
    ]
  })

  await makeChannel(guild, {
    name: "💬│عام",
    type: ChannelType.GuildText,
    parent: generalCat,
    topic: "الدردشة العامة — تكلم وتفاعل مع المجتمع",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🤖│أوامر-البوت",
    type: ChannelType.GuildText,
    parent: generalCat,
    topic: "استخدم أوامر البوت هنا فقط | Use bot commands here only",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "💡│اقتراحات",
    type: ChannelType.GuildText,
    parent: generalCat,
    topic: "اقترح ميزات وأوامر جديدة للبوت",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🐛│الأخطاء",
    type: ChannelType.GuildText,
    parent: generalCat,
    topic: "أبلغ عن أخطاء البوت هنا مع تفاصيل المشكلة",
    permissionOverwrites: membersOnly()
  })

  // ════════════════════════════════
  //  🤖 معلومات البوت
  // ════════════════════════════════
  const botInfoCat = await makeChannel(guild, {
    name: "━━━━ 🤖 البوت ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id,      deny:  [PermissionFlagsBits.ViewChannel] },
      { id: newMemberRole, deny:  [PermissionFlagsBits.ViewChannel] },
      ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] }))
    ]
  })

  await makeChannel(guild, {
    name: "📖│الأوامر",
    type: ChannelType.GuildText,
    parent: botInfoCat,
    topic: "قائمة جميع أوامر البوت",
    permissionOverwrites: readOnly()
  })

  await makeChannel(guild, {
    name: "💰│الاشتراكات",
    type: ChannelType.GuildText,
    parent: botInfoCat,
    topic: "خطط الاشتراك والأسعار | https://rcif-dashboard.onrender.com",
    permissionOverwrites: readOnly()
  })

  await makeChannel(guild, {
    name: "❓│الأسئلة-الشائعة",
    type: ChannelType.GuildText,
    parent: botInfoCat,
    topic: "أسئلة شائعة عن البوت وإجاباتها",
    permissionOverwrites: readOnly()
  })

  await makeChannel(guild, {
    name: "🔗│ربط-سيرفر",
    type: ChannelType.GuildText,
    parent: botInfoCat,
    topic: "اربط سيرفرك باشتراكك هنا باستخدام /ربط",
    permissionOverwrites: membersOnly()
  })

  // ════════════════════════════════
  //  🎫 الدعم الفني
  // ════════════════════════════════
  const supportCat = await makeChannel(guild, {
    name: "━━━━ 🎫 الدعم الفني ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id,      deny:  [PermissionFlagsBits.ViewChannel] },
      { id: newMemberRole, deny:  [PermissionFlagsBits.ViewChannel] },
      ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] }))
    ]
  })

  await makeChannel(guild, {
    name: "🎫│افتح-تذكرة",
    type: ChannelType.GuildText,
    parent: supportCat,
    topic: "افتح تذكرة دعم فني هنا باستخدام /تذاكر",
    permissionOverwrites: membersOnly()
  })

  await makeChannel(guild, {
    name: "🎯│دعم-أولوية",
    type: ChannelType.GuildText,
    parent: supportCat,
    topic: "دعم فني أولوية — للمشتركين فقط 💎👑⭐",
    permissionOverwrites: subsOnly(SUB_ROLES, [
      { id: supportRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ])
  })

  // ════════════════════════════════
  //  ⭐ المشتركون
  // ════════════════════════════════
  const subsCat = await makeChannel(guild, {
    name: "━━━━ ⭐ المشتركون ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...SUB_ROLES.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] })),
      ...SUPPORT_TEAM.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] }))
    ]
  })

  // فضي+ (كل المشتركين)
  await makeChannel(guild, {
    name: "⭐│silver-وأعلى",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "قناة حصرية لجميع المشتركين ⭐👑💎",
    permissionOverwrites: subsOnly([diamondRole, goldRole, silverRole])
  })

  // ذهبي+
  await makeChannel(guild, {
    name: "👑│gold-وأعلى",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "قناة حصرية لمشتركي Gold وDiamond 👑💎",
    permissionOverwrites: subsOnly([diamondRole, goldRole])
  })

  // ماسي فقط
  await makeChannel(guild, {
    name: "💎│diamond-حصري",
    type: ChannelType.GuildText,
    parent: subsCat,
    topic: "قناة حصرية لمشتركي Diamond فقط 💎",
    permissionOverwrites: subsOnly([diamondRole])
  })

  // ════════════════════════════════
  //  🔊 الصوتية
  // ════════════════════════════════
  const voiceCat = await makeChannel(guild, {
    name: "━━━━ 🔊 الصوتية ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id,      deny:  [PermissionFlagsBits.ViewChannel] },
      { id: newMemberRole, deny:  [PermissionFlagsBits.ViewChannel] },
      ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }))
    ]
  })

  await makeChannel(guild, {
    name: "🔊│عام",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: [
      { id: guild.id,      deny:  [PermissionFlagsBits.ViewChannel] },
      { id: newMemberRole, deny:  [PermissionFlagsBits.ViewChannel] },
      ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }))
    ]
  })

  await makeChannel(guild, {
    name: "🎯│دعم-صوتي",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: [
      { id: guild.id,      deny:  [PermissionFlagsBits.ViewChannel] },
      ...ALL_MEMBERS.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] })),
      { id: supportRole,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers] }
    ]
  })

  await makeChannel(guild, {
    name: "💎│vip-صوتي",
    type: ChannelType.GuildVoice,
    parent: voiceCat,
    permissionOverwrites: [
      { id: guild.id,    deny: [PermissionFlagsBits.ViewChannel] },
      ...SUB_ROLES.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] })),
      ...SUPPORT_TEAM.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }))
    ]
  })

  // ════════════════════════════════
  //  ⚙️ الإدارة (مخفية)
  // ════════════════════════════════
  const adminCat = await makeChannel(guild, {
    name: "━━━━ ⚙️ الإدارة ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...ADMIN_ROLES.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] }))
    ]
  })

  await makeChannel(guild, {
    name: "💬│إدارة-عام",
    type: ChannelType.GuildText,
    parent: adminCat,
    topic: "تنسيق الإدارة",
    permissionOverwrites: adminOnly()
  })

  await makeChannel(guild, {
    name: "⚙️│إعدادات-البوت",
    type: ChannelType.GuildText,
    parent: adminCat,
    topic: "إعدادات البوت — /config /settings",
    permissionOverwrites: adminOnly()
  })

  await makeChannel(guild, {
    name: "👮│سجل-الإشراف",
    type: ChannelType.GuildText,
    parent: adminCat,
    topic: "سجل أعمال الإشراف (بان، كتم، طرد...)",
    permissionOverwrites: logChannel()
  })

  // ════════════════════════════════
  //  📊 اللوقات (مخفية)
  // ════════════════════════════════
  const logsCat = await makeChannel(guild, {
    name: "━━━━ 📊 اللوقات ━━━━",
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...ADMIN_ROLES.map(r => ({ id: r, allow: [PermissionFlagsBits.ViewChannel] })),
      { id: botRole,  allow: [PermissionFlagsBits.ViewChannel] }
    ]
  })

  await makeChannel(guild, {
    name: "📨│لوق-الرسائل",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل حذف وتعديل الرسائل",
    permissionOverwrites: logChannel()
  })

  await makeChannel(guild, {
    name: "👥│لوق-الأعضاء",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل دخول وخروج الأعضاء",
    permissionOverwrites: logChannel()
  })

  await makeChannel(guild, {
    name: "🛡️│لوق-الإشراف",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل أوامر الإشراف (بان، كتم، تحذير...)",
    permissionOverwrites: logChannel()
  })

  await makeChannel(guild, {
    name: "📡│لوق-السيرفر",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل تغييرات السيرفر (قنوات، رولات...)",
    permissionOverwrites: logChannel()
  })

  await makeChannel(guild, {
    name: "🤖│لوق-البوت",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل أخطاء وتحديثات البوت",
    permissionOverwrites: logChannel()
  })

  await makeChannel(guild, {
    name: "💰│لوق-الاشتراكات",
    type: ChannelType.GuildText,
    parent: logsCat,
    topic: "سجل الاشتراكات الجديدة والتجديدات",
    permissionOverwrites: logChannel()
  })

  // ───────────────────────────────────────────────
  //  6. النتيجة النهائية
  // ───────────────────────────────────────────────
  console.log("\n✅ Server setup complete!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("📋 الرولات المنشأة — احفظ هذه الـ IDs:")
  console.log(`  👑 المالك:       ${ownerRole.id}`)
  console.log(`  ⚙️ الإدارة:      ${adminRole.id}`)
  console.log(`  🔧 المطور:       ${devRole.id}`)
  console.log(`  🎫 فريق الدعم:  ${supportRole.id}`)
  console.log(`  💎 Diamond:      ${diamondRole.id}`)
  console.log(`  👑 Gold:         ${goldRole.id}`)
  console.log(`  ⭐ Silver:       ${silverRole.id}`)
  console.log(`  ✅ عضو:          ${memberRole.id}`)
  console.log(`  👤 جديد:         ${newMemberRole.id}`)
  console.log(`  🤖 البوتات:      ${botRole.id}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("📌 الخطوات التالية:")
  console.log("  1. أعطِ نفسك رول 👑 المالك يدوياً")
  console.log("  2. أعطِ البوت رول 🤖 البوتات يدوياً")
  console.log("  3. أضف الـ Role IDs في ملف .env")
  console.log("  4. فعّل Community Server عشان تضيفه في Discovery")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)