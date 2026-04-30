/**
 * Mock Data Generator — للتطوير قبل توفر APIs الباك اند
 *
 * @example
 *   import { mock } from '@/lib/mock';
 *   const settings = await mock.aiSettings(guildId);
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
    antiSpam: {
      enabled: true,
      maxMessages: 5,
      timeWindow: 5,
      action: 'mute',
      muteDuration: 10,
    },
    antiRaid: {
      enabled: false,
      maxJoins: 10,
      timeWindow: 30,
      action: 'lockdown',
    },
    antiNuke: {
      enabled: true,
      maxChannelDeletes: 3,
      maxRoleDeletes: 3,
      maxBans: 5,
      action: 'ban',
    },
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
    levelUpMessage: {
      enabled: true,
      channel: null,
      template: '🎉 مبروك {user}! وصلت للمستوى {level}',
    },
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
//  Welcome Settings (الجديد)
// ════════════════════════════════════════════════════════════

const welcomeSettings = async () => {
  await sleep(400);
  return {
    enabled: true,
    welcomeChannel: '1003',
    leaveChannel: '1003',
    type: 'embed', // 'text' | 'embed'
    text: {
      content: 'أهلاً {user} في {server}! 🎉 صرت العضو رقم {count}',
    },
    embed: {
      title: 'مرحباً {user}! 👋',
      description:
        'أهلاً وسهلاً في **{server}**\n\n• اقرأ القوانين في القنوات المخصصة\n• تعرّف على الأعضاء\n• استمتع بإقامتك معنا!',
      color: 0x9b59b6,
      footer: 'العضو رقم {count}',
      thumbnail: 'avatar',
      image: '',
    },
    leaveEnabled: true,
    leaveMessage: {
      type: 'text',
      content: '👋 وداعاً {username}، كنت معنا {duration}',
    },
    cardEnabled: false,
    cardBackground: 'default',
    mentionUser: true,
  };
};

// ════════════════════════════════════════════════════════════
//  Logs Settings (الجديد)
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
//  Moderation (الجديد)
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
//  Reaction Roles (الجديد)
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
//  Embed Templates (الجديد)
// ════════════════════════════════════════════════════════════

const embedTemplates = async () => {
  await sleep(300);
  return [
    {
      id: 1,
      name: 'إعلان رسمي',
      data: {
        title: '📢 إعلان مهم',
        description: 'محتوى الإعلان هنا...',
        color: 0xe74c3c,
      },
    },
    {
      id: 2,
      name: 'ترحيب',
      data: {
        title: 'أهلاً وسهلاً!',
        description: 'مرحباً بك في سيرفرنا',
        color: 0x9b59b6,
      },
    },
    {
      id: 3,
      name: 'فعالية',
      data: {
        title: '🎉 فعالية جديدة',
        description: 'انضم لنا في...',
        color: 0xf39c12,
      },
    },
  ];
};

// ════════════════════════════════════════════════════════════
//  Discord Resources
// ════════════════════════════════════════════════════════════

const guildChannels = async () => {
  await sleep(300);
  return MOCK_CHANNELS;
};

const guildRoles = async () => {
  await sleep(300);
  return MOCK_ROLES;
};

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
    plan: 'gold',
  };
};

// ════════════════════════════════════════════════════════════
//  Generic Save
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

  // Resources
  guildChannels,
  guildRoles,
  guildInfo,

  // Generic
  saveSettings,
};

export default mock;
