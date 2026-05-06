import { useEffect, useState } from 'react';
import { Ticket, ExternalLink, Clock, MessageSquare, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════
//  Mapping للقيم الفعلية من البوت
// ════════════════════════════════════════════════════════════

// تطابق TICKET_CATEGORIES في systems/ticketSystem.js
const CATEGORY_LABELS = {
  support:    { label: 'دعم فني', emoji: '🔧', color: 'default' },
  complaint:  { label: 'شكوى',    emoji: '📢', color: 'danger' },
  suggestion: { label: 'اقتراح',  emoji: '💡', color: 'success' },
  apply:      { label: 'طلب',     emoji: '📋', color: 'lyn' },
  other:      { label: 'أخرى',    emoji: '📩', color: 'default' },
};

// تطابق PRIORITY_CONFIG في systems/ticketSystem.js
const PRIORITY_CONFIG = {
  low:    { label: 'عادية',   emoji: '🟢', color: 'success' },
  normal: { label: 'متوسطة',  emoji: '🟡', color: 'warning' },
  high:   { label: 'عالية',   emoji: '🔴', color: 'danger' },
};

const STATUS_CONFIG = {
  open:   { label: 'مفتوحة', color: 'success' },
  locked: { label: 'مقفلة',  color: 'warning' },
  closed: { label: 'مغلقة',  color: 'default' },
};

export function TicketsActiveTab() {
  const { selectedGuildId, selectedGuild } = useGuildStore();
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState(null);

  // ─── Load active tickets ───
  useEffect(() => {
    if (!selectedGuildId) {
      setTickets([]);
      return;
    }

    let mounted = true;
    setTickets(null);
    setError(null);

    settingsApi
      .getActiveTickets(selectedGuildId)
      .then((data) => {
        if (!mounted) return;
        setTickets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err);
        setTickets([]);
        toast.error(err.message || 'فشل تحميل التذاكر');
      });

    return () => { mounted = false; };
  }, [selectedGuildId]);

  // ─── Open in Discord ───
  const openInDiscord = (channelId) => {
    if (!selectedGuildId || !channelId) return;
    const url = `https://discord.com/channels/${selectedGuildId}/${channelId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ─── Loading state ───
  if (tickets === null) {
    return (
      <Card className="p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </Card>
    );
  }

  // ─── Empty state ───
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
          const category = CATEGORY_LABELS[ticket.category] || CATEGORY_LABELS.other;
          const priority = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.low;
          const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

          return (
            <div
              key={ticket.id}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-border/80 transition-colors"
            >
              {/* Avatar/Emoji */}
              <div className="w-10 h-10 rounded-lg lyn-gradient flex items-center justify-center flex-shrink-0 text-xl">
                {category.emoji}
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-sm num">#{ticket.id}</span>
                  <Badge variant={category.color} size="sm">
                    {category.emoji} {category.label}
                  </Badge>
                  <Badge variant={priority.color} size="sm">
                    {priority.emoji} {priority.label}
                  </Badge>
                  {ticket.status !== 'open' && (
                    <Badge variant={status.color} size="sm">
                      {status.label}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {/* User mention */}
                  <span className="flex items-center gap-1 ltr">
                    <span className="text-muted-foreground/70">user:</span>
                    <span className="font-mono">
                      {ticket.user_id?.slice(-8)}
                    </span>
                  </span>

                  {/* Time */}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(ticket.created_at)}
                  </span>

                  {/* Message count */}
                  {typeof ticket.message_count === 'number' && ticket.message_count > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span className="num">{ticket.message_count}</span>
                    </span>
                  )}

                  {/* Claimed status */}
                  {ticket.claimed_by ? (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <UserCheck className="w-3 h-3" />
                      مستلمة
                    </span>
                  ) : (
                    <span className="text-amber-500">⚠️ بانتظار الستاف</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInDiscord(ticket.channel_id)}
                  title="افتح في Discord"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        إدارة التذاكر تتم من داخل Discord — استخدم الأزرار في قناة كل تذكرة
      </p>
    </Card>
  );
}