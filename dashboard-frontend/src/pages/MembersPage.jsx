import { useState, useEffect, useMemo } from 'react';
import { Users, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { guildApi } from '@/api';
import { PLAN_TIERS } from '@/lib/plans';
import { intToHexColor, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function MembersPage() {
  const { selectedGuildId } = useGuildStore();
  const [members, setMembers] = useState(null);
  const [search, setSearch] = useState('');

  const planGate = usePlanGate('membersHub', PLAN_TIERS.SILVER);

  useEffect(() => {
    if (!selectedGuildId) return;
    guildApi.members(selectedGuildId, { limit: 100 })
      .then((res) => setMembers(Array.isArray(res) ? res : res.members || []))
      .catch(() => { setMembers([]); toast.error('فشل تحميل الأعضاء'); });
  }, [selectedGuildId]);

  const filtered = useMemo(() => {
    if (!members) return [];
    if (!search) return members;
    return members.filter((m) =>
      (m.username || m.nick || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [members, search]);

  return (
    <>
      <SettingsPageHeader icon={<Users />} title="الأعضاء" description="عرض وإدارة أعضاء السيرفر" plan="silver" />

      {planGate.isLocked && (
        <PlanLockBanner currentPlan={planGate.currentPlan} requiredPlan={planGate.requiredPlan} featureName="قسم الأعضاء" className="mb-6" />
      )}

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ابحث باسم العضو..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      {!members ? (
        <Card className="p-5 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users />} title="لا يوجد أعضاء" description="لم يتم العثور على نتائج" />
      ) : (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground mb-4">
            <span className="num font-semibold">{filtered.length}</span> عضو
          </p>
          <div className="space-y-1">
            {filtered.map((m) => {
              const avatarUrl = m.avatar
                ? `https://cdn.discordapp.com/avatars/${m.user?.id || m.id}/${m.avatar}.png?size=64`
                : null;
              const name = m.nick || m.user?.username || m.username || m.user?.id || m.id;
              const initial = name.slice(0, 1).toUpperCase();

              return (
                <div key={m.user?.id || m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-9 h-9 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full lyn-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{m.user?.id || m.id}</div>
                  </div>
                  {m.roles?.length > 0 && (
                    <div className="text-xs text-muted-foreground num">{m.roles.length} رتبة</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
