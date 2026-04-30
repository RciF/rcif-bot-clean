import { useEffect, useState } from 'react';
import { Ticket, ExternalLink, X, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { mock } from '@/lib/mock';
import { formatRelativeTime } from '@/lib/utils';

const CATEGORY_LABELS = {
  general: { label: 'دعم عام', color: 'default' },
  report: { label: 'بلاغ', color: 'danger' },
  suggestion: { label: 'اقتراح', color: 'success' },
};

export function TicketsActiveTab() {
  const [tickets, setTickets] = useState(null);

  useEffect(() => {
    mock.activeTickets().then(setTickets);
  }, []);

  if (!tickets) {
    return (
      <Card className="p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<Ticket />}
          title="لا توجد تذاكر نشطة"
          description="لما يفتح أحد تذكرة، راح تظهر هنا"
        />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
          <Ticket className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold">التذاكر المفتوحة</h3>
          <p className="text-sm text-muted-foreground">
            <span className="num">{tickets.length}</span> تذكرة نشطة حالياً
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {tickets.map((ticket) => {
          const category = CATEGORY_LABELS[ticket.category] || CATEGORY_LABELS.general;
          return (
            <div
              key={ticket.id}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-border/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg lyn-gradient flex items-center justify-center flex-shrink-0">
                <Ticket className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-sm num">#{ticket.id}</span>
                  <span className="text-sm">{ticket.username}</span>
                  <Badge variant={category.color} size="sm">
                    {category.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    منذ {formatRelativeTime(ticket.openedAt)}
                  </span>
                  {ticket.staffAssigned ? (
                    <span className="text-emerald-500">✓ مسؤول مخصص</span>
                  ) : (
                    <span className="text-amber-500">⚠️ بانتظار الستاف</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" disabled>
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        فتح/إغلاق التذاكر قيد البناء
      </p>
    </Card>
  );
}
