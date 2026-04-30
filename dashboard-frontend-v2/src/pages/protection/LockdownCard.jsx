import { useState } from 'react';
import { Lock, Unlock, AlertCircle, Hash, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

/**
 * LockdownCard — Lockdown يدوي + قناة لوق + Whitelist (placeholder)
 */
export function LockdownCard({ data, updateField, setData }) {
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  const handleLockdown = () => {
    setData((prev) => ({
      ...prev,
      isLocked: true,
      lockdownStartedAt: new Date().toISOString(),
    }));
    setShowLockConfirm(false);
  };

  const handleUnlock = () => {
    setData((prev) => ({
      ...prev,
      isLocked: false,
      lockdownStartedAt: null,
    }));
    setShowUnlockConfirm(false);
  };

  return (
    <>
      <Card className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold mb-1">الإغلاق اليدوي و Whitelist</h3>
            <p className="text-sm text-muted-foreground">
              أوقف الانضمام للسيرفر فوراً + استثناء رتب وأعضاء من نظام الحماية
            </p>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* ── Lockdown Status & Button ── */}
        <div className="mb-5">
          <div
            className={cn(
              'rounded-xl p-4 mb-3',
              data.isLocked
                ? 'bg-destructive/10 border border-destructive/30'
                : 'bg-emerald-500/10 border border-emerald-500/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  data.isLocked
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-emerald-500/20 text-emerald-500',
                )}
              >
                {data.isLocked ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {data.isLocked ? 'السيرفر مغلق' : 'السيرفر مفتوح'}
                </div>
                {data.isLocked && data.lockdownStartedAt && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    منذ {formatRelativeTime(data.lockdownStartedAt)}
                  </div>
                )}
                {!data.isLocked && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    الأعضاء يقدرون ينضمون عادي
                  </div>
                )}
              </div>
            </div>
          </div>

          {data.isLocked ? (
            <Button
              variant="outline"
              className="w-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              onClick={() => setShowUnlockConfirm(true)}
            >
              <Unlock className="w-4 h-4" />
              فتح السيرفر
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setShowLockConfirm(true)}
            >
              <Lock className="w-4 h-4" />
              إغلاق السيرفر فوراً
            </Button>
          )}
        </div>

        <Separator className="mb-4" />

        {/* ── Log Channel ── */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-2 block">قناة سجل الحماية</label>
          <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
            <Hash className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">
              ChannelPicker قيد البناء — الأسبوع الجاي
            </p>
            {data.logChannel && (
              <span className="inline-block px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-500 text-xs font-medium">
                # القناة المختارة: {data.logChannel}
              </span>
            )}
          </div>
        </div>

        {/* ── Whitelist (placeholder) ── */}
        <div>
          <label className="text-sm font-medium mb-2 block">القائمة البيضاء</label>
          <p className="text-xs text-muted-foreground mb-3">
            رتب وأعضاء محصنين من نظام الحماية
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-dashed border-border rounded-xl p-3 text-center">
              <p className="text-xs font-medium mb-1">الرتب المحصنة</p>
              <p className="text-xs text-muted-foreground num">
                {data.whitelist?.roles?.length || 0} رتبة
              </p>
            </div>
            <div className="border-2 border-dashed border-border rounded-xl p-3 text-center">
              <p className="text-xs font-medium mb-1">الأعضاء المحصنون</p>
              <p className="text-xs text-muted-foreground num">
                {data.whitelist?.members?.length || 0} عضو
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            RolePicker و MemberPicker قيد البناء
          </p>
        </div>
      </Card>

      {/* ── Lockdown Confirm ── */}
      <Dialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">إغلاق السيرفر؟</DialogTitle>
            <DialogDescription className="text-center">
              هذا راح يمنع أي شخص جديد من الانضمام حتى تفك الإغلاق يدوياً
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockConfirm(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="default"
              onClick={handleLockdown}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <Lock className="w-4 h-4" />
              نعم، أغلق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Unlock Confirm ── */}
      <Dialog open={showUnlockConfirm} onOpenChange={setShowUnlockConfirm}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Unlock className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">فتح السيرفر؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يقدر الأعضاء الجدد ينضمون مرة ثانية
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlockConfirm(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button onClick={handleUnlock} className="flex-1">
              <Unlock className="w-4 h-4" />
              نعم، افتح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
