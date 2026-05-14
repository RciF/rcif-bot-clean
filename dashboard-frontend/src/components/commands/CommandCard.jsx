/**
 * ═══════════════════════════════════════════════════════════
 *  CommandCard — كرت أمر كامل (يجمع كل المميزات)
 *
 *  Features:
 *  - عرض اسم الأمر (الأصلي أو custom_name)
 *  - Badge "أصلاً: xxx" لو فيه custom_name
 *  - Tier badge
 *  - Plan lock badge لو ما يقدر يستخدمه
 *  - Subcommand badge
 *  - زر تعديل الاسم (مع plan gate)
 *  - Switch تفعيل/تعطيل
 *  - AliasesInput
 *  - Usage badge
 * ═══════════════════════════════════════════════════════════
 */

import {
  Edit3,
  Tag,
  TrendingUp,
  Lock,
  Crown,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuickTooltip } from '@/components/ui/Tooltip';
import { AliasesInput } from './AliasesInput';
import { hasAccess, PLAN_TIERS } from '@/lib/plans';
import { formatNumber, cn } from '@/lib/utils';

// ─── Tier metadata ───
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
}) {
  const tier = command.subscriptionTier || 'free';
  const tierMeta = TIER_META[tier];

  const userHasAccess = hasAccess(guildPlan, tier);
  const isEnabled = command.enabled !== false;
  const displayName = command.custom_name || command.name;

  // ─── Handlers ───
  const handleToggle = (newValue) => {
    onToggle(command.name, newValue);
  };

  const handleAddAlias = async (alias) => {
    await onAddAlias(command.name, alias);
  };

  const handleRemoveAlias = async (alias) => {
    await onRemoveAlias(command.name, alias);
  };

  const handleRenameClick = () => {
    if (canRename) {
      onRename(command);
    }
  };

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        !isEnabled && 'opacity-60',
        !userHasAccess && 'opacity-50',
      )}
    >
      <div className="space-y-3">
        {/* ─── Row 1: name + badges + actions ─── */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* Command name */}
              <h3
                className="font-bold text-base font-mono num"
                dir="ltr"
              >
                /{displayName}
              </h3>

              {/* Original name badge */}
              {command.custom_name && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 h-4 px-1.5 font-mono"
                >
                  أصلاً: {command.name}
                </Badge>
              )}

              {/* Tier badge */}
              <Badge
                variant="outline"
                size="sm"
                className={cn('gap-1', tierMeta?.color)}
              >
                {tier === 'diamond' && <Crown className="w-3 h-3" />}
                <span>{tierMeta?.label}</span>
              </Badge>

              {/* Subcommand */}
              {command.isSubcommand && (
                <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5">
                  فرعي
                </Badge>
              )}

              {/* Plan lock indicator */}
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

              {/* Usage */}
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
            </div>

            <p className="text-sm text-muted-foreground">{command.description}</p>
          </div>

          {/* Right side: rename + toggle */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <QuickTooltip content={canRename ? 'تغيير الاسم' : 'يحتاج Silver أو أعلى'}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRenameClick}
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
              onCheckedChange={handleToggle}
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
            onAdd={handleAddAlias}
            onRemove={handleRemoveAlias}
            max={5}
            disabled={!isEnabled || !userHasAccess}
          />
        </div>
      </div>
    </Card>
  );
}