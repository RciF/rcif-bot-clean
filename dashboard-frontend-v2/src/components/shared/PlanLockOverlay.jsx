import { Lock, Sparkles, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getPlanInfo, PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

/**
 * PlanLockOverlay — Overlay يطلع لما الميزة مقفولة
 *
 * عنده وضعين:
 * 1. Inline Banner — يطلع داخل الصفحة فوق المحتوى
 * 2. Modal — يطلع لما يضغط حفظ
 *
 * @example
 *   // Inline
 *   {isLocked && <PlanLockBanner currentPlan="silver" requiredPlan="gold" />}
 *
 *   // Modal
 *   <PlanLockModal {...lockModalProps} />
 */

// ════════════════════════════════════════════════════════════
//  Banner (يطلع داخل الصفحة)
// ════════════════════════════════════════════════════════════

export function PlanLockBanner({
  currentPlan = PLAN_TIERS.FREE,
  requiredPlan = PLAN_TIERS.GOLD,
  featureName = 'هذه الميزة',
  className,
}) {
  const required = getPlanInfo(requiredPlan);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 to-transparent p-4',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-amber-500/20 text-amber-500',
          )}
        >
          <Lock className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm">
              {featureName} متوفرة لخطة {required.name} {required.icon}
            </h3>
            <Badge variant={required.color} size="sm">
              {required.name}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            تقدر تجرب الإعدادات الحين، لكن الحفظ يحتاج ترقية
          </p>
        </div>

        <Button asChild variant="default" size="sm">
          <Link to="/dashboard/subscription">
            <Sparkles className="w-3.5 h-3.5" />
            ترقية
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Modal (يطلع لما يضغط حفظ)
// ════════════════════════════════════════════════════════════

export function PlanLockModal({
  open,
  onOpenChange,
  currentPlan = PLAN_TIERS.FREE,
  requiredPlan = PLAN_TIERS.GOLD,
  featureKey,
}) {
  const current = getPlanInfo(currentPlan);
  const required = getPlanInfo(requiredPlan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Hero Icon */}
        <div className="flex justify-center -mt-4 mb-2">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              'lyn-gradient lyn-glow animate-lyn-float',
            )}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-center text-xl">
            ترقية لخطة {required.name} {required.icon}
          </DialogTitle>
          <DialogDescription className="text-center">
            {required.description}
          </DialogDescription>
        </DialogHeader>

        {/* Price */}
        <div className="text-center py-4">
          <div className="text-3xl font-bold lyn-text-gradient num">
            {required.priceLabel}
          </div>
          {required.badge && (
            <Badge variant="lyn" size="sm" className="mt-2">
              {required.badge}
            </Badge>
          )}
        </div>

        {/* Features */}
        <div className="space-y-2 max-h-60 overflow-auto">
          {required.features.slice(0, 6).map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-500" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
          {required.features.length > 6 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              + {required.features.length - 6} ميزة أخرى
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="w-4 h-4" />
            لاحقاً
          </Button>
          <Button asChild variant="default" className="flex-1">
            <Link to="/dashboard/subscription">
              <Sparkles className="w-4 h-4" />
              ترقية الآن
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════
//  Default Export — Wrapper شامل
// ════════════════════════════════════════════════════════════

export function PlanLockOverlay(props) {
  return <PlanLockModal {...props} />;
}

export default PlanLockOverlay;
