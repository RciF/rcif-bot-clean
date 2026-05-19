/**
 * ═══════════════════════════════════════════════════════════
 *  Badge Picker v2 — اختيار شارات البطاقة بتصميم محسّن
 *  المسار: dashboard-frontend/src/components/card/BadgePicker.jsx
 * ═══════════════════════════════════════════════════════════
 */

import { Check, Lock, Award } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { BADGES, tierMeetsRequirement } from '@/lib/cardAssets';
import { getTier, CARD_TIERS } from '@/lib/cardPlans';

export function BadgePicker({
  selectedBadges = [],
  userTier = 'free',
  onChange,
  className,
}) {
  const tierData = CARD_TIERS[userTier] || CARD_TIERS.free;
  const maxBadges = tierData.features.badges;

  const available = BADGES.filter((b) =>
    tierMeetsRequirement(userTier, b.minTier),
  );
  const locked = BADGES.filter((b) => !tierMeetsRequirement(userTier, b.minTier));

  const handleToggle = (badgeId) => {
    const isSelected = selectedBadges.includes(badgeId);

    if (isSelected) {
      onChange?.(selectedBadges.filter((id) => id !== badgeId));
    } else {
      if (selectedBadges.length >= maxBadges) {
        return;
      }
      onChange?.([...selectedBadges, badgeId]);
    }
  };

  if (maxBadges === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Lock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          الشارات غير متاحة في فئتك. اشترك في الأساسية أو أعلى.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <h4 className="font-semibold text-sm">شاراتك</h4>
        </div>

        <Badge
          variant={selectedBadges.length === maxBadges ? 'default' : 'outline'}
          size="sm"
        >
          {selectedBadges.length} / {maxBadges}
        </Badge>
      </div>

      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-2">
          الشارات المتاحة
        </h5>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {available.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              isSelected={selectedBadges.includes(badge.id)}
              disabled={false}
              canSelect={
                selectedBadges.includes(badge.id) ||
                selectedBadges.length < maxBadges
              }
              onClick={() => handleToggle(badge.id)}
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

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {locked.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} disabled={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Badge Card — تصميم محسّن مع gradient + glow + shine
// ════════════════════════════════════════════════════════════

function BadgeCard({ badge, isSelected, disabled, canSelect, onClick }) {
  const requiredTier = getTier(badge.minTier);
  const cannotAdd = !disabled && !isSelected && !canSelect;

  return (
    <button
      onClick={!disabled && (canSelect || isSelected) ? onClick : undefined}
      disabled={disabled || cannotAdd}
      className={cn(
        'group relative aspect-square rounded-xl border-2 p-3 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden',
        isSelected
          ? 'border-primary ring-2 ring-primary/50 scale-[1.05]'
          : 'border-border hover:border-primary/50',
        (disabled || cannotAdd) && 'opacity-50 cursor-not-allowed',
      )}
      style={{
        background: !disabled
          ? `linear-gradient(135deg, ${badge.color}15, ${badge.color}05)`
          : undefined,
      }}
    >
      {/* ─── خلفية متوهجة ─── */}
      {!disabled && (
        <div
          className="absolute inset-0 opacity-20 blur-2xl"
          style={{ background: badge.color }}
        />
      )}

      {/* ─── الشارة الدائرية المحسّنة ─── */}
      <div className="relative z-10">
        <BadgeOrb badge={badge} />
      </div>

      {/* ─── الاسم ─── */}
      <p className="relative z-10 text-[11px] font-bold text-center leading-tight">
        {badge.name}
      </p>

      {/* ─── علامة الاختيار ─── */}
      {isSelected && (
        <div
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg z-20"
          style={{ boxShadow: `0 4px 12px ${badge.color}aa` }}
        >
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* ─── القفل ─── */}
      {disabled && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center gap-1 z-20">
          <Lock className="w-5 h-5 text-white" />
          <span className="text-[10px] font-bold text-white">
            {requiredTier.icon} {requiredTier.name}
          </span>
        </div>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════
//  BadgeOrb — الشارة الدائرية بتصميم gradient + shine + glow
// ════════════════════════════════════════════════════════════

function BadgeOrb({ badge, size = 48 }) {
  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* ─── Outer Glow Halo ─── */}
      <div
        className="absolute inset-0 rounded-full blur-md"
        style={{
          background: `radial-gradient(circle, ${badge.color}66 0%, transparent 70%)`,
          transform: 'scale(1.4)',
        }}
      />

      {/* ─── الدائرة الأساسية (gradient) ─── */}
      <div
        className="absolute inset-0 rounded-full shadow-lg"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${lightenHex(badge.color, 25)}, ${badge.color} 60%, ${darkenHex(badge.color, 15)} 100%)`,
          boxShadow: `inset 0 -2px 6px rgba(0,0,0,0.3), 0 4px 12px ${badge.color}55`,
        }}
      />

      {/* ─── Inner Shine ─── */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 35%, transparent 50%)',
        }}
      />

      {/* ─── Border ─── */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: '1.5px solid rgba(0,0,0,0.4)',
        }}
      />

      {/* ─── الأيقونة (Emoji) ─── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: size * 0.5 }}
      >
        {badge.emoji}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Color Helpers
// ════════════════════════════════════════════════════════════

function lightenHex(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * (percent / 100)));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * (percent / 100)));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * (percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darkenHex(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * (percent / 100)));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * (percent / 100)));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * (percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}