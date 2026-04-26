import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi } from '@/api/servers';
import { toast } from 'sonner';

export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: serversApi.getAll,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useServer(serverId) {
  return useQuery({
    queryKey: ['servers', serverId],
    queryFn: () => serversApi.getById(serverId),
    enabled: !!serverId,
  });
}

export function useServerStats(serverId) {
  return useQuery({
    queryKey: ['servers', serverId, 'stats'],
    queryFn: () => serversApi.getStats(serverId),
    enabled: !!serverId,
    refetchInterval: 30 * 1000, // Refresh every 30s
  });
}

export function useServerSettings(serverId) {
  return useQuery({
    queryKey: ['servers', serverId, 'settings'],
    queryFn: () => serversApi.getSettings(serverId),
    enabled: !!serverId,
  });
}

export function useUpdateServerSettings(serverId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings) => serversApi.updateSettings(serverId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers', serverId, 'settings'] });
      toast.success('تم حفظ الإعدادات بنجاح');
    },
    onError: (err) => {
      toast.error(err.message || 'فشل حفظ الإعدادات');
    },
  });
}
