import { useState, useEffect } from 'react';
import { mock } from '@/lib/mock';

/**
 * useGuildResources — جلب موارد السيرفر (channels, roles, members)
 *
 * @example
 *   const { channels, roles, members, isLoading } = useGuildResources();
 *
 *   const { channels } = useGuildResources({ types: ['channels'] });
 */

export function useGuildResources({ types = ['channels', 'roles', 'members'] } = {}) {
  const [channels, setChannels] = useState(null);
  const [roles, setRoles] = useState(null);
  const [members, setMembers] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const promises = [];

    if (types.includes('channels')) {
      promises.push(mock.guildChannels().then(setChannels));
    }
    if (types.includes('roles')) {
      promises.push(mock.guildRoles().then(setRoles));
    }
    if (types.includes('members')) {
      promises.push(mock.membersList().then(setMembers));
    }

    Promise.all(promises).finally(() => setIsLoading(false));
  }, []); // eslint-disable-line

  return {
    channels,
    roles,
    members,
    isLoading,
  };
}

/**
 * useChannel — جلب قناة بـ ID
 */
export function useChannel(channelId) {
  const { channels } = useGuildResources({ types: ['channels'] });
  return channels?.find((c) => c.id === channelId) || null;
}

/**
 * useRole — جلب رتبة بـ ID
 */
export function useRole(roleId) {
  const { roles } = useGuildResources({ types: ['roles'] });
  return roles?.find((r) => r.id === roleId) || null;
}

/**
 * useMember — جلب عضو بـ ID
 */
export function useMember(memberId) {
  const { members } = useGuildResources({ types: ['members'] });
  return members?.find((m) => m.id === memberId) || null;
}
