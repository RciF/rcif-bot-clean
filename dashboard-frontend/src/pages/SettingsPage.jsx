import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Copy,
  Check,
  Unlink,
  Trash2,
  ShieldAlert,
  Server,
  Calendar,
  Crown,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanBadge } from '@/components/shared/PlanBadge';
import { PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildStore } from '@/store/guildStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { guildApi, settingsApi, subscriptionApi } from '@/api';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { selectedGuildId, selectedGuild } = useGuildStore();
  const queryClient = useQueryClient();

  const [copiedField, setCopiedField] = useState(null);
  const [unlinkDialog, setUnlinkDialog] = useState(false);
  const [wipeDialog, setWipeDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);

  const wipeGate = usePlanGate('settings.wipe', PLAN_TIERS.DIAMOND);

  // ─── Queries ───
  const { data: guildInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['guild-info', selectedGuildId],
    queryFn: () => guildApi.info(selectedGuildId),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: planData } = useQuery({
    queryKey: ['guild-plan', selectedGuildId],
    queryFn: () => guildApi.plan(selectedGuildId),
    enabled: !!selectedGuildId,
    staleTime: 1000 * 60 * 5,
  });

  const guild = guildInfo || selectedGuild || {};
  const guildName = guild?.name || '';
  const planId = planData?.plan_id || 'free';
  const isLinked = planId !== 'free';

  // ─── Helpers ───
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('تم النسخ');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  // ─── Actions ───
  const handleUnlink = async () => {
    if (!selectedGuildId) return;
    setWorking(true);
    try {
      await subscriptionApi.unlinkGuild(selectedGuildId);
      toast.success('تم فك ربط الاشتراك');
      setUnlinkDialog(false);
      queryClient.invalidateQueries({ queryKey: ['guild-plan', selectedGuildId] });
      queryClient.invalidateQueries({ queryKey: ['guild-info', selectedGuildId] });
    } catch (err) {
      toast.error(err?.message || 'فشل فك الربط');
    } finally {
      setWorking(false);
    }
  };

  const openWipeDialog = () => {
    if (wipeGate.isLocked) {
      wipeGate.openLockModal();
      return;
    }
    setConfirmText('');
    setWipeDialog(true);
  };

  const handleWipe = async () => {
    if (!selectedGuildId) return;
    if (confirmText.trim() !== guildName) {
      toast.error('اسم السيرفر غير مطابق');
      return;
    }

    setWorking(true);
    try {
      await settingsApi.wipeGuildData(selectedGuildId, confirmText.trim());
      toast.success('تم مسح كل بيانات السيرفر');
      setWipeDialog(false);
      setConfirmText('');
      // إبطال كل الـ queries المرتبطة بالسيرفر
      queryClient.invalidateQueries();
    } catch (err) {
      const code = err?.code;
      if (code === 'PLAN_REQUIRED') {
        toast.error('تحتاج خطة الماسي لمسح البيانات');
      } else if (code === 'CONFIRMATION_MISMATCH') {
        toast.error('اسم السيرفر غير مطابق');
      } else {
        toast.error(err?.message || 'فشل مسح البيانات');
      }
    } finally {
      setWorking(false);
    }
  };

  // ─── Loading state ───
  if (loadingInfo) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  // ─── Render ───
  return (
    <>
      <SettingsPageHeader
        icon={<SettingsIcon />}
        title="الإعدادات"
        description="معلومات السيرفر والإجراءات الخطرة"
      />

      {/* ── معلومات السيرفر التقنية ── */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">معلومات السيرفر</h2>
        </div>

        {/* Server ID */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">معرّف السيرفر (ID)</div>
            <div className="font-mono text-sm truncate" dir="ltr">
              {guild?.id || selectedGuildId || '—'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(guild?.id || selectedGuildId, 'id')}
          >
            {copiedField === 'id' ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Owner ID */}
        {guild?.ownerId && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">معرّف المالك</div>
              <div className="font-mono text-sm truncate" dir="ltr">
                {guild.ownerId}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(guild.ownerId, 'owner')}
            >
              {copiedField === 'owner' ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {guild?.memberCount !== undefined && (
            <div className="p-3 rounded-xl bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">الأعضاء</div>
              <div className="text-lg font-bold num">
                {guild.memberCount?.toLocaleString() || 0}
              </div>
            </div>
          )}
          {guild?.premiumSubscriptionCount !== undefined && (
            <div className="p-3 rounded-xl bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">عدد التعزيزات</div>
              <div className="text-lg font-bold num">
                {guild.premiumSubscriptionCount || 0}
              </div>
            </div>
          )}
          {guild?.premiumTier !== undefined && (
            <div className="p-3 rounded-xl bg-muted/30">
              <div className="text-xs text-muted-foreground mb-1">مستوى التعزيز</div>
              <div className="text-lg font-bold num">المستوى {guild.premiumTier}</div>
            </div>
          )}
        </div>

        {/* الخطة */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">الخطة الحالية</span>
          </div>
          <PlanBadge plan={planId} size="sm" />
        </div>
      </Card>

      {/* ── منطقة الخطر ── */}
      <Card className="p-6 border-2 border-destructive/40 bg-destructive/5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-bold text-destructive">منطقة الخطر</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          الإجراءات هنا لا يمكن التراجع عنها — تأكد قبل التنفيذ.
        </p>

        {/* فك ربط الاشتراك */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="flex-1 min-w-0">
            <div className="font-medium mb-1">فك ربط الاشتراك من السيرفر</div>
            <div className="text-sm text-muted-foreground">
              {isLinked
                ? 'يرجع السيرفر للخطة المجانية، الاشتراك يبقى لحسابك'
                : 'لا يوجد اشتراك مربوط بهذا السيرفر'}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setUnlinkDialog(true)}
            disabled={!isLinked}
          >
            <Unlink className="w-4 h-4" />
            فك الربط
          </Button>
        </div>

        {/* مسح كل البيانات */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">مسح كل بيانات السيرفر</span>
              <PlanBadge plan="diamond" size="xs" />
            </div>
            <div className="text-sm text-muted-foreground">
              يحذف كل الإعدادات + XP + الاقتصاد + التذاكر + التحذيرات + اللوقات + الأحداث
            </div>
          </div>
          <Button variant="destructive" onClick={openWipeDialog}>
            <Trash2 className="w-4 h-4" />
            مسح البيانات
          </Button>
        </div>
      </Card>

      {/* ── Dialog: فك الربط ── */}
      <Dialog open={unlinkDialog} onOpenChange={setUnlinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد فك الربط</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من فك ربط الاشتراك من <strong>{guildName}</strong>؟
              <br />
              السيرفر راح يرجع للخطة المجانية، واشتراكك يبقى لحسابك ويمكن تربطه بسيرفر آخر.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setUnlinkDialog(false)}
              disabled={working}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={working}
              className="flex-1"
            >
              {working ? 'جاري...' : 'فك الربط'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: مسح البيانات ── */}
      <Dialog open={wipeDialog} onOpenChange={setWipeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ مسح كل بيانات السيرفر</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                هذا الإجراء <strong className="text-destructive">لا يمكن التراجع عنه</strong>.
              </span>
              <span className="block">
                سيتم حذف: الإعدادات، نظام XP، الاقتصاد، التذاكر، التحذيرات، اللوقات، الفعاليات،
                المهام المجدولة، قوالب الإيمبيد، لوحات الرتب، والإحصائيات.
              </span>
              <span className="block text-xs">
                * لن يتم حذف اشتراكك، عملاتك العالمية في الاقتصاد، أو حسابك.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              للتأكيد، اكتب اسم السيرفر:
              <span className="font-mono text-primary mx-1">{guildName}</span>
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={guildName}
              className={cn(
                confirmText && confirmText.trim() !== guildName && 'border-destructive',
              )}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setWipeDialog(false)}
              disabled={working}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleWipe}
              disabled={working || confirmText.trim() !== guildName}
              className="flex-1"
            >
              {working ? 'جاري المسح...' : 'مسح نهائياً'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLockModal {...wipeGate.lockModalProps} featureName="مسح بيانات السيرفر" />
    </>
  );
}