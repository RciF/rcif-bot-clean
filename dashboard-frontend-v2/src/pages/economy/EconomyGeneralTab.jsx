import { Coins, Calendar, Briefcase, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

export function EconomyGeneralTab({ data, updateField }) {
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
              <Coins className={cn('w-5 h-5', data.enabled ? 'text-white' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">تفعيل نظام الاقتصاد</h3>
              <p className="text-sm text-muted-foreground">
                الأعضاء يكسبون عملات ويصرفونها في المتجر
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

      {/* Currency */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <h3 className="font-bold mb-1">العملة</h3>
        <p className="text-sm text-muted-foreground mb-4">إعدادات عملة سيرفرك</p>
        <Separator className="mb-5" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">رمز العملة</label>
            <Input
              value={data.currencySymbol || ''}
              onChange={(e) => updateField('currencySymbol', e.target.value)}
              placeholder="🪙"
              maxLength={4}
              disabled={!data.enabled}
              className="text-center text-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">اسم العملة</label>
            <Input
              value={data.currencyName || ''}
              onChange={(e) => updateField('currencyName', e.target.value)}
              placeholder="كوينز"
              maxLength={20}
              disabled={!data.enabled}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">رصيد البداية للأعضاء الجدد</label>
            <span className="text-sm font-bold lyn-text-gradient num">
              {data.startingBalance} {data.currencySymbol}
            </span>
          </div>
          <Slider
            value={[data.startingBalance]}
            onValueChange={([v]) => updateField('startingBalance', v)}
            min={0}
            max={10000}
            step={100}
            disabled={!data.enabled}
          />
        </div>
      </Card>

      {/* Daily Reward */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold mb-1">المكافأة اليومية</h3>
            <p className="text-sm text-muted-foreground">
              عشوائي بين قيمتين كل 24 ساعة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">الحد الأدنى</label>
            <Input
              type="number"
              value={data.dailyReward?.min || 0}
              onChange={(e) => updateField('dailyReward.min', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">الحد الأعلى</label>
            <Input
              type="number"
              value={data.dailyReward?.max || 0}
              onChange={(e) => updateField('dailyReward.max', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
        </div>
      </Card>

      {/* Message Reward */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold mb-1">مكافأة الرسائل</h3>
            <p className="text-sm text-muted-foreground">عملات لكل رسالة (مع cooldown)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">أدنى</label>
            <Input
              type="number"
              value={data.messageReward?.min || 0}
              onChange={(e) => updateField('messageReward.min', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">أعلى</label>
            <Input
              type="number"
              value={data.messageReward?.max || 0}
              onChange={(e) => updateField('messageReward.max', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cooldown (ث)</label>
            <Input
              type="number"
              value={data.messageReward?.cooldown || 0}
              onChange={(e) => updateField('messageReward.cooldown', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
        </div>
      </Card>

      {/* Work Reward */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold mb-1">مكافأة العمل (work)</h3>
            <p className="text-sm text-muted-foreground">يكسب عملات من أمر /عمل</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">أدنى</label>
            <Input
              type="number"
              value={data.workReward?.min || 0}
              onChange={(e) => updateField('workReward.min', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">أعلى</label>
            <Input
              type="number"
              value={data.workReward?.max || 0}
              onChange={(e) => updateField('workReward.max', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cooldown (ث)</label>
            <Input
              type="number"
              value={data.workReward?.cooldown || 0}
              onChange={(e) => updateField('workReward.cooldown', parseInt(e.target.value) || 0)}
              disabled={!data.enabled}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
