/**
 * ═══════════════════════════════════════════════════════════
 *  DefaultsTab — Tab "الإعدادات الافتراضية"
 *
 *  يتيح ضبط:
 *  - الوقت الافتراضي (للـ mute/ban)
 *  - حذف رسالة الأمر بعد التنفيذ
 *  - حذف رد البوت بعد X ثواني
 *  - حذف رد البوت إذا حذف العضو رسالته
 * ═══════════════════════════════════════════════════════════
 */

import { Clock, Trash2, Timer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';

// ─── Quick durations (للتوفير) ───
const QUICK_DURATIONS = [
  { label: '5 دقايق', value: '5m' },
  { label: '30 دقيقة', value: '30m' },
  { label: 'ساعة', value: '1h' },
  { label: 'ساعتين', value: '2h' },
  { label: '12 ساعة', value: '12h' },
  { label: 'يوم', value: '24h' },
  { label: '3 أيام', value: '3d' },
  { label: 'أسبوع', value: '7d' },
];

export function DefaultsTab({ defaults, onChange, commandName }) {
  const update = (field, value) => {
    onChange({ ...defaults, [field]: value });
  };

  // الوقت الافتراضي يطلع فقط لأوامر الإشراف اللي تحتاج مدة
  const isTimeBased = ['mute', 'اسكت', 'كتم', 'ban', 'حظر'].includes(commandName);

  return (
    <div className="space-y-4">
      {/* ─── Default duration (لأوامر الإشراف) ─── */}
      {isTimeBased && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-bold">الوقت الافتراضي</h3>
              <p className="text-xs text-muted-foreground">
                لو المستخدم ما حدد مدة عند استخدام الأمر
              </p>
            </div>
          </div>

          <Input
            value={defaults.default_duration || ''}
            onChange={(e) => update('default_duration', e.target.value)}
            placeholder="مثال: 30m, 2h, 7d (أو اتركه فارغ)"
            dir="ltr"
            className="font-mono text-center"
          />

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_DURATIONS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => update('default_duration', preset.value)}
                className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-accent hover:border-primary/50 transition-colors"
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => update('default_duration', null)}
              className="px-2.5 py-1 text-xs rounded-md border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              مسح
            </button>
          </div>
        </Card>
      )}

      {/* ─── Delete invocation ─── */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <Trash2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold">حذف رسالة الأمر</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                البوت يحذف رسالة العضو فوراً بعد تنفيذ الأمر
              </div>
            </div>
          </div>
          <Switch
            checked={defaults.delete_invocation || false}
            onCheckedChange={(v) => update('delete_invocation', v)}
          />
        </div>
      </Card>

      {/* ─── Delete response ─── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <Timer className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold">حذف رد البوت تلقائياً</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                رد البوت يُحذف بعد عدد ثواني محدد
              </div>
            </div>
          </div>
          <Switch
            checked={defaults.delete_response || false}
            onCheckedChange={(v) => update('delete_response', v)}
          />
        </div>

        {defaults.delete_response && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">حذف بعد</span>
            <Input
              type="number"
              min={1}
              max={60}
              value={defaults.delete_response_after || 5}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                update('delete_response_after', isNaN(val) ? 5 : val);
              }}
              className="w-20 text-center num"
            />
            <span className="text-xs text-muted-foreground">ثواني (1-60)</span>
          </div>
        )}
      </Card>

      {/* ─── Delete on user delete ─── */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <Trash2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold">حذف الرد إذا حذف العضو رسالته</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                إذا حذف العضو رسالة الأمر، البوت يحذف رده تلقائياً
              </div>
            </div>
          </div>
          <Switch
            checked={defaults.delete_on_user_delete || false}
            onCheckedChange={(v) => update('delete_on_user_delete', v)}
          />
        </div>
      </Card>
    </div>
  );
}