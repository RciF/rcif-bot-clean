import { Users, Lock, Hammer, UserX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'lockdown', label: 'إغلاق السيرفر', icon: Lock,   color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { id: 'kick',     label: 'طرد القادمين',  icon: UserX,  color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  { id: 'ban',      label: 'حظر القادمين',  icon: Hammer, color: 'bg-destructive/10 text-destructive border-destructive/30' },
];

export function AntiRaidCard({ data, updateField }) {
  const enabled    = data.antiraid_enabled         ?? false;
  const threshold  = data.antiraid_join_threshold  ?? 10;
  const intervalSec = Math.round((data.antiraid_join_interval_ms ?? 10000) / 1000);
  const action     = data.antiraid_action          ?? 'lockdown';

  const setIntervalSec = (sec) => updateField('antiraid_join_interval_ms', Math.max(5000, sec * 1000));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              enabled
                ? 'bg-orange-500/20 text-orange-500'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold mb-1">Anti-Raid</h3>
            <p className="text-sm text-muted-foreground">
              يكتشف الانضمام الجماعي المشبوه ويتصدى له تلقائياً
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => updateField('antiraid_enabled', v)}
          size="lg"
        />
      </div>

      <div className={cn('space-y-5 transition-all', !enabled && 'opacity-50 pointer-events-none')}>
        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">عدد الأعضاء الجدد</label>
            <span className="text-sm font-bold lyn-text-gradient num">{threshold} عضو</span>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={([v]) => updateField('antiraid_join_threshold', v)}
            min={3}
            max={50}
            step={1}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            لو انضم أكثر من {threshold} عضو في {intervalSec} ثانية، يعتبر raid
          </p>
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
            max={300}
            step={5}
            disabled={!enabled}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">العقوبة عند الكشف</label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const isSelected = action === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => updateField('antiraid_action', a.id)}
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