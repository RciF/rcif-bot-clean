import { TrendingUp, Clock, Zap, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

export function LevelsGeneralTab({ data, updateField }) {
  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                data.enabled ? 'lyn-gradient lyn-glow' : 'bg-muted',
              )}
            >
              <TrendingUp className={cn('w-5 h-5', data.enabled ? 'text-white' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">تفعيل نظام المستويات</h3>
              <p className="text-sm text-muted-foreground">
                الأعضاء يكسبون XP من الرسائل ويرتقون في المستويات
              </p>
            </div>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(v) => updateField('enabled', v)}
            size="lg"
          />
        </div>
      </Card>

      {/* XP Settings */}
      <Card className={cn('p-5 space-y-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div>
          <h3 className="font-bold mb-1">إعدادات XP</h3>
          <p className="text-sm text-muted-foreground">عدد الـ XP اللي يكسبه العضو من كل رسالة</p>
        </div>
        <Separator />

        {/* Min XP */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              أقل XP لكل رسالة
            </label>
            <span className="text-sm font-bold lyn-text-gradient num">{data.minXpPerMessage}</span>
          </div>
          <Slider
            value={[data.minXpPerMessage]}
            onValueChange={([v]) => updateField('minXpPerMessage', v)}
            min={1}
            max={50}
            step={1}
            disabled={!data.enabled}
          />
        </div>

        {/* Max XP */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-500" />
              أعلى XP لكل رسالة
            </label>
            <span className="text-sm font-bold lyn-text-gradient num">{data.maxXpPerMessage}</span>
          </div>
          <Slider
            value={[data.maxXpPerMessage]}
            onValueChange={([v]) => updateField('maxXpPerMessage', v)}
            min={data.minXpPerMessage}
            max={100}
            step={1}
            disabled={!data.enabled}
          />
        </div>

        {/* Cooldown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              وقت الانتظار بين الرسائل
            </label>
            <span className="text-sm font-bold lyn-text-gradient num">{data.cooldown} ثانية</span>
          </div>
          <Slider
            value={[data.cooldown]}
            onValueChange={([v]) => updateField('cooldown', v)}
            min={10}
            max={300}
            step={5}
            disabled={!data.enabled}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            يمنع spam الرسائل لكسب XP بسرعة
          </p>
        </div>

        {/* Multiplier */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">معامل XP العام</label>
            <span className="text-sm font-bold lyn-text-gradient num">×{data.multiplier}</span>
          </div>
          <Slider
            value={[data.multiplier]}
            onValueChange={([v]) => updateField('multiplier', v)}
            min={0.5}
            max={5}
            step={0.5}
            disabled={!data.enabled}
          />
        </div>
      </Card>

      {/* Level Up Message */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">رسالة الترقية</h3>
              <p className="text-sm text-muted-foreground">
                إرسال رسالة لما يرتقي عضو لمستوى جديد
              </p>
            </div>
          </div>
          <Switch
            checked={data.levelUpMessage?.enabled}
            onCheckedChange={(v) => updateField('levelUpMessage.enabled', v)}
          />
        </div>

        {data.levelUpMessage?.enabled && (
          <div className="space-y-3 animate-lyn-fade-up">
            <Separator />
            <div>
              <label className="text-sm font-medium mb-2 block">نص الرسالة</label>
              <textarea
                value={data.levelUpMessage.template || ''}
                onChange={(e) => updateField('levelUpMessage.template', e.target.value)}
                placeholder="🎉 مبروك {user}! وصلت للمستوى {level}"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-2">
                المتغيرات: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{user}'}</code>{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{level}'}</code>{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{xp}'}</code>
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
