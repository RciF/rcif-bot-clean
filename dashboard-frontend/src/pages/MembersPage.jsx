import { useState, useEffect, useMemo } from 'react';
import { Users, Search, Filter, Bot, ArrowUpDown, Calendar, Crown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { SettingsPageHeader } from '@/components/shared/SettingsPageHeader';
import { PlanLockBanner } from '@/components/shared/PlanLockOverlay';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlanGate } from '@/hooks/usePlanGate';
import { useGuildStore } from '@/store/guildStore';
import { useGuildResources } from '@/hooks/useGuildResources';
import { guildApi } from '@/api';
import { PLAN_TIERS } from '@/lib/plans';
import { intToHexColor, cn } from '@/lib/utils';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────
//  Normalizers
// ────────────────────────────────────────────────────────────────────

function normalizeMember(m) {
  const user = m.user || m;
  const id = user.id || m.id;
  const username =
    m.nick ||
    user.global_name ||
    user.username ||
    `User ${(id || '').slice(-6)}`;

  let avatarUrl = null;
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=64`;
  } else if (id) {
    const idx = (BigInt(id) >> 22n) % 6n;
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }

  const roles = Array.isArray(m.roles) ? m.roles : [];
  const joinedAt = m.joined_at || m.joinedAt || null;
  const isBot = user.bot === true;

  return {
    id,
    raw: m,
    username,
    avatarUrl,
    roles,
    joinedAt,
    isBot,
  };
}

// ────────────────────────────────────────────────────────────────────
//  Date helper
// ────────────────────────────────────────────────────────────────────

function formatJoinDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return 'الآن';
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 86400 * 30) return `قبل ${Math.floor(diff / 86400)} يوم`;
    if (diff < 86400 * 365) return `قبل ${Math.floor(diff / (86400 * 30))} شهر`;

    return d.toLocaleDateString('ar', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { selectedGuildId } = useGuildStore();
  const [members, setMembers] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('joined_desc');
  const [includeBots, setIncludeBots] = useState(false);

  const planGate = usePlanGate('membersHub', PLAN_TIERS.SILVER);

  // ─── Roles من API الحقيقي للفلتر ───
  const { roles: rawRoles } = useGuildResources({ types: ['roles'] });

  const roleMap = useMemo(() => {
    const map = new Map();
    (rawRoles || []).forEach((r) => map.set(r.id, r));
    return map;
  }, [rawRoles]);

  // ─── جلب الأعضاء ───
  useEffect(() => {
    let mounted = true;
    if (!selectedGuildId) {
      setMembers([]);
      return;
    }
    setMembers(null);

    guildApi
      .members(selectedGuildId, { limit: 200 })
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res) ? res : res.members || [];
        setMembers(list.map(normalizeMember).filter((m) => m.id));
      })
      .catch((err) => {
        if (!mounted) return;
        setMembers([]);
        toast.error(err.message || 'فشل تحميل الأعضاء');
      });

    return () => {
      mounted = false;
    };
  }, [selectedGuildId]);

  // ─── Filtering + Sorting ───
  const filtered = useMemo(() => {
    if (!members) return [];

    let list = members;

    if (!includeBots) {
      list = list.filter((m) => !m.isBot);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.username.toLowerCase().includes(q) || m.id.includes(search.trim()),
      );
    }

    if (roleFilter !== 'all') {
      if (roleFilter === 'no_roles') {
        list = list.filter((m) => m.roles.length === 0);
      } else {
        list = list.filter((m) => m.roles.includes(roleFilter));
      }
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'joined_asc':
          return (
            new Date(a.joinedAt || 0).getTime() -
            new Date(b.joinedAt || 0).getTime()
          );
        case 'joined_desc':
          return (
            new Date(b.joinedAt || 0).getTime() -
            new Date(a.joinedAt || 0).getTime()
          );
        case 'name_asc':
          return a.username.localeCompare(b.username, 'ar');
        case 'name_desc':
          return b.username.localeCompare(a.username, 'ar');
        case 'roles_desc':
          return b.roles.length - a.roles.length;
        default:
          return 0;
      }
    });

    return sorted;
  }, [members, search, roleFilter, sortBy, includeBots]);

  // ─── Top role helper (لعرض البادج بلون الرتبة) ───
  const getTopRole = (memberRoles) => {
    if (!memberRoles?.length || !roleMap.size) return null;
    let top = null;
    for (const rid of memberRoles) {
      const r = roleMap.get(rid);
      if (!r) continue;
      if (!top || (r.position ?? 0) > (top.position ?? 0)) {
        top = r;
      }
    }
    return top;
  };

  // ─── Stats سريعة ───
  const totalCount = members?.length || 0;
  const botCount = members?.filter((m) => m.isBot).length || 0;
  const humanCount = totalCount - botCount;

  // ─── Sortable roles for filter (skip @everyone) ───
  const filterableRoles = useMemo(() => {
    return (rawRoles || [])
      .filter((r) => r.id !== selectedGuildId && r.name !== '@everyone')
      .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
  }, [rawRoles, selectedGuildId]);

  return (
    <>
      <SettingsPageHeader
        icon={<Users />}
        title="الأعضاء"
        description="استكشف وابحث وافلتر أعضاء سيرفرك"
        plan="silver"
      />

      {planGate.isLocked && (
        <PlanLockBanner
          currentPlan={planGate.currentPlan}
          requiredPlan={planGate.requiredPlan}
          featureName="قسم الأعضاء"
          className="mb-6"
        />
      )}

      {/* Stats summary */}
      {members && members.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">إجمالي</div>
            <div className="text-2xl font-bold num">{totalCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">أعضاء</div>
            <div className="text-2xl font-bold num text-emerald-500">
              {humanCount}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">بوتات</div>
            <div className="text-2xl font-bold num text-violet-500">
              {botCount}
            </div>
          </Card>
        </div>
      )}

      {/* Filters bar */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pe-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:w-52">
                <Filter className="w-4 h-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الرتب</SelectItem>
                <SelectItem value="no_roles">بدون رتبة</SelectItem>
                {filterableRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-52">
                <ArrowUpDown className="w-4 h-4 me-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="joined_desc">الأحدث انضماماً</SelectItem>
                <SelectItem value="joined_asc">الأقدم انضماماً</SelectItem>
                <SelectItem value="name_asc">الاسم (أ → ي)</SelectItem>
                <SelectItem value="name_desc">الاسم (ي → أ)</SelectItem>
                <SelectItem value="roles_desc">الأكثر رتباً</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={includeBots}
                onCheckedChange={setIncludeBots}
                id="show-bots"
              />
              <label
                htmlFor="show-bots"
                className="text-sm cursor-pointer flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                إظهار البوتات
              </label>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="num">{filtered.length}</span> من{' '}
              <span className="num">{totalCount}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* List */}
      {!members ? (
        <Card className="p-5 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="لا يوجد أعضاء"
          description={
            members.length === 0
              ? 'هذا السيرفر فارغ — أو ما قدر البوت يجلب الأعضاء'
              : 'ما في نتائج تطابق الفلتر — جرب تغيير الفلاتر'
          }
        />
      ) : (
        <Card className="p-3">
          <div className="space-y-1">
            {filtered.slice(0, 200).map((m) => {
              const topRole = getTopRole(m.roles);
              const initial = m.username.slice(0, 1).toUpperCase();
              const joinedLabel = formatJoinDate(m.joinedAt);

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/40 transition-colors group"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.username}
                        loading="lazy"
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full lyn-gradient flex items-center justify-center text-white text-sm font-bold">
                        {initial}
                      </div>
                    )}
                    {m.isBot && (
                      <div className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full bg-violet-500 border-2 border-background flex items-center justify-center">
                        <Bot className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm truncate">
                        {m.username}
                      </div>
                      {m.isBot && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5 h-4"
                        >
                          BOT
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono ltr truncate flex items-center gap-2">
                      <span>{m.id}</span>
                      {joinedLabel && (
                        <>
                          <span className="opacity-50">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {joinedLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top role badge */}
                  {topRole && (
                    <div
                      className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border"
                      style={{
                        color: topRole.color
                          ? intToHexColor(topRole.color)
                          : undefined,
                        borderColor: topRole.color
                          ? intToHexColor(topRole.color) + '40'
                          : undefined,
                        backgroundColor: topRole.color
                          ? intToHexColor(topRole.color) + '15'
                          : undefined,
                      }}
                    >
                      <Crown className="w-3 h-3" />
                      {topRole.name}
                    </div>
                  )}

                  {/* Roles count */}
                  <div className="text-xs text-muted-foreground num flex-shrink-0">
                    <span className="num font-semibold">{m.roles.length}</span>{' '}
                    رتبة
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length > 200 && (
            <div className="text-center text-xs text-muted-foreground py-3 border-t border-border mt-2">
              عرض أول <span className="num">200</span> — استخدم البحث لتضييق
              النتائج
            </div>
          )}
        </Card>
      )}
    </>
  );
}