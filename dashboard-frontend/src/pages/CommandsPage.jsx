/**
 * ═══════════════════════════════════════════════════════════
 *  CommandsPage — الصفحة الرئيسية (Batch 8 Final)
 *
 *  Layout:
 *  ┌──────────────────────────────────────────┐
 *  │ Header + Stats + Reset Button            │
 *  ├──────────┬─────────────┬─────────────────┤
 *  │ Sidebar  │ Commands    │ Leaderboard     │
 *  │ (filters)│ List        │ (top 10)        │
 *  └──────────┴─────────────┴─────────────────┘
 *
 *  المميزات:
 *  - تفعيل/تعطيل
 *  - تعديل الاسم (plan gate)
 *  - إعادة الكل
 *  - aliases (إضافة/حذف)
 *  - بحث + tier filter + quick filters
 *  - leaderboard
 *  - ✅ NEW: Advanced Editor (restrictions + defaults)
 * ═══════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PlanLockModal } from '@/components/shared/PlanLockOverlay';
import { useGuildStore } from '@/store/guildStore';
import { useCommandsData } from '@/hooks/useCommandsData';
import { usePlanGate } from '@/hooks/usePlanGate';
import { PLAN_TIERS } from '@/lib/plans';
import { CommandsHeader } from '@/components/commands/CommandsHeader';
import { CommandsSidebar } from '@/components/commands/CommandsSidebar';
import { CommandsList } from '@/components/commands/CommandsList';
import { CommandsLeaderboard } from '@/components/commands/CommandsLeaderboard';
import { RenameCommandDialog } from '@/components/commands/RenameCommandDialog';
import { AdvancedEditor } from '@/components/commands/AdvancedEditor';

export default function CommandsPage() {
  const { selectedGuildId } = useGuildStore();

  const {
    commands,
    categories,
    guildPlan,
    leaderboard,
    totalCommandsUsed,
    isLoading,
    toggleEnabled,
    renameCommand,
    resetAll,
    addAlias,
    removeAlias,
    saveAdvanced,
  } = useCommandsData(selectedGuildId);

  // ─── Plan gate for renaming + advanced edit ───
  const renamePlanGate = usePlanGate('commands.rename', PLAN_TIERS.SILVER);
  const advancedPlanGate = usePlanGate('commands.advanced', PLAN_TIERS.GOLD);
  const canRename = !renamePlanGate.isLocked;
  const canAdvancedEdit = !advancedPlanGate.isLocked;

  // ─── UI state ───
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null);
  const [tierFilter, setTierFilter] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [advancedTarget, setAdvancedTarget] = useState(null);

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl hidden lg:block" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <CommandsHeader
          commands={commands}
          totalCommandsUsed={totalCommandsUsed}
          onResetAll={resetAll}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4 items-start">
          <div className="order-2 lg:order-1">
            <CommandsSidebar
              categories={categories}
              commands={commands}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              quickFilter={quickFilter}
              setQuickFilter={setQuickFilter}
              tierFilter={tierFilter}
              setTierFilter={setTierFilter}
            />
          </div>

          <div className="order-1 lg:order-2 min-w-0">
            <CommandsList
              commands={commands}
              categories={categories}
              guildPlan={guildPlan}
              canRename={canRename}
              searchQuery={searchQuery}
              activeCategory={activeCategory}
              quickFilter={quickFilter}
              tierFilter={tierFilter}
              onToggle={toggleEnabled}
              onRename={(cmd) => {
                if (!canRename) {
                  renamePlanGate.gateAction(() => {})();
                  return;
                }
                setRenameTarget(cmd);
              }}
              onAddAlias={addAlias}
              onRemoveAlias={removeAlias}
              onAdvancedEdit={(cmd) => {
                if (!canAdvancedEdit) {
                  advancedPlanGate.gateAction(() => {})();
                  return;
                }
                setAdvancedTarget(cmd);
              }}
            />
          </div>

          <div className="order-3 lg:order-3">
            <CommandsLeaderboard leaderboard={leaderboard} />
          </div>
        </div>
      </div>

      {/* Rename Dialog */}
      <RenameCommandDialog
        command={renameTarget}
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={renameCommand}
      />

      {/* Advanced Editor */}
      <AdvancedEditor
        command={advancedTarget}
        isOpen={!!advancedTarget}
        onClose={() => setAdvancedTarget(null)}
        onSave={(values) => saveAdvanced(advancedTarget.name, values)}
      />

      {/* Plan lock modals */}
      <PlanLockModal
        {...renamePlanGate.lockModalProps}
        featureName="تغيير أسماء الأوامر"
      />
      <PlanLockModal
        {...advancedPlanGate.lockModalProps}
        featureName="الإعدادات المتقدمة للأوامر"
      />
    </>
  );
}