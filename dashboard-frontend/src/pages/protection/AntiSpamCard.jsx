import { MessageSquareWarning, Hammer, UserX, VolumeX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'mute', label: 'كتم', icon: VolumeX, color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { id: 'kick', label: 'طرد', icon: UserX,   color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  { id: 'ban',  label: 'حظر', icon: Hammer,  color: 'bg-destructive/10 text-destructive border-destructive/30' },
];

export function AntiSpamCard({ data, updateField }) {
  const enabled     = data.antispam_enabled     ?? false;
  const maxMessages = data.antispam_max_messages ?? 5;
  // البوت يخزن المدة بـ ms — نعرضها بثواني
  const intervalSec = Math.round((data.antispam_interval_ms ?? 3000) / 1000);
  const action      = data.antispam_action       ?? 'mute';

  const setIntervalSec = (sec) => updateField('antispam_interval_ms', Math.max(1000, sec * 1000));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              enabled
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <MessageSquareWarning className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold mb-1">Anti-Spam</h3>
            <p className="text-sm text-muted-foreground">
              يكتشف ويعاقب الأعضاء اللي يسبمون رسائل متتالية
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => updateField('antispam_enabled', v)}
          size="lg"
        />
      </div>

      <div className={cn('space-y-5 transition-all', !enabled && 'opacity-50 pointer-events-none')}>
        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">عدد الرسائل المسموح</label>
            <span className="text-sm font-bold lyn-text-gradient num">{maxMessages} رسالة</span>
          </div>
          <Slider
            value={[maxMessages]}
            onValueChange={([v]) => updateField('antispam_max_messages', v)}
            min={3}
            max={20}
            step={1}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            كم رسالة يقدر يرسل العضو في {intervalSec} ثانية
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
            min={1}
            max={60}
            step={1}
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
                  onClick={() => updateField('antispam_action', a.id)}
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