import { useEffect, useState } from 'react';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { mock } from '@/lib/mock';
import { formatCompact } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function LevelsLeaderboardTab() {
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    mock.xpLeaderboard().then(setLeaderboard);
  }, []);

  const getRankIcon = (rank) => {
    if (rank === 1) return { icon: Crown, color: 'from-amber-400 to-yellow-600', label: 'الأول' };
    if (rank === 2) return { icon: Medal, color: 'from-slate-400 to-slate-600', label: 'الثاني' };
    if (rank === 3) return { icon: Award, color: 'from-amber-700 to-amber-900', label: 'الثالث' };
    return null;
  };

  if (!leaderboard) {
    return (
      <Card className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
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

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold mb-0.5">لوحة الشرف</h3>
          <p className="text-sm text-muted-foreground">أكثر الأعضاء نشاطاً وتقدماً</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {leaderboard.map((user) => {
          const rankInfo = getRankIcon(user.rank);
          const Icon = rankInfo?.icon;

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
                      rankInfo.color,
                    )}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground num">#{user.rank}</span>
                )}
              </div>

              {/* User */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {user.username[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{user.username}</div>
                <div className="text-xs text-muted-foreground num">
                  {formatCompact(user.messages)} رسالة
                </div>
              </div>

              {/* Level */}
              <div className="text-end">
                <div className="text-xs text-muted-foreground">المستوى</div>
                <div className="text-lg font-bold lyn-text-gradient num">{user.level}</div>
              </div>

              {/* XP */}
              <div className="text-end min-w-[80px]">
                <div className="text-xs text-muted-foreground">XP</div>
                <div className="text-sm font-bold num">{formatCompact(user.xp)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
