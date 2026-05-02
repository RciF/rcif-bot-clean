import { useQuery } from '@tanstack/react-query';
import { useGuildStore } from '@/store/guildStore';
import { guildApi } from '@/api';

/**
 * useGuildResources — جلب موارد السيرفر (channels, roles, members, emojis)
 * يستخدم guildStore للـ guildId + react-query للـ caching
 */
export function useGuildResources({ types = ['channels', 'roles'] } = {}) {
  const { selectedGuildId: guildId } = useGuildStore();

  const channelsQuery = useQuery({
    queryKey: ['guild', guildId, 'channels'],
    queryFn: () => guildApi.channels(guildId),
    enabled: !!guildId && types.includes('channels'),
    staleTime: 60_000,
  });

  const rolesQuery = useQuery({
    queryKey: ['guild', guildId, 'roles'],
    queryFn: () => guildApi.roles(guildId),
    enabled: !!guildId && types.includes('roles'),
    staleTime: 60_000,
  });

  const membersQuery = useQuery({
    queryKey: ['guild', guildId, 'members'],
    queryFn: () => guildApi.members(guildId, { limit: 200 }),
    enabled: !!guildId && types.includes('members'),
    staleTime: 60_000,
  });

  const emojisQuery = useQuery({
    queryKey: ['guild', guildId, 'emojis'],
    queryFn: () => guildApi.emojis(guildId),
    enabled: !!guildId && types.includes('emojis'),
    staleTime: 5 * 60_000,
  });

  return {
    channels: channelsQuery.data ?? [],
    roles: rolesQuery.data ?? [],
    members: membersQuery.data ?? [],
    emojis: emojisQuery.data ?? [],
    isLoading:
      (types.includes('channels') && channelsQuery.isLoading) ||
      (types.includes('roles') && rolesQuery.isLoading) ||
      (types.includes('members') && membersQuery.isLoading) ||
      (types.includes('emojis') && emojisQuery.isLoading),
    refetch: () => {
      if (types.includes('channels')) channelsQuery.refetch();
      if (types.includes('roles')) rolesQuery.refetch();
      if (types.includes('members')) membersQuery.refetch();
      if (types.includes('emojis')) emojisQuery.refetch();
    },
  };
}

export function useChannel(channelId) {
  const { channels } = useGuildResources({ types: ['channels'] });
  return channels?.find((c) => c.id === channelId) || null;
}

export function useRole(roleId) {
  const { roles } = useGuildResources({ types: ['roles'] });
  return roles?.find((r) => r.id === roleId) || null;
}