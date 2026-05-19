/**
 * ═══════════════════════════════════════════════════════════
 *  Effects Picker — اختيار التأثيرات
 *  المسار: dashboard-frontend/src/components/card/EffectsPicker.jsx
 * ═══════════════════════════════════════════════════════════
 */

import { Sparkles, Lock, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { EFFECTS, tierMeetsRequirement } from '@/lib/cardAssets';
import { getTier, CARD_TIERS } from '@/lib/cardPlans';

/**
 * @param {object} props.effects - { glow: true, gradient: true, ... }
 * @param {string} props.userTier
 * @param {(effects: object) => void} props.onChange
 */
export function EffectsPicker({
  effects = {},
  userTier = 'free',
  onChange,
  className,
}) {
  const tierData = CARD_TIERS[userTier] || CARD_TIERS.free;
  const maxEffects = tierData.features.effects;

  const available = EFFECTS.filter((e) =>
    tierMeetsRequirement(userTier, e.minTier),
  );
  const locked = EFFECTS.filter((e) => !tierMeetsRequirement(userTier, e.minTier));

  const activeEffects = Object.entries(effects)
    .filter(([_, v]) => !!v)
    .map(([k]) => k);

  const handleToggle = (effectId) => {
    const isActive = !!effects[effectId];

    if (isActive) {
      const updated = { ...effects };
      delete updated[effectId];
      onChange?.(updated);
    } else {
      if (activeEffects.length >= maxEffects) {
        return;
      }
      onChange?.({ ...effects, [effectId]: true });
    }
  };

  if (maxEffects === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Lock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          التأثيرات غير متاحة في فئتك. اشترك في المتقدمة أو الأسطورية.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <h4 className="font-semibold text-sm">التأثيرات</h4>
        </div>

        <Badge
          variant={activeEffects.length === maxEffects ? 'default' : 'outline'}
          size="sm"
        >
          {activeEffects.length} / {maxEffects}
        </Badge>
      </div>

      {/* ═══ المتاحة ═══ */}
      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-2">
          التأثيرات المتاحة
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {available.map((effect) => (
            <EffectCard
              key={effect.id}
              effect={effect}
              isActive={!!effects[effect.id]}
              disabled={false}
              canActivate={
                !!effects[effect.id] || activeEffects.length < maxEffects
              }
              onClick={() => handleToggle(effect.id)}
            />
          ))}
        </div>
      </div>

      {/* ═══ المقفولة ═══ */}
      {locked.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            تحتاج ترقية
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {locked.map((effect) => (
              <EffectCard key={effect.id} effect={effect} disabled={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Effect Card
// ════════════════════════════════════════════════════════════

function EffectCard({ effect, isActive, disabled, canActivate, onClick }) {
  const requiredTier = getTier(effect.minTier);
  const cannotAdd = !disabled && !isActive && !canActivate;

  return (
    <button
      onClick={!disabled && (canActivate || isActive) ? onClick : undefined}
      disabled={disabled || cannotAdd}
      className={cn(
        'relative rounded-xl border-2 p-4 transition-all text-right',
        isActive
          ? 'border-primary ring-2 ring-primary/50 bg-primary/5'
          : 'border-border hover:border-primary/50 bg-card',
        (disabled || cannotAdd) && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{effect.emoji}</div>

        <div className="flex-1 min-w-0">
          <h5 className="font-bold text-sm mb-0.5">{effect.name}</h5>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {effect.description}
          </p>
        </div>

        {/* ─── الاختيار/القفل ─── */}
        {isActive && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {disabled && (
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-[9px] font-bold text-muted-foreground">
              {requiredTier.icon}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}