import { Bot, MessageSquare, Reply, Hash } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Separator } from '@/components/ui/Separator';
import { QuickTooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

/**
 * AIGeneralTab — Tab عام
 * - Master Toggle
 * - سلوك الرد (mentions, replies)
 * - القنوات اللي يرد فيها دائماً (placeholder للـ ChannelPicker)
 */
export function AIGeneralTab({ data, updateField }) {
  return (
    <div className="space-y-4">
      {/* ── Master Toggle Card ── */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                data.enabled
                  ? 'lyn-gradient lyn-glow'
                  : 'bg-muted',
              )}
            >
              <Bot
                className={cn(
                  'w-5 h-5',
                  data.enabled ? 'text-white' : 'text-muted-foreground',
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold mb-1">تفعيل الذكاء الاصطناعي</h3>
              <p className="text-sm text-muted-foreground">
                لما يكون مفعّل، AI راح يرد على رسائل الأعضاء حسب السلوك المحدد
              </p>
            </div>
          </div>
          <Switch
            checked={data.enabled}
            onCheckedChange={(v) => updateField('enabled', v)}
            size="lg"
          />
        </div>
      </Card>

      {/* ── Response Behavior Card ── */}
      <Card className={cn('p-5 transition-opacity', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="mb-4">
          <h3 className="font-bold mb-1">سلوك الرد</h3>
          <p className="text-sm text-muted-foreground">
            متى يرد AI تلقائياً
          </p>
        </div>

        <div className="space-y-1">
          {/* Respond to Mentions */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">الرد عند المنشن</div>
                <div className="text-xs text-muted-foreground">
                  يرد لما أحد يعمل @Lyn في رسالة
                </div>
              </div>
            </div>
            <Switch
              checked={data.respondToMentions}
              onCheckedChange={(v) => updateField('respondToMentions', v)}
            />
          </div>

          <Separator />

          {/* Respond to Replies */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center flex-shrink-0">
                <Reply className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">الرد عند الـ Reply</div>
                <div className="text-xs text-muted-foreground">
                  يرد لما أحد يعمل reply على رسالة من Lyn
                </div>
              </div>
            </div>
            <Switch
              checked={data.respondToReplies}
              onCheckedChange={(v) => updateField('respondToReplies', v)}
            />
          </div>
        </div>
      </Card>

      {/* ── Always Respond Channels Card ── */}
      <Card className={cn('p-5 transition-opacity', !data.enabled && 'opacity-50 pointer-events-none')}>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold">قنوات الرد الدائم</h3>
            <QuickTooltip content="في هذه القنوات، AI يرد على كل رسالة بدون منشن">
              <span className="text-xs text-muted-foreground cursor-help">[?]</span>
            </QuickTooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            القنوات اللي AI يرد فيها على كل رسالة (بدون الحاجة للمنشن)
          </p>
        </div>

        {/* Placeholder للـ ChannelPicker — يوم 4 لاحقاً */}
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
          <Hash className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-1">لا توجد قنوات محددة</p>
          <p className="text-xs text-muted-foreground mb-3">
            ChannelPicker قيد البناء — الأسبوع الجاي
          </p>
          {data.alwaysRespondChannels?.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {data.alwaysRespondChannels.map((ch) => (
                <span
                  key={ch}
                  className="px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-500 text-xs font-medium"
                >
                  # القناة {ch}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
