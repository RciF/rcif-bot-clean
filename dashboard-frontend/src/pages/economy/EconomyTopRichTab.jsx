import { useEffect, useState, useMemo } from 'react';
import { Trophy, Crown, Medal, Award, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useGuildStore } from '@/store/guildStore';
import { useGuildResources } from '@/hooks/useGuildResources';
import { settingsApi } from '@/api';
import { formatCompact, cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * استخراج معلومات عضو من Discord member object
 */
function normalizeMemberInfo(m) {
  const user = m.user || m;
  const id = user.id || m.id;
  const username =
    m.nick ||
    user.global_name ||
    user.username ||
    null;

  let avatarUrl = null;
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=64`;
  } else if (id) {
    const defaultIndex = (BigInt(id) >> 22n) % 6n;
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }

  return { id, username, avatarUrl };
}

export function EconomyTopRichTab({ data }) {
  const { selectedGuildId } = useGuildStore();
  const [topRich, setTopRich] = useState(null);

  // جلب أعضاء السيرفر لتخصيب أسماء/صور المتصدرين الموجودين
  const { members: rawMembers } = useGuildResources({
    types: ['members'],
  });

  // ─── Load leaderboard ───
  useEffect(() => {
    if (!selectedGuildId) {
      setTopRich([]);
      return;
    }

    let mounted = true;
    setTopRich(null);

    settingsApi
      .getEconomyLeaderboard(selectedGuildId, 50)
      .then((rows) => {
        if (!mounted) return;
        setTopRich(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setTopRich([]);
        toast.error(err.message || 'فشل تحميل قائمة المتصدرين');
      });

    return () => { mounted = false; };
  }, [selectedGuildId]);

  // ─── Build member lookup ───
  const memberMap = useMemo(() => {
    const map = new Map();
    (rawMembers || []).forEach((m) => {
      const info = normalizeMemberInfo(m);
      if (info.id) map.set(info.id, info);
    });
    return map;
  }, [rawMembers]);

  const enrichedList = useMemo(() => {
    if (!topRich) return null;
    return topRich.map((row, idx) => {
      const info = memberMap.get(row.user_id);
      return {
        rank: idx + 1,
        userId: row.user_id,
        coins: Number(row.coins) || 0,
        username: info?.username || `User ${row.user_id?.slice(-6) || '?'}`,
        avatarUrl: info?.avatarUrl || null,
      };
    });
  }, [topRich, memberMap]);

  const getRankStyle = (rank) => {
    if (rank === 1) return { icon: Crown, color: 'from-amber-400 to-yellow-600' };
    if (rank === 2) return { icon: Medal, color: 'from-slate-400 to-slate-600' };
    if (rank === 3) return { icon: Award, color: 'from-amber-700 to-amber-900' };
    return null;
  };

  const currencySymbol =
    data?.currency_symbol || data?.currencySymbol || '🪙';

  // ─── Loading ───
  if (enrichedList === null) {
    return (
      <Card className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        ))}
      </Card>
    );
  }

  // ─── Empty ───
  if (enrichedList.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<Trophy />}
          title="ما فيه متصدرين بعد"
          description="لما يبدأ الأعضاء يجمعون كوينز عبر /يومي و /عمل، راح تظهر القائمة هنا"
        />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold mb-0.5">أغنى الأعضاء</h3>
            <p className="text-sm text-muted-foreground">
              قائمة أصحاب أكبر الأرصدة •{' '}
              <span className="num">{enrichedList.length}</span> لاعب
            </p>
          </div>
        </div>

        {/* تنبيه إن الاقتصاد عالمي */}
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20">
          <Globe className="w-3 h-3" />
          الاقتصاد عالمي
        </div>
      </div>

      <div className="space-y-1.5">
        {enrichedList.map((user) => {
          const rankStyle = getRankStyle(user.rank);
          const Icon = rankStyle?.icon;

          return (
            <div
              key={user.userId}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-colors',
                user.rank <= 3
                  ? 'bg-gradient-to-l from-amber-500/5 to-transparent border border-amber-500/20'
                  : 'hover:bg-accent/50',
              )}
            >
              {/* Rank */}
              <div className="w-10 flex items-center justify-center">
                {Icon ? (
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center',
                      rankStyle.color,
                    )}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground num">
                    #{user.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {user.username[0]}
                </div>
              )}

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {user.username}
                </div>
                <div className="text-xs text-muted-foreground ltr">
                  ID: {user.userId?.slice(-8)}
                </div>
              </div>

              {/* Coins */}
              <div className="text-end">
                <div className="text-lg font-bold lyn-text-gradient num">
                  {formatCompact(user.coins)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currencySymbol}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}