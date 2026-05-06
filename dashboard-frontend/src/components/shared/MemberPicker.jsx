import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useGuildResources } from '@/hooks/useGuildResources';
import { cn } from '@/lib/utils';

/**
 * MemberPicker — اختيار عضو/أعضاء من السيرفر الحالي
 *
 * يستخدم useGuildResources لجلب الأعضاء من API الحقيقي
 * مع caching تلقائي عبر react-query.
 *
 * ⚠️ Discord member structure:
 *   { user: { id, username, global_name, avatar, ... }, nick, roles, joined_at, ... }
 *
 * @example
 *   <MemberPicker value={userId} onChange={setUserId} />
 *   <MemberPicker value={userIds} onChange={setUserIds} multiple />
 */

/**
 * استخراج معلومات عضو من Discord member object
 */
function normalizeMember(m) {
  // ربما يجي بصيغة flat (من بعض الـ APIs) أو nested (Discord standard)
  const user = m.user || m;
  const id = user.id || m.id;
  const username =
    m.nick ||
    user.global_name ||
    user.username ||
    `User ${(id || '').slice(0, 6)}`;

  let avatarUrl = null;
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.${ext}?size=64`;
  } else if (id) {
    // Default Discord avatar
    const defaultIndex = (BigInt(id) >> 22n) % 6n;
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  }

  return {
    id,
    username,
    avatarUrl,
    isBot: user.bot === true,
  };
}

export function MemberPicker({
  value,
  onChange,
  multiple = false,
  excludeBots = true,
  placeholder = 'اختر عضو...',
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // ✅ يجلب أعضاء السيرفر الحالي من API الحقيقي
  const { members: rawMembers, isLoading } = useGuildResources({
    types: ['members'],
  });

  // تطبيع البيانات لشكل ثابت
  const members = useMemo(() => {
    const list = (rawMembers || []).map(normalizeMember).filter((m) => m.id);
    if (excludeBots) return list.filter((m) => !m.isBot);
    return list;
  }, [rawMembers, excludeBots]);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    let list = members;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.username.toLowerCase().includes(q) || m.id.includes(search),
      );
    }
    return list.slice(0, 50);
  }, [members, search]);

  const selectedIds = multiple ? value || [] : value ? [value] : [];

  const selectedMembers = useMemo(() => {
    return members.filter((m) => selectedIds.includes(m.id));
  }, [members, selectedIds]);

  const toggleSelect = (member) => {
    if (multiple) {
      const newValue = selectedIds.includes(member.id)
        ? selectedIds.filter((id) => id !== member.id)
        : [...selectedIds, member.id];
      onChange(newValue);
    } else {
      onChange(member.id === value ? null : member.id);
      setOpen(false);
    }
  };

  const removeMember = (e, id) => {
    e.stopPropagation();
    if (multiple) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange(null);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full min-h-10 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors',
          'hover:border-border/80',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-primary ring-2 ring-primary/20',
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1.5 items-center text-start">
          {isLoading && selectedMembers.length === 0 ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              جاري التحميل...
            </span>
          ) : selectedMembers.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : multiple ? (
            selectedMembers.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500 text-xs font-medium"
              >
                {m.avatarUrl ? (
                  <img
                    src={m.avatarUrl}
                    alt=""
                    className="w-4 h-4 rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-violet-500/30 flex items-center justify-center text-[8px] font-bold">
                    {m.username[0]}
                  </div>
                )}
                {m.username}
                <button
                  type="button"
                  onClick={(e) => removeMember(e, m.id)}
                  className="hover:bg-violet-500/20 rounded-full p-0.5 ms-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-2">
              {selectedMembers[0].avatarUrl ? (
                <img
                  src={selectedMembers[0].avatarUrl}
                  alt=""
                  className="w-5 h-5 rounded-full"
                  loading="lazy"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {selectedMembers[0].username[0]}
                </div>
              )}
              <span className="font-medium">{selectedMembers[0].username}</span>
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform flex-shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 inset-x-0 rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-lyn-fade-up">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو ID..."
                className="pe-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري تحميل الأعضاء...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {members.length === 0
                  ? 'لا يوجد أعضاء في السيرفر'
                  : 'لا توجد نتائج للبحث'}
              </div>
            ) : (
              filtered.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleSelect(m)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors text-start',
                      isSelected ? 'bg-primary/10' : 'hover:bg-accent',
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="w-7 h-7 rounded-full"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {m.username[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.username}</div>
                      <div className="text-[10px] text-muted-foreground ltr">
                        ID: {m.id.slice(-8)}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })
            )}
          </div>

          {filtered.length === 50 && members.length > 50 && (
            <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground text-center">
              عرض أول 50 — استخدم البحث لتضييق النتائج
            </div>
          )}
        </div>
      )}
    </div>
  );
}