import {
  ScrollText,
  Hash,
  Volume2,
  Crown,
  Trash2,
  Edit3,
  UserPlus,
  UserMinus,
  Hammer,
  Ban,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { SaveBar } from '@/components/shared/SaveBar';
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import { useGuildSettings } from '@/hooks/useGuildSettings';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';

const EVENT_GROUPS = [
  {
    label: 'الرسائل',
    color: 'from-violet-500 to-pink-500',
    events: [
      { key: 'messageDelete', label: 'حذف رسالة', icon: Trash2, color: 'text-destructive' },
      { key: 'messageEdit', label: 'تعديل رسالة', icon: Edit3, color: 'text-amber-500' },
    ],
  },
  {
    label: 'الأعضاء',
    color: 'from-emerald-500 to-cyan-500',
    events: [
      { key: 'memberJoin', label: 'دخول عضو', icon: UserPlus, color: 'text-emerald-500' },
      { key: 'memberLeave', label: 'خروج عضو', icon: UserMinus, color: 'text-amber-500' },
      { key: 'memberBan', label: 'حظر عضو', icon: Hammer, color: 'text-destructive' },
      { key: 'memberKick', label: 'طرد عضو', icon: Ban, color: 'text-orange-500' },
      { key: 'memberRoleAdd', label: 'إعطاء رتبة', icon: UserPlus, color: 'text-emerald-500' },
      { key: 'memberRoleRemove', label: 'سحب رتبة', icon: UserMinus, color: 'text-amber-500' },
    ],
  },
  {
    label: 'الرتب والقنوات',
    color: 'from-amber-500 to-orange-500',
    events: [
      { key: 'roleCreate', label: 'إنشاء رتبة', icon: Crown, color: 'text-emerald-500' },
      { key: 'roleDelete', label: 'حذف رتبة', icon: Trash2, color: 'text-destructive' },
      { key: 'channelCreate', label: 'إنشاء قناة', icon: Hash, color: 'text-emerald-500' },
      { key: 'channelDelete', label: 'حذف قناة', icon: Trash2, color: 'text-destructive' },
    ],
  },
  {
    label: 'الصوت',
    color: 'from-blue-500 to-indigo-500',
    events: [
      { key: 'voiceJoin', label: 'دخول قناة صوت', icon: Volume2, color: 'text-emerald-500' },
      { key: 'voiceLeave', label: 'خروج من صوت', icon: Volume2, color: 'text-amber-500' },
      { key: 'voiceMove', label: 'تنقل بين القنوات', icon: Volume2, color: 'text-blue-500' },
    ],
  },
];

export default function LogsPage() {
  const { data, setData, updateField, isLoading, isSaving, isDirty, save, reset } =
    useGuildSettings({ section: 'logs', fetcher: mock.logsSettings });

  const planGate = usePlanGate('logs', PLAN_TIERS.SILVER);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4 pb-6 mb-6 border-b border-border">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;
  const handleSave = planGate.gateAction(save);

  const toggleEvent = (key) => {
    const newEnabled = !data.events[key].enabled;
    setData((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        [key]: {
          ...prev.events[key],
          enabled: newEnabled,
          channel: newEnabled && !prev.events[key].channel ? prev.masterChannel : prev.events[key].channel,
        },
      },
    }));
  };

  const updateEventChannel = (key, channelId) => {
    setData((prev) => ({
      ...prev,
      events: { ...prev.events, [key]: { ...prev.events[key], channel: channelId } },
    }));
  };

  const toggleGroup = (events, enable) => {
    setData((prev) => ({
      ...prev,
      events: {
        ...prev.events,
        ...events.reduce((acc, ev) => {
          acc[ev.key] = {
            ...prev.events[ev.key],
            enabled: enable,
            channel: enable && !prev.events[ev.key].channel ? prev.masterChannel : prev.events[ev.key].channel,
          };
          return acc;
        }, {}),
      },
    }));
  };

  const enabledCount = Object.values(data.events).filter((e) => e.enabled).length;
  const totalCount = Object.keys(data.events).length;

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
                className={cn('w-5 h-5', data.enabled ? 'text-white' : 'text-muted-foreground')}
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
                كل الأحداث تذهب لقناة واحدة بدل قنوات منفصلة
              </div>
            </div>
            <Switch
              checked={data.useSingleChannel}
              onCheckedChange={(v) => updateField('useSingleChannel', v)}
            />
          </div>

          {data.useSingleChannel && (
            <div className="animate-lyn-fade-up">
              <label className="text-sm font-medium mb-2 block">القناة الموحدة</label>
              <ChannelPicker
                value={data.masterChannel}
                onChange={(v) => updateField('masterChannel', v)}
                types={[0, 5]}
              />
            </div>
          )}
        </div>
      </Card>

      <div className={cn('space-y-4', !data.enabled && 'opacity-50 pointer-events-none')}>
        {EVENT_GROUPS.map((group) => {
          const groupEnabledCount = group.events.filter((ev) => data.events[ev.key]?.enabled).length;
          const allEnabled = groupEnabledCount === group.events.length;

          return (
            <Card key={group.label} className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', group.color)}>
                    <ScrollText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">{group.label}</h3>
                    <div className="text-xs text-muted-foreground">
                      <span className="num">{groupEnabledCount}</span> من <span className="num">{group.events.length}</span>
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
                  const eventData = data.events[ev.key] || { enabled: false };
                  return (
                    <div key={ev.key} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn('w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0', ev.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-medium">{ev.label}</div>
                        </div>
                        <Switch checked={eventData.enabled} onCheckedChange={() => toggleEvent(ev.key)} />
                      </div>

                      {eventData.enabled && !data.useSingleChannel && (
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
