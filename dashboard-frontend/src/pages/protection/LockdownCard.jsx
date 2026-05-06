import { useState } from 'react';
import { Lock, Unlock, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { ChannelPicker } from '@/components/shared/ChannelPicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { formatRelativeTime, cn } from '@/lib/utils';

export function LockdownCard({ data, updateField, setData }) {
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  const isLocked = data.is_locked ?? data.isLocked ?? false;
  const lockedAt = data.lockdown_started_at ?? data.lockdownStartedAt ?? null;
  const logChannelId = data.log_channel_id ?? data.logChannelId ?? null;

  const handleLockdown = () => {
    setData((prev) => ({
      ...prev,
      is_locked: true,
      lockdown_started_at: new Date().toISOString(),
    }));
    setShowLockConfirm(false);
  };

  const handleUnlock = () => {
    setData((prev) => ({
      ...prev,
      is_locked: false,
      lockdown_started_at: null,
    }));
    setShowUnlockConfirm(false);
  };

  return (
    <>
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold mb-1">الإغلاق اليدوي وقناة اللوق</h3>
            <p className="text-sm text-muted-foreground">
              أوقف الانضمام للسيرفر فوراً، واختر قناة لتلقّي تنبيهات الحماية
            </p>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Status */}
        <div className="mb-5">
          <div
            className={cn(
              'rounded-xl p-4 mb-3',
              isLocked
                ? 'bg-destructive/10 border border-destructive/30'
                : 'bg-emerald-500/10 border border-emerald-500/30',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  isLocked
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-emerald-500/20 text-emerald-500',
                )}
              >
                {isLocked ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {isLocked ? 'السيرفر مغلق' : 'السيرفر مفتوح'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isLocked && lockedAt
                    ? `قُفل ${formatRelativeTime(lockedAt)}`
                    : 'الانضمام مسموح'}
                </div>
              </div>
            </div>
          </div>

          {isLocked ? (
            <Button
              variant="outline"
              onClick={() => setShowUnlockConfirm(true)}
              className="w-full gap-2"
            >
              <Unlock className="w-4 h-4" />
              فتح السيرفر
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowLockConfirm(true)}
              className="w-full gap-2 text-destructive hover:bg-destructive/10"
            >
              <Lock className="w-4 h-4" />
              إغلاق السيرفر
            </Button>
          )}
        </div>

        <Separator className="mb-4" />

        {/* Log channel */}
        <div>
          <label className="text-sm font-medium mb-2 block">قناة لوق الحماية</label>
          <ChannelPicker
            value={logChannelId}
            onChange={(v) => updateField('log_channel_id', v)}
            types={[0, 5]}
            placeholder="اختر قناة لتنبيهات الحماية..."
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            البوت يرسل هنا أي اكتشاف Spam/Raid/Nuke
          </p>
        </div>
      </Card>

      {/* Lock confirm */}
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
              راح يتم منع الانضمام لكل الأعضاء الجدد. الأعضاء الحاليين ما يتأثرون.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLockConfirm(false)} className="flex-1">
              إلغاء
            </Button>
            <Button
              onClick={handleLockdown}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <Lock className="w-4 h-4" />
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock confirm */}
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
              راح يُسمح للأعضاء الجدد بالانضمام مرة ثانية.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlockConfirm(false)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleUnlock} className="flex-1">
              <Unlock className="w-4 h-4" />
              فتح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}