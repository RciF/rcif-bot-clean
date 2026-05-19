/**
 * ═══════════════════════════════════════════════════════════
 *  Badge Picker — اختيار شارات البطاقة
 *  المسار: dashboard-frontend/src/components/card/BadgePicker.jsx
 * ═══════════════════════════════════════════════════════════
 */

import { Check, Lock, Award } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { BADGES, tierMeetsRequirement } from '@/lib/cardAssets';
import { getTier, CARD_TIERS } from '@/lib/cardPlans';

/**
 * @param {string[]} props.selectedBadges - badge IDs المختارة
 * @param {string} props.userTier
 * @param {(badges: string[]) => void} props.onChange
 */
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
        return; // تجاهل الإضافة لو وصلنا للحد الأقصى
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
      {/* ═══ Header مع العداد ═══ */}
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

      {/* ═══ الشارات المتاحة ═══ */}
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

      {/* ═══ الشارات المقفولة ═══ */}
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
//  Badge Card
// ════════════════════════════════════════════════════════════

function BadgeCard({ badge, isSelected, disabled, canSelect, onClick }) {
  const requiredTier = getTier(badge.minTier);
  const cannotAdd = !disabled && !isSelected && !canSelect;

  return (
    <button
      onClick={!disabled && (canSelect || isSelected) ? onClick : undefined}
      disabled={disabled || cannotAdd}
      className={cn(
        'relative aspect-square rounded-xl border-2 p-3 transition-all flex flex-col items-center justify-center gap-1.5',
        isSelected
          ? 'border-primary ring-2 ring-primary/50 scale-[1.05] bg-primary/5'
          : 'border-border hover:border-primary/50 bg-card',
        (disabled || cannotAdd) && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* ─── خلفية ملونة خفيفة ─── */}
      {!disabled && (
        <div
          className="absolute inset-0 rounded-xl opacity-10"
          style={{ background: badge.color }}
        />
      )}

      {/* ─── الأيقونة ─── */}
      <div className="relative text-3xl">{badge.emoji}</div>

      {/* ─── الاسم ─── */}
      <p className="relative text-[11px] font-bold text-center leading-tight">
        {badge.name}
      </p>

      {/* ─── علامة الاختيار ─── */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* ─── القفل ─── */}
      {disabled && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-0.5">
          <Lock className="w-4 h-4 text-white" />
          <span className="text-[9px] font-bold text-white">
            {requiredTier.icon}
          </span>
        </div>
      )}
    </button>
  );
}