import { ScrollText, Volume2, MessageSquare, Users, Shield, Hash, Smile, Link as LinkIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Separator } from '@/components/ui/Separator';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';

// مفاتيح snake_case متطابقة مع EVENT_CHANNEL_MAP في البوت (utils/logSender.js)
const EVENT_GROUPS = [
  {
    label: 'الرسائل',
    color: 'from-blue-500 to-cyan-500',
    events: [
      { key: 'message_delete',      label: 'حذف رسالة',          icon: MessageSquare, color: 'text-blue-500' },
      { key: 'message_update',      label: 'تعديل رسالة',         icon: MessageSquare, color: 'text-cyan-500' },
      { key: 'message_delete_bulk', label: 'حذف رسائل جماعي',     icon: MessageSquare, color: 'text-red-500'  },
    ],
  },
  {
    label: 'الأعضاء',
    color: 'from-emerald-500 to-green-500',
    events: [
      { key: 'member_join',   label: 'انضمام عضو',  icon: Users,  color: 'text-emerald-500' },
      { key: 'member_leave',  label: 'مغادرة عضو',  icon: Users,  color: 'text-red-500'     },
      { key: 'member_ban',    label: 'حظر عضو',     icon: Shield, color: 'text-red-500'     },
      { key: 'member_unban',  label: 'فك حظر',       icon: Shield, color: 'text-emerald-500' },
      { key: 'member_update', label: 'تحديث عضو',   icon: Users,  color: 'text-violet-500'  },
    ],
  },
  {
    label: 'الرتب والقنوات',
    color: 'from-violet-500 to-purple-500',
    events: [
      { key: 'role_create',    label: 'إنشاء رتبة',  icon: Shield, color: 'text-violet-500'  },
      { key: 'role_delete',    label: 'حذف رتبة',    icon: Shield, color: 'text-red-500'     },
      { key: 'role_update',    label: 'تعديل رتبة',  icon: Shield, color: 'text-blue-500'    },
      { key: 'channel_create', label: 'إنشاء قناة',  icon: Hash,   color: 'text-emerald-500' },
      { key: 'channel_delete', label: 'حذف قناة',    icon: Hash,   color: 'text-red-500'     },
      { key: 'channel_update', label: 'تعديل قناة',  icon: Hash,   color: 'text-blue-500'    },
    ],
  },
  {
    label: 'الصوت',
    color: 'from-amber-500 to-orange-500',
    events: [
      { key: 'voice_join',  label: 'انضمام للصوت',     icon: Volume2, color: 'text-emerald-500' },
      { key: 'voice_leave', label: 'مغادرة الصوت',     icon: Volume2, color: 'text-red-500'     },
      { key: 'voice_move',  label: 'تنقل بين القنوات', icon: Volume2, color: 'text-blue-500'    },
    ],
  },
  {
    label: 'أخرى',
    color: 'from-pink-500 to-rose-500',
    events: [
      { key: 'guild_update',  label: 'تحديث السيرفر', icon: Shield,   color: 'text-pink-500'   },
      { key: 'emoji_create',  label: 'إيموجي جديد',  icon: Smile,    color: 'text-amber-500'  },
      { key: 'emoji_delete',  label: 'حذف إيموجي',   icon: Smile,    color: 'text-red-500'    },
      { key: 'invite_create', label: 'دعوة جديدة',   icon: LinkIcon, color: 'text-blue-500'   },
      { key: 'invite_delete', label: 'حذف دعوة',     icon: LinkIcon, color: 'text-red-500'    },
    ],
  },
];

// تحويل المفاتيح القديمة camelCase → snake_case (لو عندك بيانات قديمة محفوظة)
const LEGACY_KEY_MAP = {
  messageDelete: 'message_delete',
  messageEdit: 'message_update',
  messageUpdate: 'message_update',
  memberJoin: 'member_join',
  memberLeave: 'member_leave',
  memberBan: 'member_ban',
  memberUnban: 'member_unban',
  memberKick: 'member_leave',
  memberUpdate: 'member_update',
  memberRoleAdd: 'member_update',
  memberRoleRemove: 'member_update',
  roleCreate: 'role_create',
  roleDelete: 'role_delete',
  roleUpdate: 'role_update',
  channelCreate: 'channel_create',
  channelDelete: 'channel_delete',
  channelUpdate: 'channel_update',
  voiceJoin: 'voice_join',
  voiceLeave: 'voice_leave',
  voiceMove: 'voice_move',
  guildUpdate: 'guild_update',
  emojiCreate: 'emoji_create',
  emojiDelete: 'emoji_delete',
  inviteCreate: 'invite_create',
  inviteDelete: 'invite_delete',
};

function migrateEvents(events) {
  if (!events || typeof events !== 'object') return {};
  const migrated = {};
  for (const [key, value] of Object.entries(events)) {
    const newKey = LEGACY_KEY_MAP[key] || key;
    migrated[newKey] = { ...(migrated[newKey] || {}), ...value };
  }
  return migrated;
}

export default function LogsPage() {
  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'logs' });

  const planGate = usePlanGate('logs', PLAN_TIERS.SILVER);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  const events = migrateEvents(data.events);
  const handleSave = planGate.gateAction(save);

  const toggleEvent = (key) => {
    const newEnabled = !events[key]?.enabled;
    setData((prev) => ({
      ...prev,
      events: {
        ...migrateEvents(prev.events),
        [key]: {
          ...(migrateEvents(prev.events)[key] || {}),
          enabled: newEnabled,
          channel:
            newEnabled && !migrateEvents(prev.events)[key]?.channel
              ? prev.master_channel || prev.masterChannel
              : migrateEvents(prev.events)[key]?.channel,
        },
      },
    }));
  };

  const updateEventChannel = (key, channelId) => {
    setData((prev) => ({
      ...prev,
      events: {
        ...migrateEvents(prev.events),
        [key]: { ...(migrateEvents(prev.events)[key] || {}), channel: channelId },
      },
    }));
  };

  const toggleGroup = (groupEvents, enable) => {
    setData((prev) => {
      const current = migrateEvents(prev.events);
      const updates = { ...current };
      const fallback = prev.master_channel || prev.masterChannel;
      for (const ev of groupEvents) {
        updates[ev.key] = {
          ...(current[ev.key] || {}),
          enabled: enable,
          channel:
            enable && !current[ev.key]?.channel
              ? fallback
              : current[ev.key]?.channel,
        };
      }
      return { ...prev, events: updates };
    });
  };

  const enabledCount = Object.values(events).filter((e) => e?.enabled).length;
  const totalCount = EVENT_GROUPS.reduce((sum, g) => sum + g.events.length, 0);

  // backward-compat للحقول camelCase القديمة
  const useSingleChannel = data.use_single_channel ?? data.useSingleChannel ?? false;
  const masterChannel = data.master_channel ?? data.masterChannel ?? null;

  const setUseSingleChannel = (v) => {
    updateField('use_single_channel', v);
    updateField('useSingleChannel', v);
  };

  const setMasterChannel = (v) => {
    updateField('master_channel', v);
    updateField('masterChannel', v);
  };

  return (
    <>
      <SettingsPageHeader
        icon={<ScrollText />}
        title="نظام السجلات"
        description="تتبع كل ما يحدث في سيرفرك"
        plan="silver"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="نظام السجلات"
          className="mb-6"
        />
      )}

      {/* Master toggle */}
      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                data.enabled ? 'lyn-gradient lyn-glow' : 'bg-muted',
              )}
            >
              <ScrollText
                className={cn(
                  'w-5 h-5',
                  data.enabled ? 'text-white' : 'text-muted-foreground',
                )}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">تفعيل نظام السجلات</h3>
              <p className="text-sm text-muted-foreground">
                <span className="num font-semibold">{enabledCount}</span> من{' '}
                <span className="num">{totalCount}</span> أحداث مفعّلة
              </p>
            </div>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(v) => updateField('enabled', v)}
            size="lg"
          />
        </div>

        <Separator />

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
            <div>
              <div className="text-sm font-medium">قناة موحدة لكل اللوقات</div>
              <div className="text-xs text-muted-foreground">
                كل الأحداث تُرسل لقناة واحدة بدل قنوات مفصولة
              </div>
            </div>
            <Switch
              checked={useSingleChannel}
              onCheckedChange={setUseSingleChannel}
            />
          </div>

          {useSingleChannel && (
            <div className="animate-lyn-fade-up">
              <label className="text-sm font-medium mb-2 block">
                القناة الموحدة
              </label>
              <ChannelPicker
                value={masterChannel}
                onChange={setMasterChannel}
                types={[0, 5]}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Event groups */}
      <div
        className={cn(
          'space-y-4',
          !data.enabled && 'opacity-50 pointer-events-none',
        )}
      >
        {EVENT_GROUPS.map((group) => {
          const groupEnabledCount = group.events.filter(
            (ev) => events[ev.key]?.enabled,
          ).length;
          const allEnabled = groupEnabledCount === group.events.length;

          return (
            <Card key={group.label} className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center',
                      group.color,
                    )}
                  >
                    <ScrollText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">{group.label}</h3>
                    <div className="text-xs text-muted-foreground">
                      <span className="num">{groupEnabledCount}</span> من{' '}
                      <span className="num">{group.events.length}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleGroup(group.events, !allEnabled)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  {allEnabled ? 'تعطيل الكل' : 'تفعيل الكل'}
                </button>
              </div>

              <div className="space-y-2">
                {group.events.map((ev) => {
                  const Icon = ev.icon;
                  const eventData = events[ev.key] || { enabled: false };
                  return (
                    <div
                      key={ev.key}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0',
                              ev.color,
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-medium">{ev.label}</div>
                        </div>
                        <Switch
                          checked={eventData.enabled}
                          onCheckedChange={() => toggleEvent(ev.key)}
                        />
                      </div>

                      {eventData.enabled && !useSingleChannel && (
                        <div className="animate-lyn-fade-up">
                          <ChannelPicker
                            value={eventData.channel}
                            onChange={(v) => updateEventChannel(ev.key, v)}
                            types={[0, 5]}
                            placeholder="اختر قناة..."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <SaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={reset}
        locked={planGate.isLocked}
        onLockedClick={planGate.openLockModal}
      />
      <PlanLockModal {...planGate.lockModalProps} />
    </>
  );
}