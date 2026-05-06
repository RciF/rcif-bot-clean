import { ShieldOff, Hammer, UserX, Bell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'ban',          label: 'حظر المهاجم', icon: Hammer, color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { id: 'remove_roles', label: 'سحب الرتب',  icon: UserX,  color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  { id: 'notify',       label: 'تنبيه فقط',   icon: Bell,   color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
];

export function AntiNukeCard({ data, updateField }) {
  const enabled       = data.antinuke_enabled                  ?? false;
  const channelLimit  = data.antinuke_channel_delete_threshold ?? 3;
  const roleLimit     = data.antinuke_role_delete_threshold    ?? 3;
  const banLimit      = data.antinuke_ban_threshold            ?? 3;
  const intervalSec   = Math.round((data.antinuke_interval_ms ?? 10000) / 1000);
  const action        = data.antinuke_action                   ?? 'ban';

  const setIntervalSec = (sec) => updateField('antinuke_interval_ms', Math.max(5000, sec * 1000));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              enabled
                ? 'bg-destructive/20 text-destructive'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <ShieldOff className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold mb-1">Anti-Nuke</h3>
            <p className="text-sm text-muted-foreground">
              حماية ضد محاولات تخريب السيرفر (حذف قنوات، رتب، حظر جماعي)
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => updateField('antinuke_enabled', v)}
          size="lg"
        />
      </div>

      <div className={cn('space-y-5 transition-all', !enabled && 'opacity-50 pointer-events-none')}>
        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">حد حذف القنوات</label>
            <span className="text-sm font-bold lyn-text-gradient num">{channelLimit}</span>
          </div>
          <Slider
            value={[channelLimit]}
            onValueChange={([v]) => updateField('antinuke_channel_delete_threshold', v)}
            min={1}
            max={10}
            step={1}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            لو حذف أحد أكثر من {channelLimit} قنوات في {intervalSec} ثانية يطبق العقوبة
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">حد حذف الرتب</label>
            <span className="text-sm font-bold lyn-text-gradient num">{roleLimit}</span>
          </div>
          <Slider
            value={[roleLimit]}
            onValueChange={([v]) => updateField('antinuke_role_delete_threshold', v)}
            min={1}
            max={10}
            step={1}
            disabled={!enabled}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">حد الحظر الجماعي</label>
            <span className="text-sm font-bold lyn-text-gradient num">{banLimit}</span>
          </div>
          <Slider
            value={[banLimit]}
            onValueChange={([v]) => updateField('antinuke_ban_threshold', v)}
            min={1}
            max={20}
            step={1}
            disabled={!enabled}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">المدة الزمنية</label>
            <span className="text-sm font-bold lyn-text-gradient num">{intervalSec} ثانية</span>
          </div>
          <Slider
            value={[intervalSec]}
            onValueChange={([v]) => setIntervalSec(v)}
            min={5}
            max={120}
            step={5}
            disabled={!enabled}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">العقوبة</label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const isSelected = action === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => updateField('antinuke_action', a.id)}
                  disabled={!enabled}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover:scale-105',
                    isSelected ? a.color : 'border-border bg-card hover:border-border/80',
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}