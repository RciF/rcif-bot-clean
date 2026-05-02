import { MessageSquareWarning, Hammer, UserX, VolumeX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'mute', label: 'كتم', icon: VolumeX, color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { id: 'kick', label: 'طرد', icon: UserX, color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  { id: 'ban', label: 'حظر', icon: Hammer, color: 'bg-destructive/10 text-destructive border-destructive/30' },
];

/**
 * AntiSpamCard
 */
export function AntiSpamCard({ data, updateField }) {
  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              data.enabled
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
          checked={data.enabled}
          onCheckedChange={(v) => updateField('antiSpam.enabled', v)}
          size="lg"
        />
      </div>

      {/* Settings (تظهر فقط لما enabled) */}
      <div
        className={cn(
          'space-y-5 transition-all',
          !data.enabled && 'opacity-50 pointer-events-none',
        )}
      >
        <Separator />

        {/* Max Messages */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">عدد الرسائل المسموح</label>
            <span className="text-sm font-bold lyn-text-gradient num">
              {data.maxMessages} رسالة
            </span>
          </div>
          <Slider
            value={[data.maxMessages]}
            onValueChange={([v]) => updateField('antiSpam.maxMessages', v)}
            min={3}
            max={20}
            step={1}
            disabled={!data.enabled}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            كم رسالة يقدر يرسل العضو في {data.timeWindow} ثانية
          </p>
        </div>

        {/* Time Window */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">المدة الزمنية</label>
            <span className="text-sm font-bold lyn-text-gradient num">
              {data.timeWindow} ثانية
            </span>
          </div>
          <Slider
            value={[data.timeWindow]}
            onValueChange={([v]) => updateField('antiSpam.timeWindow', v)}
            min={1}
            max={60}
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
                  onClick={() => updateField('antiSpam.action', action.id)}
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

        {/* Mute Duration (يظهر بس لو action=mute) */}
        {data.action === 'mute' && (
          <div className="animate-lyn-fade-up">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">مدة الكتم</label>
              <span className="text-sm font-bold lyn-text-gradient num">
                {data.muteDuration} دقيقة
              </span>
            </div>
            <Slider
              value={[data.muteDuration]}
              onValueChange={([v]) => updateField('antiSpam.muteDuration', v)}
              min={1}
              max={1440}
              step={1}
              disabled={!data.enabled}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
