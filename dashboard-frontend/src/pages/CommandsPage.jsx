/**
 * ═══════════════════════════════════════════════════════════
 *  CommandsPage — الصفحة الرئيسية (Batch 3 Final)
 *
 *  المعمارية:
 *  ┌──────────────────────────────────────────┐
 *  │ Header + Stats + Reset Button            │
 *  ├──────────┬─────────────┬─────────────────┤
 *  │ Sidebar  │ Commands    │ Leaderboard     │
 *  │ (filters)│ List        │ (top 10)        │
 *  │          │             │                 │
 *  └──────────┴─────────────┴─────────────────┘
 *
 *  المميزات:
 *  - تفعيل/تعطيل (toggle)
 *  - تعديل الاسم (custom_name) مع plan gate
 *  - إعادة كل الأوامر للافتراضي
 *  - aliases (إضافة/حذف)
 *  - بحث متقدم
 *  - فلتر فئة + tier + quick filters
 *  - leaderboard
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

export default function CommandsPage() {
  const { selectedGuildId } = useGuildStore();

  // ─── Data + mutations ───
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
  } = useCommandsData(selectedGuildId);

  // ─── Plan gate for renaming ───
  const renamePlanGate = usePlanGate('commands.rename', PLAN_TIERS.SILVER);
  const canRename = !renamePlanGate.isLocked;

  // ─── UI state ───
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null);
  const [tierFilter, setTierFilter] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);

  // ─── Loading state ───
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
        {/* Header + Stats + Reset */}
        <CommandsHeader
          commands={commands}
          totalCommandsUsed={totalCommandsUsed}
          onResetAll={resetAll}
        />

        {/* Main layout: 3 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4 items-start">
          {/* ─── Sidebar ─── */}
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

          {/* ─── List ─── */}
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
                // Plan gate check
                if (!canRename) {
                  renamePlanGate.gateAction(() => {})();
                  return;
                }
                setRenameTarget(cmd);
              }}
              onAddAlias={addAlias}
              onRemoveAlias={removeAlias}
            />
          </div>

          {/* ─── Leaderboard ─── */}
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

      {/* Plan lock modal (لو حاول يعدل اسم ما يقدر) */}
      <PlanLockModal
        {...renamePlanGate.lockModalProps}
        featureName="تغيير أسماء الأوامر"
      />
    </>
  );
}