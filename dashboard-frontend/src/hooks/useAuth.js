import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * useAuth — hook مريح للوصول لحالة الـ auth
 *
 * يقوم بـ auto-fetch للمستخدم لو فيه token محفوظ لكن ما فيه user في الـ store
 * (مثلاً: المستخدم رجع للموقع بعد فترة، الـ persist استرجع الـ token
 *  لكن نتأكد من صلاحيته بـ fetchMe)
 *
 * ⚠️ يستخدم useRef guard لمنع double-fetch في StrictMode
 */
export function useAuth() {
  const auth = useAuthStore();
  const fetchedRef = useRef(false);

  useEffect(() => {
    // لو سبق وحاولنا fetch، تجاهل
    if (fetchedRef.current) return;

    const token = localStorage.getItem('lyn-auth-token');

    // فقط لو فيه token + ما فيه user + ما نحن في حالة تحميل
    if (token && !auth.user && !auth.isLoading) {
      fetchedRef.current = true;
      auth.fetchMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, auth.isLoading]);

  return auth;
}