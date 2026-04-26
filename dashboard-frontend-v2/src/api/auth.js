import { apiClient } from './client';

export const authApi = {
  /**
   * Exchange Discord OAuth code for session
   */
  loginWithDiscord: (code) =>
    apiClient.post('/api/auth/discord', { code }),

  /**
   * Get current user
   */
  getMe: () => apiClient.get('/api/auth/me'),

  /**
   * Logout
   */
  logout: () => apiClient.post('/api/auth/logout'),

  /**
   * Refresh session token
   */
  refresh: () => apiClient.post('/api/auth/refresh'),
};
