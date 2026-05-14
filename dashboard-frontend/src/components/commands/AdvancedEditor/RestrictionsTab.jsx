/**
 * ═══════════════════════════════════════════════════════════
 *  RestrictionsTab — Tab "الصلاحيات" في الـ Advanced Editor
 *
 *  يتيح ضبط:
 *  - الرولات المفعّلة / المعطّلة
 *  - الرومات المفعّلة / المعطّلة
 * ═══════════════════════════════════════════════════════════
 */

import { Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { RolesChannelsSelector } from './RolesChannelsSelector';

export function RestrictionsTab({ restrictions, onChange }) {
  const update = (field, value) => {
    onChange({ ...restrictions, [field]: value });
  };

  return (
    <div className="space-y-5">
      {/* ─── Info ─── */}
      <Card className="p-4 bg-amber-500/5 border-amber-500/30">
        <div className="flex items-start gap-2 text-xs">
          <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-500 mb-1">
              ملاحظة عن الصلاحيات
            </p>
            <p className="text-muted-foreground leading-relaxed">
              المفعّلة (whitelist): إذا اخترت، الأمر يشتغل فقط فيها
              <br />
              المعطّلة (blacklist): الأمر ما يشتغل فيها
              <br />
              مالك السيرفر يقدر يستخدم الأمر دائماً (حتى لو معطّل)
            </p>
          </div>
        </div>
      </Card>

      {/* ─── Roles ─── */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">الرولات</h3>
        <RolesChannelsSelector
          type="role"
          enabled={restrictions.enabled_roles || []}
          disabled={restrictions.disabled_roles || []}
          onEnabledChange={(v) => update('enabled_roles', v)}
          onDisabledChange={(v) => update('disabled_roles', v)}
        />
      </div>

      {/* ─── Channels ─── */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">الرومات</h3>
        <RolesChannelsSelector
          type="channel"
          enabled={restrictions.enabled_channels || []}
          disabled={restrictions.disabled_channels || []}
          onEnabledChange={(v) => update('enabled_channels', v)}
          onDisabledChange={(v) => update('disabled_channels', v)}
        />
      </div>
    </div>
  );
}