/**
 * ═══════════════════════════════════════════════════════════
 *  Effects Picker v2 — اختيار التأثيرات مع معاينة حية
 *  المسار: dashboard-frontend/src/components/card/EffectsPicker.jsx
 * ═══════════════════════════════════════════════════════════
 */

import { Sparkles, Lock, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { EFFECTS, tierMeetsRequirement } from '@/lib/cardAssets';
import { getTier, CARD_TIERS } from '@/lib/cardPlans';

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
//  Effect Card — مع معاينة حية للتأثير
// ════════════════════════════════════════════════════════════

function EffectCard({ effect, isActive, disabled, canActivate, onClick }) {
  const requiredTier = getTier(effect.minTier);
  const cannotAdd = !disabled && !isActive && !canActivate;

  return (
    <button
      onClick={!disabled && (canActivate || isActive) ? onClick : undefined}
      disabled={disabled || cannotAdd}
      className={cn(
        'group relative rounded-xl border-2 p-4 transition-all text-right overflow-hidden',
        isActive
          ? 'border-primary ring-2 ring-primary/50 bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 bg-card',
        (disabled || cannotAdd) && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* ─── خلفية تأثير ديكورية ─── */}
      {!disabled && (
        <EffectBackgroundPreview effectId={effect.id} isActive={isActive} />
      )}

      <div className="relative flex items-start gap-3 z-10">
        {/* ─── معاينة التأثير ─── */}
        <div className="flex-shrink-0">
          <EffectPreview effectId={effect.id} isActive={isActive} disabled={disabled} />
        </div>

        {/* ─── الاسم والوصف ─── */}
        <div className="flex-1 min-w-0">
          <h5 className="font-bold text-sm mb-0.5 flex items-center gap-1.5">
            <span className="text-lg">{effect.emoji}</span>
            {effect.name}
          </h5>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {effect.description}
          </p>
        </div>

        {/* ─── الاختيار/القفل ─── */}
        {isActive && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 z-20">
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

// ════════════════════════════════════════════════════════════
//  Effect Background Preview (ديكور خلفية)
// ════════════════════════════════════════════════════════════

function EffectBackgroundPreview({ effectId, isActive }) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none opacity-30">
      {effectId === 'glow' && (
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-violet-500 rounded-full blur-3xl" />
      )}
      {effectId === 'gradient' && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/40 via-pink-500/40 to-amber-500/40" />
      )}
      {effectId === 'particles' && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-amber-300 rounded-full animate-pulse"
              style={{
                top: `${15 + (i * 13) % 70}%`,
                left: `${10 + (i * 17) % 80}%`,
                animationDelay: `${i * 0.3}s`,
                boxShadow: '0 0 8px rgba(251, 191, 36, 0.8)',
              }}
            />
          ))}
        </div>
      )}
      {effectId === 'shine' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      )}
      {effectId === 'pulse' && (
        <div className="absolute top-1/2 right-8 -translate-y-1/2">
          <div className="w-16 h-16 rounded-full border-2 border-pink-400 animate-ping" />
        </div>
      )}
      {effectId === 'animated_border' && (
        <div className="absolute inset-0 rounded-xl border-2 border-amber-400 animate-pulse" />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Effect Preview Icon
// ════════════════════════════════════════════════════════════

function EffectPreview({ effectId, isActive, disabled }) {
  const baseClasses = 'relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl';

  const previews = {
    glow: (
      <div
        className={cn(baseClasses, 'bg-violet-500/10')}
        style={
          !disabled && isActive
            ? { boxShadow: '0 0 25px rgba(139, 92, 246, 0.7)' }
            : !disabled
            ? { boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)' }
            : {}
        }
      >
        💫
      </div>
    ),
    gradient: (
      <div
        className={cn(baseClasses, 'overflow-hidden')}
        style={
          !disabled
            ? {
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f59e0b)',
              }
            : { background: '#1a1a1a' }
        }
      >
        🌈
      </div>
    ),
    animated_border: (
      <div
        className={cn(
          baseClasses,
          'border-2',
          !disabled && isActive
            ? 'border-amber-500 animate-pulse'
            : !disabled
            ? 'border-amber-500/50'
            : 'border-muted',
        )}
      >
        🎯
      </div>
    ),
    particles: (
      <div className={cn(baseClasses, 'bg-amber-500/10 relative')}>
        <span>✨</span>
        {!disabled && isActive && (
          <>
            <div className="absolute top-1 left-1 w-1 h-1 bg-amber-300 rounded-full animate-pulse" />
            <div
              className="absolute bottom-1 right-1 w-1 h-1 bg-amber-300 rounded-full animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
            <div
              className="absolute top-1 right-2 w-1 h-1 bg-amber-300 rounded-full animate-pulse"
              style={{ animationDelay: '1s' }}
            />
          </>
        )}
      </div>
    ),
    shine: (
      <div className={cn(baseClasses, 'bg-amber-500/10 overflow-hidden relative')}>
        <span>⚡</span>
        {!disabled && isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
        )}
      </div>
    ),
    pulse: (
      <div className={cn(baseClasses, 'bg-pink-500/10 relative')}>
        <span>💗</span>
        {!disabled && isActive && (
          <div className="absolute inset-0 rounded-xl border-2 border-pink-400 animate-ping" />
        )}
      </div>
    ),
  };

  return previews[effectId] || <div className={cn(baseClasses, 'bg-muted')}>✨</div>;
}