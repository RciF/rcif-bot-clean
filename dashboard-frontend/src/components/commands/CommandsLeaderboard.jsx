/**
 * ═══════════════════════════════════════════════════════════
 *  CommandsLeaderboard — Top N أوامر الأكثر استخداماً
 *
 *  يعرض:
 *  - 10 أوامر الأكثر استخداماً
 *  - rank + usage count + last used
 *  - empty state لو ما فيه استخدام بعد
 * ═══════════════════════════════════════════════════════════
 */

import { Trophy, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatNumber, formatRelativeTime, cn } from '@/lib/utils';

// ─── ألوان الترتيب ───
const RANK_STYLES = {
  1: 'bg-amber-500/20 text-amber-500 border-amber-500/40',
  2: 'bg-slate-400/20 text-slate-300 border-slate-400/40',
  3: 'bg-orange-600/20 text-orange-500 border-orange-600/40',
};

export function CommandsLeaderboard({ leaderboard = [] }) {
  return (
    <Card className="p-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="font-bold text-sm">الأكثر استخداماً</h2>
          <p className="text-xs text-muted-foreground">Top 10 أوامر</p>
        </div>
      </div>

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>ما فيه استخدام بعد</p>
          <p className="text-xs mt-1">سيتم تتبع الأوامر عند استخدامها</p>
        </div>
      )}

      {/* List */}
      {leaderboard.length > 0 && (
        <div className="space-y-2">
          {leaderboard.map((item) => {
            const rankStyle = RANK_STYLES[item.rank];

            return (
              <div
                key={item.command_name}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors group"
              >
                {/* Rank */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border flex-shrink-0',
                    rankStyle || 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  <span className="num">{item.rank}</span>
                </div>

                {/* Command info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code
                      className="text-sm font-bold font-mono num truncate"
                      dir="ltr"
                    >
                      /{item.command_name}
                    </code>
                  </div>
                  {item.last_used_at && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      آخر استخدام {formatRelativeTime(item.last_used_at)}
                    </div>
                  )}
                </div>

                {/* Count */}
                <Badge
                  variant="outline"
                  size="sm"
                  className="num flex-shrink-0 bg-violet-500/10 text-violet-400 border-violet-500/30"
                >
                  {formatNumber(item.usage_count)}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}