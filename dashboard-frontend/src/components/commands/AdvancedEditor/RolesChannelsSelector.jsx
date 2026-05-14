/**
 * ═══════════════════════════════════════════════════════════
 *  RolesChannelsSelector — مكوّن اختيار رولات/قنوات
 *
 *  يعرض زرين:
 *  - "✅ المفعّلة" → فقط هذي تشتغل (whitelist)
 *  - "❌ المعطّلة" → كل شي عدا هذي (blacklist)
 *
 *  Props:
 *  - type: 'role' | 'channel'
 *  - enabled: string[] (IDs)
 *  - disabled: string[]
 *  - onEnabledChange: (ids[]) => void
 *  - onDisabledChange: (ids[]) => void
 * ═══════════════════════════════════════════════════════════
 */

import { CheckCircle2, XCircle } from 'lucide-react';
import { RolePicker } from '@/components/shared/RolePicker';
import { ChannelPicker } from '@/components/shared/ChannelPicker';

export function RolesChannelsSelector({
  type,
  enabled = [],
  disabled = [],
  onEnabledChange,
  onDisabledChange,
}) {
  const Picker = type === 'role' ? RolePicker : ChannelPicker;
  const itemLabel = type === 'role' ? 'الرولات' : 'الرومات';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Enabled (whitelist) */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{itemLabel} المفعّلة</span>
        </label>
        <Picker
          multiple
          value={enabled}
          onChange={onEnabledChange}
          placeholder="الكل مفعّل افتراضياً..."
        />
        <p className="text-[10px] text-muted-foreground">
          إذا اخترت، الأمر يشتغل فقط في هذي
        </p>
      </div>

      {/* Disabled (blacklist) */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-rose-500">
          <XCircle className="w-3.5 h-3.5" />
          <span>{itemLabel} المعطّلة</span>
        </label>
        <Picker
          multiple
          value={disabled}
          onChange={onDisabledChange}
          placeholder="ما فيه معطّل..."
        />
        <p className="text-[10px] text-muted-foreground">
          الأمر ما يشتغل في هذي
        </p>
      </div>
    </div>
  );
}