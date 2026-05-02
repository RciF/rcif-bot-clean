import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { guildApi } from "@/api"

/**
 * useGuildResources — جلب موارد السيرفر (channels, roles, members)
 * يستخدم react-query للـ caching التلقائي
 *
 * @example
 *   const { channels, roles, members, isLoading } = useGuildResources()
 *   const { channels } = useGuildResources({ types: ['channels'] })
 */

export function useGuildResources({
  types = ["channels", "roles"],
  guildId: gidProp,
} = {}) {
  const params = useParams()
  const guildId = gidProp || params.guildId

  const channelsQuery = useQuery({
    queryKey: ["guild", guildId, "channels"],
    queryFn: () => guildApi.channels(guildId),
    enabled: !!guildId && types.includes("channels"),
    staleTime: 60_000,
  })

  const rolesQuery = useQuery({
    queryKey: ["guild", guildId, "roles"],
    queryFn: () => guildApi.roles(guildId),
    enabled: !!guildId && types.includes("roles"),
    staleTime: 60_000,
  })

  const membersQuery = useQuery({
    queryKey: ["guild", guildId, "members"],
    queryFn: () => guildApi.members(guildId, { limit: 200 }),
    enabled: !!guildId && types.includes("members"),
    staleTime: 60_000,
  })

  const emojisQuery = useQuery({
    queryKey: ["guild", guildId, "emojis"],
    queryFn: () => guildApi.emojis(guildId),
    enabled: !!guildId && types.includes("emojis"),
    staleTime: 5 * 60_000,
  })

  return {
    channels: channelsQuery.data,
    roles: rolesQuery.data,
    members: membersQuery.data,
    emojis: emojisQuery.data,
    isLoading:
      (types.includes("channels") && channelsQuery.isLoading) ||
      (types.includes("roles") && rolesQuery.isLoading) ||
      (types.includes("members") && membersQuery.isLoading) ||
      (types.includes("emojis") && emojisQuery.isLoading),
    refetch: () => {
      channelsQuery.refetch()
      rolesQuery.refetch()
      membersQuery.refetch()
      emojisQuery.refetch()
    },
  }
}

/**
 * useChannel — جلب قناة بـ ID
 */
export function useChannel(channelId) {
  const { channels } = useGuildResources({ types: ["channels"] })
  return channels?.find((c) => c.id === channelId) || null
}

/**
 * useRole — جلب رتبة بـ ID
 */
export function useRole(roleId) {
  const { roles } = useGuildResources({ types: ["roles"] })
  return roles?.find((r) => r.id === roleId) || null
}

/**
 * useMember — جلب عضو بـ ID
 */
export function useMember(memberId) {
  const { members } = useGuildResources({ types: ["members"] })
  return members?.find((m) => m.id === memberId) || null
}
