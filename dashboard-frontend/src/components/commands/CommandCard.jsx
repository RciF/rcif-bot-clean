/**
 * ═══════════════════════════════════════════════════════════
 *  CommandCard — كرت أمر كامل (Batch 8 Final)
 *
 *  Features:
 *  - عرض اسم الأمر + custom_name badge
 *  - Tier badge + Plan lock + Subcommand badges
 *  - Usage count badge
 *  - زر تعديل الاسم (plan gate)
 *  - ✅ NEW: زر "تعديل متقدم" يفتح AdvancedEditor (plan gate)
 *  - Switch تفعيل/تعطيل
 *  - AliasesInput
 * ═══════════════════════════════════════════════════════════
 */

import { Edit3, Tag, TrendingUp, Lock, Crown, Settings2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuickTooltip } from '@/components/ui/Tooltip';
import { AliasesInput } from './AliasesInput';
import { hasAccess } from '@/lib/plans';
import { formatNumber, cn } from '@/lib/utils';

const TIER_META = {
  free:    { label: 'مجاني',  color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  silver:  { label: 'فضي',    color: 'bg-zinc-400/10 text-zinc-300 border-zinc-400/30' },
  gold:    { label: 'ذهبي',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  diamond: { label: 'ماسي',   color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
};

export function CommandCard({
  command,
  guildPlan,
  canRename,
  onToggle,
  onRename,
  onAddAlias,
  onRemoveAlias,
  onAdvancedEdit,
}) {
  const tier = command.subscriptionTier || 'free';
  const tierMeta = TIER_META[tier];
  const userHasAccess = hasAccess(guildPlan, tier);
  const isEnabled = command.enabled !== false;
  const displayName = command.custom_name || command.name;

  // ─── فحص لو فيه إعدادات متقدمة نشطة ───
  const hasActiveRestrictions =
    (command.restrictions?.enabled_roles?.length || 0) > 0 ||
    (command.restrictions?.disabled_roles?.length || 0) > 0 ||
    (command.restrictions?.enabled_channels?.length || 0) > 0 ||
    (command.restrictions?.disabled_channels?.length || 0) > 0;

  const hasActiveDefaults =
    !!command.defaults?.default_duration ||
    command.defaults?.delete_invocation ||
    command.defaults?.delete_response ||
    command.defaults?.delete_on_user_delete;

  const hasAdvancedConfig = hasActiveRestrictions || hasActiveDefaults;

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        !isEnabled && 'opacity-60',
        !userHasAccess && 'opacity-50',
      )}
    >
      <div className="space-y-3">
        {/* ─── Row 1 ─── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-base font-mono num">
               <span dir="ltr">/</span>{displayName}
               </h3>

              {command.custom_name && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 h-4 px-1.5 font-mono"
                >
                  أصلاً: {command.name}
                </Badge>
              )}

              <Badge
                variant="outline"
                size="sm"
                className={cn('gap-1', tierMeta?.color)}
              >
                {tier === 'diamond' && <Crown className="w-3 h-3" />}
                <span>{tierMeta?.label}</span>
              </Badge>

              {command.isSubcommand && (
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 h-4 px-1.5"
                >
                  فرعي
                </Badge>
              )}

              {!userHasAccess && (
                <Badge
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-rose-500/10 text-rose-500 border-rose-500/30"
                >
                  <Lock className="w-3 h-3" />
                  <span>مقفول</span>
                </Badge>
              )}

              {command.usage_count > 0 && (
                <Badge
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-violet-500/10 text-violet-400 border-violet-500/30"
                >
                  <TrendingUp className="w-3 h-3" />
                  <span className="num">{formatNumber(command.usage_count)}</span>
                </Badge>
              )}

              {/* ✅ Advanced config indicator */}
              {hasAdvancedConfig && (
                <Badge
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-primary/10 text-primary border-primary/30"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>متقدم</span>
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{command.description}</p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* ✅ Advanced edit button */}
            {onAdvancedEdit && (
              <QuickTooltip content="إعدادات متقدمة">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAdvancedEdit(command)}
                  disabled={!userHasAccess}
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </QuickTooltip>
            )}

            <QuickTooltip content={canRename ? 'تغيير الاسم' : 'يحتاج Silver أو أعلى'}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRename(command)}
                disabled={!userHasAccess}
              >
                {canRename ? (
                  <Edit3 className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </Button>
            </QuickTooltip>

            <Switch
              checked={isEnabled}
              onCheckedChange={(v) => onToggle(command.name, v)}
              disabled={!userHasAccess}
            />
          </div>
        </div>

        {/* ─── Row 2: Aliases ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="w-3.5 h-3.5" />
              <span>الاختصارات</span>
              <Badge variant="outline" size="sm" className="num text-[10px]">
                {command.aliases?.length || 0}/5
              </Badge>
            </div>
          </div>

          <AliasesInput
            aliases={command.aliases || []}
            onAdd={(alias) => onAddAlias(command.name, alias)}
            onRemove={(alias) => onRemoveAlias(command.name, alias)}
            max={5}
            disabled={!isEnabled || !userHasAccess}
          />
        </div>
      </div>
    </Card>
  );
}