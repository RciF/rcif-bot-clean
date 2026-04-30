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
    whitelist: {
      roles: ['2007'],
      members: [],
    },
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
    multipliers: [
      { roleId: '2005', multiplier: 2 },
    ],
    roleRewards: [
      { level: 5, roleId: '2002' },
      { level: 10, roleId: '2003' },
      { level: 25, roleId: '2004' },
    ],
    levelUpMessage: {
      enabled: true,
      channel: null, // null = نفس القناة
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
    transcripts: {
      enabled: true,
      channel: '1005',
    },
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
//  Discord Resources (channels, roles, etc)
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
//  Generic Save (لكل الإعدادات)
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

  // Resources
  guildChannels,
  guildRoles,
  guildInfo,

  // Generic
  saveSettings,
};

export default mock;
