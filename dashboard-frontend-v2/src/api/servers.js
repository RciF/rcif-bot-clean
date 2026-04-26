import { apiClient } from './client';

export const serversApi = {
  /**
   * Get all servers user has access to
   */
  getAll: () => apiClient.get('/api/servers'),

  /**
   * Get specific server details
   */
  getById: (serverId) => apiClient.get(`/api/servers/${serverId}`),

  /**
   * Get server stats
   */
  getStats: (serverId) => apiClient.get(`/api/servers/${serverId}/stats`),

  /**
   * Get server settings
   */
  getSettings: (serverId) =>
    apiClient.get(`/api/servers/${serverId}/settings`),

  /**
   * Update server settings
   */
  updateSettings: (serverId, settings) =>
    apiClient.patch(`/api/servers/${serverId}/settings`, settings),
};
