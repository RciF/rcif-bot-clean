import { useState, useEffect } from 'react';
import {
  ToggleRight,
  Plus,
  Edit3,
  Trash2,
  Hash,
  Users,
  Eye,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
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
import { PlanLockBanner, PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { EmbedPreview } from '@/components/shared/EmbedPreview';
import { usePlanGate } from '@/hooks/usePlanGate';
import { mock } from '@/lib/mock';
import { PLAN_TIERS } from '@/lib/plans';
import { formatRelativeTime, intToHexColor } from '@/lib/utils';
import { toast } from 'sonner';

const STYLE_COLORS = {
  primary: '#5865F2',
  secondary: '#4F545C',
  success: '#2D7D46',
  danger: '#D83C3E',
};

export default function ReactionRolesPage() {
  const [panels, setPanels] = useState(null);
  const [previewPanel, setPreviewPanel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const planGate = usePlanGate('reactionRoles', PLAN_TIERS.SILVER);

  useEffect(() => {
    mock.rolePanels().then(setPanels);
  }, []);

  const handleDelete = () => {
    setPanels((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null);
    toast.success('تم حذف اللوحة');
  };

  return (
    <>
      <SettingsPageHeader
        icon={<ToggleRight />}
        title="لوحات الرتب"
        description="لوحات تفاعلية للأعضاء لاختيار رتبهم"
        plan="silver"
        actions={
          <Button onClick={planGate.gateAction(() => toast.info('قريباً: محرر اللوحات'))}>
            <Plus className="w-4 h-4" />
            لوحة جديدة
          </Button>
        }
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="لوحات الرتب"
          className="mb-6"
        />
      )}

      {!panels ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : panels.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<ToggleRight />}
            title="لا توجد لوحات بعد"
            description="ابدأ بإنشاء لوحة رتب جديدة عشان الأعضاء يقدرون يختارون رتبهم"
            action={
              <Button onClick={planGate.gateAction(() => toast.info('قريباً: محرر اللوحات'))}>
                <Plus className="w-4 h-4" />
                إنشاء أول لوحة
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {panels.map((panel) => (
            <Card key={panel.id} className="p-5 hover:border-border/80 transition-colors">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: intToHexColor(panel.color) + '20', color: intToHexColor(panel.color) }}
                >
                  <ToggleRight className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold">{panel.title}</h3>
                    <Badge variant="default" size="sm">
                      <Users className="w-3 h-3" />
                      <span className="num">{panel.buttons.length}</span> رتب
                    </Badge>
                    {panel.exclusive && (
                      <Badge variant="warning" size="sm">
                        حصري
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                    {panel.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {panel.channelName}
                    </span>
                    <span>•</span>
                    <span>منذ {formatRelativeTime(panel.createdAt)}</span>
                  </div>

                  {/* Buttons preview */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {panel.buttons.slice(0, 5).map((btn, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white"
                        style={{ background: STYLE_COLORS[btn.style] }}
                      >
                        <span>{btn.emoji}</span>
                        <span>{btn.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewPanel(panel)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={planGate.gateAction(() => toast.info('قريباً'))}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(panel)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PlanLockModal {...planGate.lockModalProps} />

      {/* Preview Modal */}
      <Dialog open={!!previewPanel} onOpenChange={() => setPreviewPanel(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>معاينة اللوحة</DialogTitle>
            <DialogDescription>هذا شكل اللوحة في ديسكورد</DialogDescription>
          </DialogHeader>

          {previewPanel && (
            <div>
              <EmbedPreview
                embed={{
                  title: previewPanel.title,
                  description: previewPanel.description,
                  color: previewPanel.color,
                }}
                username="Lyn"
                avatarLetter="L"
              />

              {/* Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-3 ms-13">
                {previewPanel.buttons.map((btn, i) => (
                  <button
                    key={i}
                    className="px-3 py-1.5 rounded text-sm font-medium text-white"
                    style={{ background: STYLE_COLORS[btn.style] }}
                  >
                    <span className="me-1">{btn.emoji}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <div className="flex justify-center -mt-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="w-8 h-8" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">حذف اللوحة؟</DialogTitle>
            <DialogDescription className="text-center">
              راح يتم حذف لوحة{' '}
              <span className="font-bold text-foreground">{confirmDelete?.title}</span>{' '}
              نهائياً. هذا الإجراء ما يمكن التراجع عنه.
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
              حذف نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
