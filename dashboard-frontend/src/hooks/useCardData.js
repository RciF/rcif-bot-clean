/**
 * ═══════════════════════════════════════════════════════════
 *  Card Premium — React Query Hooks
 *  المسار: dashboard-frontend/src/hooks/useCardData.js
 *
 *  hooks جاهزة للاستخدام في كل صفحات تخصيص البطاقة
 *
 *  USER HOOKS:
 *   - useCardMe()                   → اشتراكي + إعداداتي
 *   - useCardSettings()             → إعدادات بطاقتي
 *   - useSaveCardSettings()         → mutation لحفظ الإعدادات
 *   - useResetCardSettings()        → mutation للإعادة التعيين
 *   - useCardTiers()                → كل الفئات
 *   - useMyCardRequests()           → طلباتي
 *   - useCreateCardRequest()        → mutation لإرسال طلب
 *   - useMyCardLogs()               → سجل أحداثي
 *
 *  ADMIN HOOKS:
 *   - useCardAdminStats()                  → إحصائيات
 *   - useCardAdminRequests(filters)        → كل الطلبات
 *   - useApproveCardRequest()              → mutation
 *   - useRejectCardRequest()               → mutation
 *   - useCardAdminSubscriptions(filters)   → كل المشتركين
 *   - useCardAdminSubscription(userId)     → اشتراك محدد
 *   - useExtendSubscription()              → mutation
 *   - useCancelSubscription()              → mutation
 *   - useChangeTier()                      → mutation
 *   - useGiftSubscription()                → mutation
 *   - useCardAdminLogs(filters)            → سجل
 * ═══════════════════════════════════════════════════════════
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cardApi, cardAdminApi } from '@/api/cardApi';

// ════════════════════════════════════════════════════════════
//  QUERY KEYS
// ════════════════════════════════════════════════════════════

export const CARD_QUERY_KEYS = {
  me: ['card', 'me'],
  settings: ['card', 'settings'],
  tiers: ['card', 'tiers'],
  myRequests: ['card', 'requests', 'me'],
  myLogs: ['card', 'logs', 'me'],

  // Admin
  adminStats: ['card', 'admin', 'stats'],
  adminRequests: (filters) => ['card', 'admin', 'requests', filters],
  adminSubscriptions: (filters) => ['card', 'admin', 'subscriptions', filters],
  adminSubscription: (userId) => ['card', 'admin', 'subscription', userId],
  adminLogs: (filters) => ['card', 'admin', 'logs', filters],
};

// ════════════════════════════════════════════════════════════
//  ══════════════════════════════════════════════════════════
//   USER HOOKS
//  ══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════

/**
 * اشتراكي + إعداداتي + الفئة الحالية
 */
export function useCardMe(options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.me,
    queryFn: () => cardApi.me(),
    staleTime: 30_000,
    ...options,
  });
}

/**
 * إعدادات بطاقتي فقط
 */
export function useCardSettings(options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.settings,
    queryFn: () => cardApi.getSettings(),
    staleTime: 30_000,
    ...options,
  });
}

/**
 * حفظ إعدادات البطاقة
 *
 * Usage:
 *   const { mutate: save, isPending } = useSaveCardSettings();
 *   save({ theme_id: 'sunset', badges: ['vip'] });
 */
export function useSaveCardSettings(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => cardApi.saveSettings(data),
    onSuccess: (data) => {
      queryClient.setQueryData(CARD_QUERY_KEYS.settings, data);
      queryClient.invalidateQueries({ queryKey: CARD_QUERY_KEYS.me });
      toast.success('✅ تم حفظ الإعدادات');
    },
    onError: (err) => {
      const msg = err?.message || 'فشل حفظ الإعدادات';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * إعادة تعيين البطاقة للافتراضي
 */
export function useResetCardSettings(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cardApi.resetSettings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARD_QUERY_KEYS.settings });
      queryClient.invalidateQueries({ queryKey: CARD_QUERY_KEYS.me });
      toast.success('🔄 تم إعادة تعيين البطاقة');
    },
    onError: (err) => {
      const msg = err?.message || 'فشل إعادة التعيين';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * كل الفئات المتاحة
 */
export function useCardTiers(options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.tiers,
    queryFn: () => cardApi.getTiers(),
    staleTime: 5 * 60_000, // 5 دقائق
    ...options,
  });
}

/**
 * طلباتي السابقة
 */
export function useMyCardRequests(options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.myRequests,
    queryFn: () => cardApi.getMyRequests(),
    staleTime: 30_000,
    ...options,
  });
}

/**
 * إرسال طلب اشتراك جديد
 *
 * Usage:
 *   const { mutate: send } = useCreateCardRequest();
 *   send({ tier: 'advanced', duration: 'monthly', ref_number: '...' });
 */
export function useCreateCardRequest(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => cardApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARD_QUERY_KEYS.myRequests });
      toast.success('📨 تم إرسال طلبك، انتظر مراجعة الأدمن');
    },
    onError: (err) => {
      const msg = err?.message || 'فشل إرسال الطلب';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * سجل أحداث اشتراكي
 */
export function useMyCardLogs(options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.myLogs,
    queryFn: () => cardApi.getMyLogs(),
    staleTime: 30_000,
    ...options,
  });
}

// ════════════════════════════════════════════════════════════
//  ══════════════════════════════════════════════════════════
//   ADMIN HOOKS
//  ══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════

/**
 * إحصائيات لوحة الأدمن
 */
export function useCardAdminStats(options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.adminStats,
    queryFn: () => cardAdminApi.getStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    ...options,
  });
}

/**
 * كل الطلبات (filtered)
 */
export function useCardAdminRequests(filters = {}, options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.adminRequests(filters),
    queryFn: () => cardAdminApi.getRequests(filters),
    staleTime: 15_000,
    ...options,
  });
}

/**
 * قبول طلب
 */
export function useApproveCardRequest(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, adminNote }) => cardAdminApi.approveRequest(id, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', 'admin'] });
      toast.success('✅ تم قبول الطلب وتفعيل الاشتراك');
    },
    onError: (err) => {
      const msg = err?.message || 'فشل قبول الطلب';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * رفض طلب
 */
export function useRejectCardRequest(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, adminNote }) => cardAdminApi.rejectRequest(id, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', 'admin'] });
      toast.success('❌ تم رفض الطلب');
    },
    onError: (err) => {
      const msg = err?.message || 'فشل رفض الطلب';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * كل الاشتراكات (filtered)
 */
export function useCardAdminSubscriptions(filters = {}, options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.adminSubscriptions(filters),
    queryFn: () => cardAdminApi.getSubscriptions(filters),
    staleTime: 30_000,
    ...options,
  });
}

/**
 * اشتراك مستخدم محدد
 */
export function useCardAdminSubscription(userId, options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.adminSubscription(userId),
    queryFn: () => cardAdminApi.getSubscription(userId),
    enabled: !!userId,
    staleTime: 15_000,
    ...options,
  });
}

/**
 * تمديد يدوي
 */
export function useExtendSubscription(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, days, reason }) =>
      cardAdminApi.extendSubscription(userId, days, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['card', 'admin'] });
      queryClient.invalidateQueries({
        queryKey: CARD_QUERY_KEYS.adminSubscription(vars.userId),
      });
      toast.success(`➕ تم التمديد بـ ${vars.days} يوم`);
    },
    onError: (err) => {
      const msg = err?.message || 'فشل التمديد';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * إلغاء اشتراك
 */
export function useCancelSubscription(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }) =>
      cardAdminApi.cancelSubscription(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', 'admin'] });
      toast.success('⛔ تم إلغاء الاشتراك');
    },
    onError: (err) => {
      const msg = err?.message || 'فشل الإلغاء';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * تغيير فئة الاشتراك
 */
export function useChangeTier(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, tier, reason }) =>
      cardAdminApi.changeTier(userId, tier, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', 'admin'] });
      toast.success('🔄 تم تغيير الفئة');
    },
    onError: (err) => {
      const msg = err?.message || 'فشل تغيير الفئة';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * منح اشتراك هدية
 */
export function useGiftSubscription(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, tier, days, reason }) =>
      cardAdminApi.giftSubscription(userId, tier, days, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['card', 'admin'] });
      toast.success(`🎁 تم منح اشتراك ${vars.tier} لمدة ${vars.days} يوم`);
    },
    onError: (err) => {
      const msg = err?.message || 'فشل منح الهدية';
      toast.error(msg);
    },
    ...options,
  });
}

/**
 * سجل الأحداث
 */
export function useCardAdminLogs(filters = {}, options = {}) {
  return useQuery({
    queryKey: CARD_QUERY_KEYS.adminLogs(filters),
    queryFn: () => cardAdminApi.getLogs(filters),
    staleTime: 30_000,
    ...options,
  });
}