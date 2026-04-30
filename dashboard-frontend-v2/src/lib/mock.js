/**
 * Mock Data Generator
 */

const sleep = (ms = 500) => new Promise((r) => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════
//  Mock Channels & Roles
// ════════════════════════════════════════════════════════════

const MOCK_CHANNELS = [
  { id: '1001', name: 'عام', type: 0, position: 0 },
  { id: '1002', name: 'دردشة', type: 0, position: 1 },
  { id: '1003', name: 'الترحيب', type: 0, position: 2 },
  { id: '1004', name: 'الإعلانات', type: 0, position: 3 },
  { id: '1005', name: 'السجلات', type: 0, position: 4 },
  { id: '1006', name: 'الموسيقى', type: 2, position: 5 },
  { id: '1007', name: 'الفعاليات', type: 0, position: 6 },
  { id: '1008', name: 'التذاكر', type: 0, position: 7 },
  { id: '1009', name: 'الدعم', type: 0, position: 8 },
  { id: '1010', name: 'النقاشات', type: 0, position: 9 },
];

const MOCK_ROLES = [
  { id: '2001', name: '@everyone', color: 0, position: 0, managed: false },
  { id: '2002', name: 'عضو', color: 0x95a5a6, position: 1, managed: false },
  { id: '2003', name: 'نشط', color: 0x3498db, position: 2, managed: false },
  { id: '2004', name: 'مميز', color: 0x9b59b6, position: 3, managed: false },
  { id: '2005', name: 'VIP', color: 0xf39c12, position: 4, managed: false },
  { id: '2006', name: 'مشرف', color: 0xe74c3c, position: 5, managed: false },
  { id: '2007', name: 'إداري', color: 0xc0392b, position: 6, managed: false },
  { id: '2008', name: 'Lyn Bot', color: 0x9b59b6, position: 7, managed: true },
];

// ════════════════════════════════════════════════════════════
//  AI Settings
// ════════════════════════════════════════════════════════════

const aiSettings = async () => {
  await sleep(400);
  return {
    enabled: true,
    respondToMentions: true,
    respondToReplies: true,
    alwaysRespondChannels: ['1002'],
    persona: 'friendly',
    customPrompt: '',
    blockedWords: ['كلمة1', 'كلمة2'],
    maxResponseLength: 500,
    messagesPerDay: 50,
    allowedChannels: [],
    creativeModelEnabled: false,
    usageToday: 12,
    usageLimit: 30,
  };
};

// ════════════════════════════════════════════════════════════
//  Protection Settings
// ════════════════════════════════════════════════════════════

const protectionSettings = async () => {
  await sleep(400);
  return {
    antiSpam: { enabled: true, maxMessages: 5, timeWindow: 5, action: 'mute', muteDuration: 10 },
    antiRaid: { enabled: false, maxJoins: 10, timeWindow: 30, action: 'lockdown' },
    antiNuke: { enabled: true, maxChannelDeletes: 3, maxRoleDeletes: 3, maxBans: 5, action: 'ban' },
    whitelist: { roles: ['2007'], members: [] },
    logChannel: '1005',
    isLocked: false,
    lockdownStartedAt: null,
  };
};

// ════════════════════════════════════════════════════════════
//  XP / Levels Settings
// ════════════════════════════════════════════════════════════

const xpSettings = async () => {
  await sleep(400);
  return {
    enabled: true,
    minXpPerMessage: 15,
    maxXpPerMessage: 25,
    cooldown: 60,
    multiplier: 1,
    disabledChannels: [],
    disabledRoles: [],
    multipliers: [{ roleId: '2005', multiplier: 2 }],
    roleRewards: [
      { level: 5, roleId: '2002' },
      { level: 10, roleId: '2003' },
      { level: 25, roleId: '2004' },
    ],
    levelUpMessage: { enabled: true, channel: null, template: '🎉 مبروك {user}! وصلت للمستوى {level}' },
  };
};

const xpLeaderboard = async () => {
  await sleep(400);
  return Array.from({ length: 20 }, (_, i) => ({
    rank: i + 1,
    userId: `${1000000 + i}`,
    username: `User${i + 1}`,
    avatar: null,
    level: 50 - i * 2,
    xp: 100000 - i * 5000,
    messages: 5000 - i * 200,
  }));
};

// ════════════════════════════════════════════════════════════
//  Economy Settings
// ════════════════════════════════════════════════════════════

const economySettings = async () => {
  await sleep(400);
  return {
    enabled: true,
    currencySymbol: '🪙',
    currencyName: 'كوينز',
    dailyReward: { min: 100, max: 500 },
    weeklyReward: { min: 1000, max: 5000 },
    messageReward: { min: 1, max: 5, cooldown: 60 },
    workReward: { min: 50, max: 200, cooldown: 3600 },
    startingBalance: 100,
  };
};

const economyShop = async () => {
  await sleep(400);
  return [
    { id: 1, name: 'سيارة', emoji: '🚗', price: 50000, type: 'item', stock: -1, description: 'سيارة فارهة' },
    { id: 2, name: 'بيت', emoji: '🏠', price: 200000, type: 'item', stock: -1, description: 'بيت أحلامك' },
    { id: 3, name: 'رتبة VIP', emoji: '👑', price: 100000, type: 'role', roleId: '2005', stock: -1, description: 'رتبة مميزة' },
    { id: 4, name: 'يخت', emoji: '🛥️', price: 500000, type: 'item', stock: 5, description: 'يخت فاخر — كمية محدودة' },
  ];
};

const economyTopRich = async () => {
  await sleep(400);
  return Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1,
    userId: `${2000000 + i}`,
    username: `Rich${i + 1}`,
    avatar: null,
    coins: 1000000 - i * 80000,
  }));
};

// ════════════════════════════════════════════════════════════
//  Tickets Settings
// ════════════════════════════════════════════════════════════

const ticketsSettings = async () => {
  await sleep(400);
  return {
    enabled: true,
    panelChannel: '1008',
    categoryChannel: '1008',
    staffRole: '2006',
    autoArchiveHours: 48,
    transcripts: { enabled: true, channel: '1005' },
    welcomeMessage: 'أهلاً {user}! الستاف راح يجي قريباً.',
    panel: {
      title: '🎫 لوحة التذاكر',
      description: 'اضغط على الزر المناسب لفتح تذكرة',
      color: 0x9b59b6,
      buttons: [
        { id: 1, label: 'دعم عام', emoji: '💬', style: 'primary', category: 'general' },
        { id: 2, label: 'بلاغ', emoji: '⚠️', style: 'danger', category: 'report' },
        { id: 3, label: 'اقتراح', emoji: '💡', style: 'success', category: 'suggestion' },
      ],
    },
  };
};

const activeTickets = async () => {
  await sleep(400);
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    userId: `${3000000 + i}`,
    username: `User${i + 1}`,
    category: ['general', 'report', 'suggestion'][i % 3],
    channel: `1100${i}`,
    openedAt: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
    staffAssigned: i % 2 ? '2006' : null,
  }));
};

// ════════════════════════════════════════════════════════════
//  Welcome Settings
// ════════════════════════════════════════════════════════════

const welcomeSettings = async () => {
  await sleep(400);
  return {
    enabled: true,
    welcomeChannel: '1003',
    leaveChannel: '1003',
    type: 'embed',
    text: { content: 'أهلاً {user} في {server}! 🎉 صرت العضو رقم {count}' },
    embed: {
      title: 'مرحباً {user}! 👋',
      description: 'أهلاً وسهلاً في **{server}**\n\n• اقرأ القوانين في القنوات المخصصة\n• تعرّف على الأعضاء\n• استمتع بإقامتك معنا!',
      color: 0x9b59b6,
      footer: 'العضو رقم {count}',
      thumbnail: 'avatar',
      image: '',
    },
    leaveEnabled: true,
    leaveMessage: { type: 'text', content: '👋 وداعاً {username}، كنت معنا {duration}' },
    cardEnabled: false,
    cardBackground: 'default',
    mentionUser: true,
  };
};

// ════════════════════════════════════════════════════════════
//  Logs Settings
// ════════════════════════════════════════════════════════════

const logsSettings = async () => {
  await sleep(400);
  return {
    enabled: true,
    masterChannel: '1005',
    useSingleChannel: false,
    events: {
      messageDelete: { enabled: true, channel: '1005' },
      messageEdit: { enabled: true, channel: '1005' },
      memberJoin: { enabled: true, channel: '1005' },
      memberLeave: { enabled: true, channel: '1005' },
      memberBan: { enabled: true, channel: '1005' },
      memberKick: { enabled: true, channel: '1005' },
      memberRoleAdd: { enabled: false, channel: null },
      memberRoleRemove: { enabled: false, channel: null },
      roleCreate: { enabled: false, channel: null },
      roleDelete: { enabled: true, channel: '1005' },
      channelCreate: { enabled: false, channel: null },
      channelDelete: { enabled: true, channel: '1005' },
      voiceJoin: { enabled: false, channel: null },
      voiceLeave: { enabled: false, channel: null },
      voiceMove: { enabled: false, channel: null },
    },
  };
};

// ════════════════════════════════════════════════════════════
//  Moderation
// ════════════════════════════════════════════════════════════

const moderationWarnings = async () => {
  await sleep(400);
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    userId: `${4000000 + i}`,
    username: `Member${i + 1}`,
    count: Math.floor(Math.random() * 5) + 1,
    lastWarning: new Date(Date.now() - i * 1000 * 60 * 60 * 24).toISOString(),
    lastReason: ['سبام', 'كلام غير لائق', 'تجاهل التحذيرات', 'مخالفة القوانين'][i % 4],
    moderatorId: '2007',
    moderatorName: 'Admin',
  }));
};

const moderationBans = async () => {
  await sleep(400);
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    userId: `${5000000 + i}`,
    username: `Banned${i + 1}`,
    reason: ['سبام متكرر', 'سب وشتم', 'محاولة nuke', 'إعلانات'][i % 4],
    bannedAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24 * 2).toISOString(),
    moderatorName: 'Admin',
  }));
};

const moderationMutes = async () => {
  await sleep(400);
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    userId: `${6000000 + i}`,
    username: `Muted${i + 1}`,
    reason: ['سبام', 'كلام غير لائق'][i % 2],
    mutedAt: new Date(Date.now() - i * 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + (i + 1) * 1000 * 60 * 60).toISOString(),
    moderatorName: 'Mod',
  }));
};

// ════════════════════════════════════════════════════════════
//  Reaction Roles
// ════════════════════════════════════════════════════════════

const rolePanels = async () => {
  await sleep(400);
  return [
    {
      id: 'panel-1',
      messageId: 'msg-1001',
      title: 'اختر اهتماماتك',
      description: 'اضغط على الأزرار للحصول على الرتب',
      channelId: '1001',
      channelName: 'عام',
      color: 0x9b59b6,
      exclusive: false,
      buttons: [
        { roleId: '2003', label: 'جيمر', emoji: '🎮', style: 'primary' },
        { roleId: '2004', label: 'مطور', emoji: '💻', style: 'success' },
        { roleId: '2005', label: 'فنان', emoji: '🎨', style: 'secondary' },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
    {
      id: 'panel-2',
      messageId: 'msg-1002',
      title: 'الإشعارات',
      description: 'فعّل الرتب اللي تبيها للإشعارات',
      channelId: '1004',
      channelName: 'الإعلانات',
      color: 0xe91e63,
      exclusive: false,
      buttons: [
        { roleId: '2002', label: 'إعلانات عامة', emoji: '📢', style: 'primary' },
        { roleId: '2003', label: 'فعاليات', emoji: '🎉', style: 'success' },
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    },
  ];
};

// ════════════════════════════════════════════════════════════
//  Embed Templates
// ════════════════════════════════════════════════════════════

const embedTemplates = async () => {
  await sleep(300);
  return [
    { id: 1, name: 'إعلان رسمي', data: { title: '📢 إعلان مهم', description: 'محتوى الإعلان هنا...', color: 0xe74c3c } },
    { id: 2, name: 'ترحيب', data: { title: 'أهلاً وسهلاً!', description: 'مرحباً بك في سيرفرنا', color: 0x9b59b6 } },
    { id: 3, name: 'فعالية', data: { title: '🎉 فعالية جديدة', description: 'انضم لنا في...', color: 0xf39c12 } },
  ];
};

// ════════════════════════════════════════════════════════════
//  ▼ Week 4 ▼
// ════════════════════════════════════════════════════════════

// Overview / Health Score
const overviewData = async () => {
  await sleep(500);
  return {
    healthScore: {
      total: 78,
      breakdown: {
        security: { score: 90, label: 'الأمان', max: 100 },
        activity: { score: 75, label: 'النشاط', max: 100 },
        organization: { score: 60, label: 'التنظيم', max: 100 },
        engagement: { score: 80, label: 'التفاعل', max: 100 },
      },
    },
    stats: {
      members: { value: 1247, change: 12, period: 'اليوم' },
      messages24h: { value: 8932, change: 24, period: '24س' },
      commands24h: { value: 312, change: -5, period: '24س', aiPortion: 87 },
      modActions7d: { value: 14, change: -30, period: '7 أيام' },
    },
    suggestions: [
      {
        id: 's1',
        title: 'Anti-Nuke غير مفعّل',
        description: 'حماية من تخريب السيرفر',
        action: 'فعّل الحماية',
        link: '/dashboard/protection',
        severity: 'high',
        icon: 'shield',
      },
      {
        id: 's2',
        title: '30% من قنواتك بدون لوق',
        description: 'فعّل اللوق لتتبع كل النشاطات',
        action: 'إعداد السجلات',
        link: '/dashboard/logs',
        severity: 'medium',
        icon: 'logs',
      },
      {
        id: 's3',
        title: 'ما عندك لوحة رتب',
        description: 'الأعضاء يقدرون يختارون رتبهم',
        action: 'إنشاء لوحة',
        link: '/dashboard/reaction-roles',
        severity: 'low',
        icon: 'roles',
      },
    ],
    recentActivity: [
      { type: 'member.join', user: 'Ahmed123', text: 'انضم للسيرفر', time: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
      { type: 'protection.update', user: 'Admin', text: 'فعّل Anti-Spam', time: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { type: 'ticket.open', user: 'User456', text: 'فتح تذكرة دعم', time: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { type: 'role.create', user: 'Admin', text: 'أنشأ رتبة @VIP', time: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
      { type: 'mod.warn', user: 'Mod', text: 'حذّر User789', time: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
    ],
    weeklyActivity: Array.from({ length: 7 }, (_, i) => ({
      day: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][i],
      messages: Math.floor(Math.random() * 5000) + 2000,
    })),
  };
};

// Stats
const statsData = async (period = '7d') => {
  await sleep(500);
  const points = period === '24h' ? 24 : period === '7d' ? 7 : 30;
  return {
    period,
    messagesOverTime: Array.from({ length: points }, (_, i) => ({
      label: period === '24h' ? `${i}س` : `يوم ${i + 1}`,
      messages: Math.floor(Math.random() * 5000) + 2000,
    })),
    membersOverTime: Array.from({ length: points }, (_, i) => ({
      label: period === '24h' ? `${i}س` : `يوم ${i + 1}`,
      joined: Math.floor(Math.random() * 30) + 5,
      left: Math.floor(Math.random() * 10) + 1,
    })),
    topChannels: [
      { name: 'عام', messages: 15234, percent: 35 },
      { name: 'دردشة', messages: 9821, percent: 22 },
      { name: 'النقاشات', messages: 7234, percent: 16 },
      { name: 'الإعلانات', messages: 4521, percent: 10 },
      { name: 'الدعم', messages: 3210, percent: 7 },
    ],
    topCommands: [
      { name: 'help', count: 1234, category: 'info' },
      { name: 'rank', count: 891, category: 'xp' },
      { name: 'profile', count: 678, category: 'info' },
      { name: 'daily', count: 543, category: 'economy' },
      { name: 'shop', count: 432, category: 'economy' },
    ],
    aiUsage: Array.from({ length: points }, (_, i) => ({
      label: period === '24h' ? `${i}س` : `يوم ${i + 1}`,
      requests: Math.floor(Math.random() * 100) + 20,
    })),
    heatmap: Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => Math.floor(Math.random() * 100)),
    ),
    topUsers: Array.from({ length: 10 }, (_, i) => ({
      rank: i + 1,
      username: `Active${i + 1}`,
      messages: 5000 - i * 350,
      commands: 200 - i * 12,
    })),
  };
};

// Members Hub
const membersList = async () => {
  await sleep(500);
  return Array.from({ length: 30 }, (_, i) => ({
    id: `${7000000 + i}`,
    username: `Member${i + 1}`,
    discriminator: '0',
    avatar: null,
    topRoleId: ['2002', '2003', '2004', '2005', '2006'][i % 5],
    topRoleName: ['عضو', 'نشط', 'مميز', 'VIP', 'مشرف'][i % 5],
    topRoleColor: [0x95a5a6, 0x3498db, 0x9b59b6, 0xf39c12, 0xe74c3c][i % 5],
    xp: 50000 - i * 1500,
    level: 30 - Math.floor(i / 2),
    warnings: i % 4 === 0 ? Math.floor(Math.random() * 3) : 0,
    joinedAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24 * 7).toISOString(),
    lastActive: new Date(Date.now() - i * 1000 * 60 * 60 * 2).toISOString(),
    isOnline: i < 8,
  }));
};

// Events
const eventsList = async () => {
  await sleep(400);
  return [
    {
      id: 1,
      title: 'بطولة الجيمنج',
      description: 'بطولة في لعبة فالورانت — جوائز قيمة',
      image: null,
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
      maxParticipants: 50,
      registered: 23,
      channel: '1007',
      reminderHours: 2,
      status: 'upcoming',
    },
    {
      id: 2,
      title: 'لقاء الكلام الصوتي',
      description: 'لقاء أسبوعي في قناة الصوت',
      image: null,
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
      maxParticipants: 100,
      registered: 67,
      channel: '1006',
      reminderHours: 1,
      status: 'upcoming',
    },
    {
      id: 3,
      title: 'مسابقة الميمز',
      description: 'مسابقة في القناة',
      image: null,
      startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      maxParticipants: 30,
      registered: 30,
      channel: '1010',
      reminderHours: 1,
      status: 'ended',
    },
  ];
};

// ════════════════════════════════════════════════════════════
//  ▼ Week 5 ▼
// ════════════════════════════════════════════════════════════

// Audit Log
const auditLog = async () => {
  await sleep(400);
  const actions = [
    { type: 'welcome.update', label: 'تحديث الترحيب', icon: 'party' },
    { type: 'protection.toggle', label: 'تبديل الحماية', icon: 'shield' },
    { type: 'logs.update', label: 'تحديث السجلات', icon: 'logs' },
    { type: 'ai.persona', label: 'تغيير شخصية AI', icon: 'bot' },
    { type: 'role-panel.create', label: 'إنشاء لوحة رتب', icon: 'roles' },
    { type: 'role-panel.delete', label: 'حذف لوحة رتب', icon: 'trash' },
    { type: 'tickets.update', label: 'تحديث التذاكر', icon: 'ticket' },
    { type: 'mod.unban', label: 'إلغاء حظر', icon: 'gavel' },
  ];
  return Array.from({ length: 20 }, (_, i) => {
    const a = actions[i % actions.length];
    return {
      id: i + 1,
      action: a.type,
      label: a.label,
      icon: a.icon,
      userId: '529320108032786433',
      username: 'Saud',
      target: ['قناة #welcome', 'Anti-Spam', 'دور @VIP', 'لوحة رتب'][i % 4],
      changes: {
        before: { enabled: i % 2 === 0 },
        after: { enabled: i % 2 !== 0 },
      },
      reversible: i % 3 !== 0,
      createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 3).toISOString(),
    };
  });
};

// Templates
const presetTemplates = async () => {
  await sleep(300);
  return [
    {
      id: 'gaming',
      name: 'سيرفر الجيمنج',
      icon: '🎮',
      gradient: 'from-violet-500 to-purple-600',
      description: 'إعدادات جاهزة لسيرفرات الألعاب — رتب، فعاليات، اقتصاد',
      changes: ['ترحيب جيمنج', 'حماية متوسطة', 'XP عالي', 'لوحات رتب الألعاب'],
      systemsAffected: ['welcome', 'protection', 'xp', 'roles'],
      popular: true,
    },
    {
      id: 'community',
      name: 'مجتمع عام',
      icon: '🌍',
      gradient: 'from-emerald-500 to-cyan-500',
      description: 'لمجتمعات الأصدقاء والنقاش العام',
      changes: ['ترحيب دافئ', 'حماية أساسية', 'XP متوازن', 'تذاكر دعم'],
      systemsAffected: ['welcome', 'protection', 'xp', 'tickets'],
      popular: true,
    },
    {
      id: 'educational',
      name: 'سيرفر تعليمي',
      icon: '📚',
      gradient: 'from-blue-500 to-indigo-600',
      description: 'للمدرسين والطلاب والكورسات',
      changes: ['AI تعليمي', 'لوق متقدم', 'منع السبام', 'فعاليات'],
      systemsAffected: ['ai', 'logs', 'protection', 'events'],
      popular: false,
    },
    {
      id: 'streaming',
      name: 'سيرفر منشئ المحتوى',
      icon: '🎬',
      gradient: 'from-pink-500 to-rose-600',
      description: 'لمنشئي المحتوى والمتابعين',
      changes: ['ترحيب VIP', 'إعلانات بثوث', 'لوحات إشعارات', 'مكافآت'],
      systemsAffected: ['welcome', 'roles', 'economy'],
      popular: false,
    },
  ];
};

// Subscription
const subscriptionInfo = async () => {
  await sleep(400);
  return {
    currentPlan: 'silver',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18).toISOString(),
    daysRemaining: 18,
    autoRenew: true,
    paymentHistory: [
      { id: 1, plan: 'silver', amount: 15, status: 'completed', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(), txId: 'TX-1023' },
      { id: 2, plan: 'silver', amount: 15, status: 'completed', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42).toISOString(), txId: 'TX-1018' },
      { id: 3, plan: 'free', amount: 0, status: 'completed', date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(), txId: '-' },
    ],
    pendingRequest: null,
  };
};

// Commands list
const commandsList = async () => {
  await sleep(400);
  const cats = [
    { id: 'moderation', label: 'الإشراف', icon: '🛡️' },
    { id: 'protection', label: 'الحماية', icon: '🔒' },
    { id: 'tickets', label: 'التذاكر', icon: '🎫' },
    { id: 'xp', label: 'XP', icon: '⭐' },
    { id: 'economy', label: 'الاقتصاد', icon: '💰' },
    { id: 'ai', label: 'AI', icon: '🤖' },
    { id: 'info', label: 'معلومات', icon: 'ℹ️' },
    { id: 'admin', label: 'إدارة', icon: '⚙️' },
  ];
  const commands = [];
  let id = 1;
  for (const cat of cats) {
    const count = Math.floor(Math.random() * 4) + 3;
    for (let i = 0; i < count; i++) {
      commands.push({
        id: id++,
        name: `${cat.id}_cmd${i + 1}`,
        nameAr: ['ضبط', 'عرض', 'تفعيل', 'حذف', 'إعدادات', 'بحث'][i % 6],
        description: `أمر ${cat.label} رقم ${i + 1}`,
        category: cat.id,
        plan: ['free', 'silver', 'gold'][Math.floor(Math.random() * 3)],
        enabled: Math.random() > 0.2,
        customName: null,
        usage: Math.floor(Math.random() * 1000),
        lastUsed: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 7).toISOString(),
      });
    }
  }
  return { categories: cats, commands };
};

// ════════════════════════════════════════════════════════════
//  Discord Resources
// ════════════════════════════════════════════════════════════

const guildChannels = async () => { await sleep(300); return MOCK_CHANNELS; };
const guildRoles = async () => { await sleep(300); return MOCK_ROLES; };
const guildInfo = async () => {
  await sleep(300);
  return {
    id: 'mock-guild-1',
    name: 'سيرفر التطوير',
    icon: null,
    memberCount: 1247,
    onlineCount: 234,
    ownerId: '529320108032786433',
    createdAt: '2023-01-15T00:00:00Z',
    plan: 'silver',
  };
};

// ════════════════════════════════════════════════════════════
//  Generic
// ════════════════════════════════════════════════════════════

const saveSettings = async (section, data) => {
  await sleep(600);
  console.log(`[MOCK] Saved ${section}:`, data);
  return { success: true, section, data };
};

// ════════════════════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════════════════════

export const mock = {
  // Settings
  aiSettings,
  protectionSettings,
  xpSettings,
  xpLeaderboard,
  economySettings,
  economyShop,
  economyTopRich,
  ticketsSettings,
  activeTickets,
  welcomeSettings,
  logsSettings,
  moderationWarnings,
  moderationBans,
  moderationMutes,
  rolePanels,
  embedTemplates,

  // Week 4
  overviewData,
  statsData,
  membersList,
  eventsList,

  // Week 5
  auditLog,
  presetTemplates,
  subscriptionInfo,
  commandsList,

  // Resources
  guildChannels,
  guildRoles,
  guildInfo,

  // Generic
  saveSettings,
};

export default mock;
