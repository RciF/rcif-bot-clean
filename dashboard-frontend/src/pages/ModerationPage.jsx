import { useState, useEffect } from 'react';
import {
  Gavel,
  AlertTriangle,
  Hammer,
  VolumeX,
  X,
  Trash2,
  RotateCcw,
  Search,
  Clock,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { mock } from '@/lib/mock';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState('warnings');

  return (
    <>
      <SettingsPageHeader
        icon={<Gavel />}
        title="نظام الإشراف"
        description="إدارة التحذيرات، المحظورين، والمكتومين"
        plan="free"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="pills" className="flex-wrap gap-2">
          <TabsTrigger value="warnings" variant="pills">
            <AlertTriangle className="w-4 h-4" />
            <span>التحذيرات</span>
          </TabsTrigger>
          <TabsTrigger value="bans" variant="pills">
            <Hammer className="w-4 h-4" />
            <span>المحظورين</span>
          </TabsTrigger>
          <TabsTrigger value="mutes" variant="pills">
            <VolumeX className="w-4 h-4" />
            <span>المكتومين</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="warnings">
          <WarningsTab />
        </TabsContent>
        <TabsContent value="bans">
          <BansTab />
        </TabsContent>
        <TabsContent value="mutes">
          <MutesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Warnings Tab
// ════════════════════════════════════════════════════════════

function WarningsTab() {
  const [warnings, setWarnings] = useState(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    mock.moderationWarnings().then(setWarnings);
  }, []);

  const handleDelete = () => {
    setWarnings((prev) => prev.filter((w) => w.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success('تم حذف التحذيرات');
  };

  const filtered =
    warnings?.filter((w) =>
      search ? w.username.toLowerCase().includes(search.toLowerCase()) : true,
    ) || [];

  if (!warnings) {
    return (
      <Card className="p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </Card>
    );
  }

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">قائمة المحذرين</h3>
            <p className="text-sm text-muted-foreground">
              <span className="num">{warnings.length}</span> عضو لديه تحذيرات
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="pe-10"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle />}
            title="لا توجد تحذيرات"
            description={search ? 'لا نتائج للبحث' : 'كل الأعضاء ملتزمون 👏'}
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border/80 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {w.username[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-medium text-sm">{w.username}</span>
                    <Badge
                      variant={w.count >= 3 ? 'danger' : w.count >= 2 ? 'warning' : 'default'}
                      size="sm"
                    >
                      {w.count} تحذيرات
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    آخر سبب: <span className="font-medium">{w.lastReason}</span> • منذ{' '}
                    {formatRelativeTime(w.lastWarning)}
                  </div>
                </div>

                <button
                  onClick={() => setConfirmDelete(w)}
                  className="w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">حذف كل التحذيرات؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم حذف كل تحذيرات{' '}
              <span className="font-bold text-foreground">{confirmDelete?.username}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Bans Tab
// ════════════════════════════════════════════════════════════

function BansTab() {
  const [bans, setBans] = useState(null);
  const [confirmUnban, setConfirmUnban] = useState(null);

  useEffect(() => {
    mock.moderationBans().then(setBans);
  }, []);

  const handleUnban = () => {
    setBans((prev) => prev.filter((b) => b.id !== confirmUnban.id));
    setConfirmUnban(null);
    toast.success('تم إلغاء الحظر');
  };

  if (!bans) {
    return (
      <Card className="p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </Card>
    );
  }

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <Hammer className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">المحظورين</h3>
            <p className="text-sm text-muted-foreground">
              <span className="num">{bans.length}</span> عضو محظور
            </p>
          </div>
        </div>

        {bans.length === 0 ? (
          <EmptyState
            icon={<Hammer />}
            title="لا يوجد محظورين"
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {bans.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-xs">
                  {b.username[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-medium text-sm">{b.username}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    السبب: <span className="font-medium">{b.reason}</span> • محظور منذ{' '}
                    {formatRelativeTime(b.bannedAt)}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmUnban(b)}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  إلغاء الحظر
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!confirmUnban} onOpenChange={() => setConfirmUnban(null)}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <RotateCcw className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">إلغاء حظر؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يقدر <span className="font-bold text-foreground">{confirmUnban?.username}</span>{' '}
              يدخل السيرفر مرة ثانية
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUnban(null)} className="flex-1">
              إلغاء
            </Button>
            <Button onClick={handleUnban} className="flex-1">
              <RotateCcw className="w-4 h-4" />
              نعم، إلغاء الحظر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  Mutes Tab
// ════════════════════════════════════════════════════════════

function MutesTab() {
  const [mutes, setMutes] = useState(null);

  useEffect(() => {
    mock.moderationMutes().then(setMutes);
  }, []);

  const handleUnmute = (id) => {
    setMutes((prev) => prev.filter((m) => m.id !== id));
    toast.success('تم فك الكتم');
  };

  if (!mutes) {
    return (
      <Card className="p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <VolumeX className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">المكتومين</h3>
          <p className="text-sm text-muted-foreground">
            <span className="num">{mutes.length}</span> عضو مكتوم حالياً
          </p>
        </div>
      </div>

      {mutes.length === 0 ? (
        <EmptyState icon={<VolumeX />} title="لا يوجد مكتومين" size="sm" />
      ) : (
        <div className="space-y-2">
          {mutes.map((m) => {
            const remaining = new Date(m.expiresAt) - new Date();
            const remainingMin = Math.max(0, Math.floor(remaining / 60000));

            return (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                  {m.username[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-medium text-sm">{m.username}</span>
                    <Badge variant="warning" size="sm">
                      <Clock className="w-3 h-3" />
                      <span className="num">{remainingMin}</span> دقيقة
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    السبب: <span className="font-medium">{m.reason}</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => handleUnmute(m.id)}>
                  <X className="w-3.5 h-3.5" />
                  فك كتم
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
