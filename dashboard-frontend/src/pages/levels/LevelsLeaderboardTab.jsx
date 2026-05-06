import { useEffect, useState, useMemo } from 'react';
import { Trophy, Crown, Medal, Award, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
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

export function LevelsLeaderboardTab() {
  const { selectedGuildId } = useGuildStore();
  const [leaderboard, setLeaderboard] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);

  const { members: rawMembers } = useGuildResources({
    types: ['members'],
  });

  // ─── Load leaderboard ───
  const loadLeaderboard = () => {
    if (!selectedGuildId) {
      setLeaderboard([]);
      return;
    }

    setLeaderboard(null);
    settingsApi
      .getXpLeaderboard(selectedGuildId)
      .then((rows) => {
        setLeaderboard(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        setLeaderboard([]);
        toast.error(err.message || 'فشل تحميل قائمة المتصدرين');
      });
  };

  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) {
      setLeaderboard([]);
      return;
    }

    setLeaderboard(null);
    settingsApi
      .getXpLeaderboard(selectedGuildId)
      .then((rows) => {
        if (!mounted) return;
        setLeaderboard(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setLeaderboard([]);
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

  // ─── Enriched list with rank ───
  const enrichedList = useMemo(() => {
    if (!leaderboard) return null;
    return leaderboard.map((row, idx) => {
      const info = memberMap.get(row.user_id);
      return {
        rank: idx + 1,
        userId: row.user_id,
        level: Number(row.level) || 1,
        xp: Number(row.xp) || 0,
        username: info?.username || `User ${row.user_id?.slice(-6) || '?'}`,
        avatarUrl: info?.avatarUrl || null,
      };
    });
  }, [leaderboard, memberMap]);

  const getRankIcon = (rank) => {
    if (rank === 1) return { icon: Crown, color: 'from-amber-400 to-yellow-600' };
    if (rank === 2) return { icon: Medal, color: 'from-slate-400 to-slate-600' };
    if (rank === 3) return { icon: Award, color: 'from-amber-700 to-amber-900' };
    return null;
  };

  const handleReset = async () => {
    if (!resetTarget || !selectedGuildId) return;
    setResetting(true);
    try {
      await settingsApi.resetXpUser(selectedGuildId, resetTarget.userId);
      toast.success(`تم تصفير XP لـ ${resetTarget.username}`);
      setResetTarget(null);
      loadLeaderboard();
    } catch (err) {
      toast.error(err.message || 'فشل التصفير');
    } finally {
      setResetting(false);
    }
  };

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
          description="لما يبدأ الأعضاء يكتبون في السيرفر، راح يكسبون XP وتظهر القائمة هنا"
        />
      </Card>
    );
  }

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold mb-0.5">لوحة الشرف</h3>
            <p className="text-sm text-muted-foreground">
              <span className="num">{enrichedList.length}</span> عضو نشط
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {enrichedList.map((user) => {
            const rankInfo = getRankIcon(user.rank);
            const Icon = rankInfo?.icon;

            return (
              <div
                key={user.userId}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-colors group',
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
                        rankInfo.color,
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

                {/* Level */}
                <div className="text-end">
                  <div className="text-xs text-muted-foreground">المستوى</div>
                  <div className="text-lg font-bold lyn-text-gradient num">
                    {user.level}
                  </div>
                </div>

                {/* XP */}
                <div className="text-end min-w-[80px]">
                  <div className="text-xs text-muted-foreground">XP</div>
                  <div className="text-sm font-bold num">
                    {formatCompact(user.xp)}
                  </div>
                </div>

                {/* Reset button (visible on hover) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetTarget(user)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  title="تصفير XP"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ═══ Reset Confirm Dialog ═══ */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(v) => !v && !resetting && setResetTarget(null)}
      >
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <RotateCcw className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">تصفير XP؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم تصفير XP لـ{' '}
              <span className="font-bold text-foreground">
                {resetTarget?.username}
              </span>{' '}
              نهائياً (المستوى يرجع للصفر) — ما يمكن التراجع
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetTarget(null)}
              className="flex-1"
              disabled={resetting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleReset}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={resetting}
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? 'جاري التصفير...' : 'تصفير'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}