import { ShieldOff, Hammer, UserX, Bell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'ban', label: 'حظر المهاجم', icon: Hammer, color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { id: 'remove_roles', label: 'سحب الرتب', icon: UserX, color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  { id: 'notify', label: 'تنبيه فقط', icon: Bell, color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
];

/**
 * AntiNukeCard
 */
export function AntiNukeCard({ data, updateField }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              data.enabled
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
          checked={data.enabled}
          onCheckedChange={(v) => updateField('antiNuke.enabled', v)}
          size="lg"
        />
      </div>

      <div
        className={cn(
          'space-y-5 transition-all',
          !data.enabled && 'opacity-50 pointer-events-none',
        )}
      >
        <Separator />

        {/* Channel Deletes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">حد حذف القنوات</label>
            <span className="text-sm font-bold lyn-text-gradient num">
              {data.maxChannelDeletes}
            </span>
          </div>
          <Slider
            value={[data.maxChannelDeletes]}
            onValueChange={([v]) => updateField('antiNuke.maxChannelDeletes', v)}
            min={1}
            max={10}
            step={1}
            disabled={!data.enabled}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            لو حذف أحد أكثر من {data.maxChannelDeletes} قنوات، يطبق العقوبة
          </p>
        </div>

        {/* Role Deletes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">حد حذف الرتب</label>
            <span className="text-sm font-bold lyn-text-gradient num">
              {data.maxRoleDeletes}
            </span>
          </div>
          <Slider
            value={[data.maxRoleDeletes]}
            onValueChange={([v]) => updateField('antiNuke.maxRoleDeletes', v)}
            min={1}
            max={10}
            step={1}
            disabled={!data.enabled}
          />
        </div>

        {/* Mass Bans */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">حد الحظر الجماعي</label>
            <span className="text-sm font-bold lyn-text-gradient num">
              {data.maxBans}
            </span>
          </div>
          <Slider
            value={[data.maxBans]}
            onValueChange={([v]) => updateField('antiNuke.maxBans', v)}
            min={1}
            max={20}
            step={1}
            disabled={!data.enabled}
          />
        </div>

        {/* Action */}
        <div>
          <label className="text-sm font-medium mb-2 block">العقوبة</label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              const isSelected = data.action === action.id;
              return (
                <button
                  key={action.id}
                  onClick={() => updateField('antiNuke.action', action.id)}
                  disabled={!data.enabled}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                    'hover:scale-105',
                    isSelected
                      ? action.color
                      : 'border-border bg-card hover:border-border/80',
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
