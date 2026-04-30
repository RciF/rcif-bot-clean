import { Ticket, Hash, Shield, FileText, Clock, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';

export function TicketsGeneralTab({ data, updateField }) {
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
              <Ticket className={cn('w-5 h-5', data.enabled ? 'text-white' : 'text-muted-foreground')} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">تفعيل نظام التذاكر</h3>
              <p className="text-sm text-muted-foreground">
                الأعضاء يفتحون تذاكر دعم والستاف يرد عليها
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

      {/* Channels Setup */}
      <Card className={cn('p-5 space-y-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div>
          <h3 className="font-bold mb-1">القنوات والرتب</h3>
          <p className="text-sm text-muted-foreground">إعداد القنوات والرتبة المختصة بالتذاكر</p>
        </div>
        <Separator />

        {/* Panel Channel */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            قناة لوحة التذاكر
          </label>
          <div className="border-2 border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground">
            ChannelPicker قيد البناء
            {data.panelChannel && (
              <span className="ms-2 px-2 py-0.5 rounded bg-violet-500/10 text-violet-500">
                #{data.panelChannel}
              </span>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            تصنيف التذاكر (Category)
          </label>
          <div className="border-2 border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground">
            CategoryPicker قيد البناء
          </div>
        </div>

        {/* Staff Role */}
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            رتبة الستاف
          </label>
          <div className="border-2 border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground">
            RolePicker قيد البناء
            {data.staffRole && (
              <span className="ms-2 px-2 py-0.5 rounded bg-violet-500/10 text-violet-500">
                @{data.staffRole}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Auto Archive */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">الأرشفة التلقائية</h3>
            <p className="text-sm text-muted-foreground">
              يقفل التذاكر الخاملة تلقائياً بعد فترة محددة
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">المدة قبل الأرشفة</label>
          <span className="text-sm font-bold lyn-text-gradient num">
            {data.autoArchiveHours} ساعة
          </span>
        </div>
        <Slider
          value={[data.autoArchiveHours]}
          onValueChange={([v]) => updateField('autoArchiveHours', v)}
          min={1}
          max={168}
          step={1}
          disabled={!data.enabled}
        />
      </Card>

      {/* Transcripts */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1">حفظ المحادثات (Transcripts)</h3>
              <p className="text-sm text-muted-foreground">
                حفظ نسخة من كل تذكرة مغلقة في قناة معينة
              </p>
            </div>
          </div>
          <Switch
            checked={data.transcripts?.enabled}
            onCheckedChange={(v) => updateField('transcripts.enabled', v)}
          />
        </div>

        {data.transcripts?.enabled && (
          <div className="border-2 border-dashed border-border rounded-xl p-3 text-center text-xs text-muted-foreground animate-lyn-fade-up">
            ChannelPicker لقناة الـ transcripts
          </div>
        )}
      </Card>

      {/* Welcome Message */}
      <Card className={cn('p-5', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1">رسالة الترحيب في التذكرة</h3>
            <p className="text-sm text-muted-foreground">أول رسالة تظهر للعضو لما يفتح تذكرة</p>
          </div>
        </div>

        <textarea
          value={data.welcomeMessage || ''}
          onChange={(e) => updateField('welcomeMessage', e.target.value)}
          placeholder="أهلاً {user}! الستاف راح يجي قريباً."
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y"
          maxLength={1000}
          disabled={!data.enabled}
        />
        <p className="text-xs text-muted-foreground mt-2">
          المتغيرات: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{user}'}</code>{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{server}'}</code>
        </p>
      </Card>
    </div>
  );
}
