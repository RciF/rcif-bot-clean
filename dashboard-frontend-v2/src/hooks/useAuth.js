import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * useAuth — Convenient hook for accessing auth state
 */
export function useAuth() {
  const auth = useAuthStore();

  useEffect(() => {
    // Auto-fetch user on mount if token exists but no user
    const token = localStorage.getItem('lyn-auth-token');
    if (token && !auth.user && !auth.isLoading) {
      auth.fetchMe();
    }
  }, []);

  return auth;
}
