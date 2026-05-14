/**
 * ═══════════════════════════════════════════════════════════
 *  CommandsHeader — Header + إحصائيات + زر إعادة الكل
 *
 *  يعرض:
 *  - SettingsPageHeader مع زر "إعادة الكل" (لو فيه أوامر معدّلة)
 *  - 4 كروت إحصائية
 * ═══════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Terminal, CheckCircle2, Tag, TrendingUp, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { formatNumber, cn } from '@/lib/utils';

export function CommandsHeader({ commands, totalCommandsUsed, onResetAll }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ─── الإحصائيات ───
  const total = commands.length;
  const enabled = commands.filter((c) => c.enabled !== false).length;
  const renamed = commands.filter((c) => !!c.custom_name).length;
  const disabled = total - enabled;
  const withAliases = commands.filter((c) => (c.aliases?.length || 0) > 0).length;

  // فيه شي معدّل (renamed أو disabled)؟ نعرض زر الإعادة
  const hasCustomizations = renamed > 0 || disabled > 0;

  const stats = [
    {
      label: 'إجمالي الأوامر',
      value: total,
      icon: Terminal,
      bg: 'bg-violet-500/10 border-violet-500/30',
      color: 'text-violet-500',
    },
    {
      label: 'الأوامر المفعّلة',
      value: enabled,
      icon: CheckCircle2,
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      color: 'text-emerald-500',
    },
    {
      label: 'أوامر مع اختصارات',
      value: withAliases,
      icon: Tag,
      bg: 'bg-pink-500/10 border-pink-500/30',
      color: 'text-pink-500',
    },
    {
      label: 'إجمالي الاستخدام',
      value: totalCommandsUsed,
      icon: TrendingUp,
      bg: 'bg-amber-500/10 border-amber-500/30',
      color: 'text-amber-500',
    },
  ];

  // ─── Handle reset ───
  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await onResetAll();
      setConfirmReset(false);
    } catch {
      // toast handled in hook
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        icon={<Terminal />}
        title="إدارة الأوامر"
        description="تحكم بأوامر البوت — فعّل/عطّل، أضف اختصارات، غيّر الأسماء"
        plan="free"
        actions={
          hasCustomizations ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة الكل</span>
            </Button>
          ) : null
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1 truncate">
                  {stat.label}
                </div>
                <div className="text-xl font-bold num">
                  {formatNumber(stat.value)}
                </div>
              </div>
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0',
                  stat.bg,
                )}
              >
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reset confirmation dialog */}
      <Dialog
        open={confirmReset}
        onOpenChange={(v) => !v && !resetting && setConfirmReset(false)}
      >
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <RotateCcw className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">إعادة كل الأوامر؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم استعادة كل الأسماء الأصلية وتفعيل كل الأوامر
              <br />
              <strong>هذا الإجراء لا يمكن التراجع عنه</strong>
              <br />
              <span className="text-xs">
                ملاحظة: الاختصارات (Aliases) لن تُحذف
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmReset(false)}
              className="flex-1"
              disabled={resetting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmReset}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={resetting}
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? 'جاري الإعادة...' : 'إعادة الكل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}