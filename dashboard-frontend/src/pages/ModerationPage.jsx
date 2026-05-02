import { useState, useEffect } from 'react';
import {
  Gavel, AlertTriangle, Hammer, VolumeX, X, Trash2, RotateCcw, Search, Clock,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useGuildStore } from '@/store/guildStore';
import { settingsApi } from '@/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState('warnings');
  return (
    <>
      <SettingsPageHeader icon={<Gavel />} title="نظام الإشراف" description="إدارة التحذيرات، المحظورين، والمكتومين" plan="free" />
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="warnings" variant="pills"><AlertTriangle className="w-4 h-4" /><span>التحذيرات</span></TabsTrigger>
          <TabsTrigger value="bans"     variant="pills"><Hammer className="w-4 h-4" /><span>المحظورين</span></TabsTrigger>
          <TabsTrigger value="mutes"    variant="pills"><VolumeX className="w-4 h-4" /><span>المكتومين</span></TabsTrigger>
        </TabsList>
        <TabsContent value="warnings"><WarningsTab /></TabsContent>
        <TabsContent value="bans"><BansTab /></TabsContent>
        <TabsContent value="mutes"><MutesTab /></TabsContent>
      </Tabs>
    </>
  );
}

// ─── Warnings ─────────────────────────────────────────────
function WarningsTab() {
  const { selectedGuildId } = useGuildStore();
  const [warnings, setWarnings] = useState(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!selectedGuildId) return;
    settingsApi.getWarnings(selectedGuildId)
      .then(setWarnings)
      .catch(() => setWarnings([]));
  }, [selectedGuildId]);

  const handleDelete = async () => {
    try {
      await settingsApi.deleteWarnings(selectedGuildId, confirmDelete.user_id);
      setWarnings((prev) => prev.filter((w) => w.user_id !== confirmDelete.user_id));
      toast.success('تم حذف التحذيرات');
    } catch {
      toast.error('فشل حذف التحذيرات');
    } finally {
      setConfirmDelete(null);
    }
  };

  const filtered = warnings?.filter((w) =>
    search ? (w.username || w.user_id || '').toLowerCase().includes(search.toLowerCase()) : true,
  );

  if (!warnings) return <Card className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</Card>;

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="ابحث باسم العضو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>
        </div>

        {filtered?.length === 0 ? (
          <EmptyState icon={<AlertTriangle />} title="لا يوجد تحذيرات" description="السيرفر نظيف 🎉" />
        ) : (
          <div className="space-y-2">
            {filtered?.map((w) => (
              <div key={w.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {(w.username || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{w.username || w.user_id}</div>
                  <div className="text-xs text-muted-foreground">{formatRelativeTime(w.created_at)}</div>
                </div>
                <Badge variant="destructive" className="num">{w.count || 1} تحذير</Badge>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(w)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف التحذيرات؟</DialogTitle>
            <DialogDescription>سيتم حذف كل تحذيرات <span className="font-bold text-foreground">{confirmDelete?.username}</span></DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Bans ─────────────────────────────────────────────────
function BansTab() {
  const { selectedGuildId } = useGuildStore();
  const [bans, setBans] = useState(null);
  const [confirmUnban, setConfirmUnban] = useState(null);

  useEffect(() => {
    if (!selectedGuildId) return;
    settingsApi.getBans(selectedGuildId)
      .then(setBans)
      .catch(() => setBans([]));
  }, [selectedGuildId]);

  const handleUnban = async () => {
    try {
      await settingsApi.unban(selectedGuildId, confirmUnban.user_id);
      setBans((prev) => prev.filter((b) => b.user_id !== confirmUnban.user_id));
      toast.success('تم إلغاء الحظر');
    } catch {
      toast.error('فشل إلغاء الحظر');
    } finally {
      setConfirmUnban(null);
    }
  };

  if (!bans) return <Card className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</Card>;

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">المحظورون</h3>
            <p className="text-sm text-muted-foreground"><span className="num">{bans.length}</span> عضو محظور</p>
          </div>
        </div>

        {bans.length === 0 ? (
          <EmptyState icon={<Hammer />} title="لا يوجد محظورون" description="لم يتم حظر أي عضو" />
        ) : (
          <div className="space-y-2">
            {bans.map((b) => (
              <div key={b.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {(b.username || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{b.username || b.user_id}</div>
                  <div className="text-xs text-muted-foreground">{b.reason || 'بدون سبب'}</div>
                </div>
                <div className="text-xs text-muted-foreground">{formatRelativeTime(b.banned_at)}</div>
                <Button size="sm" variant="outline" onClick={() => setConfirmUnban(b)} className="gap-1">
                  <RotateCcw className="w-3 h-3" />
                  إلغاء
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!confirmUnban} onOpenChange={() => setConfirmUnban(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء حظر؟</DialogTitle>
            <DialogDescription>سيتمكن <span className="font-bold text-foreground">{confirmUnban?.username}</span> من الدخول مرة أخرى</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnban(null)}>إلغاء</Button>
            <Button onClick={handleUnban}><RotateCcw className="w-4 h-4" />نعم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Mutes ─────────────────────────────────────────────────
function MutesTab() {
  const { selectedGuildId } = useGuildStore();
  const [mutes, setMutes] = useState(null);

  useEffect(() => {
    if (!selectedGuildId) return;
    settingsApi.getMutes(selectedGuildId)
      .then(setMutes)
      .catch(() => setMutes([]));
  }, [selectedGuildId]);

  if (!mutes) return <Card className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</Card>;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <VolumeX className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold">المكتومون</h3>
          <p className="text-sm text-muted-foreground"><span className="num">{mutes.length}</span> عضو مكتوم حالياً</p>
        </div>
      </div>

      {mutes.length === 0 ? (
        <EmptyState icon={<VolumeX />} title="لا يوجد مكتومون" description="لم يتم كتم أي عضو" />
      ) : (
        <div className="space-y-2">
          {mutes.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {(m.username || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.username || m.user_id}</div>
                <div className="text-xs text-muted-foreground">{m.reason || 'بدون سبب'}</div>
              </div>
              {m.expires_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(m.expires_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
