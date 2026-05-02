import { useState, useCallback } from 'react';
import {
  hasAccess,
  getPlanInfo,
  getRequiredPlan,
  PLAN_TIERS,
  isFeatureLocked,
} from '@/lib/plans';
import { useUIStore } from '@/store/uiStore';

/**
 * usePlanGate — Hook للتحقق من وصول الخطة وإدارة Try-before-buy
 *
 * @param {string} featureKey - المفتاح من FEATURE_PLANS (مثل 'ai', 'protection')
 * @param {string} currentPlan - الخطة الحالية (افتراضياً gold للتطوير)
 *
 * @example
 *   const { isLocked, currentPlanInfo, requiredPlanInfo, openLockModal, lockModalProps } = usePlanGate('ai');
 *
 *   if (isLocked) return <PlanLockOverlay {...lockModalProps} />;
 */
export function usePlanGate(featureKey, currentPlan = PLAN_TIERS.GOLD) {
  const [showModal, setShowModal] = useState(false);
  const requiredPlan = getRequiredPlan(featureKey);

  const isLocked = isFeatureLocked(currentPlan, requiredPlan);
  const canAccess = hasAccess(currentPlan, requiredPlan);

  const currentPlanInfo = getPlanInfo(currentPlan);
  const requiredPlanInfo = getPlanInfo(requiredPlan);

  const openLockModal = useCallback(() => setShowModal(true), []);
  const closeLockModal = useCallback(() => setShowModal(false), []);

  /**
   * استخدمها كـ wrapper لأي action يحتاج الخطة
   *
   * @example
   *   <button onClick={gateAction(handleSave)}>حفظ</button>
   */
  const gateAction = useCallback(
    (action) => (...args) => {
      if (isLocked) {
        setShowModal(true);
        return;
      }
      return action?.(...args);
    },
    [isLocked],
  );

  return {
    isLocked,
    canAccess,
    currentPlan,
    currentPlanInfo,
    requiredPlan,
    requiredPlanInfo,
    showModal,
    openLockModal,
    closeLockModal,
    gateAction,

    // Props جاهزة لـ <PlanLockOverlay />
    lockModalProps: {
      open: showModal,
      onOpenChange: setShowModal,
      currentPlan,
      requiredPlan,
      featureKey,
    },
  };
}
