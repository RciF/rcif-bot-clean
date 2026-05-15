import { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Server, Settings, Bot, Shield, TrendingUp, Coins,
  Ticket, Bell, LogOut, Menu, X, Moon, Sun, PartyPopper, ScrollText,
  Gavel, ToggleRight, Sparkles, BarChart3, Users, History, Layers,
  CreditCard, Terminal, CalendarDays, Clock, ChevronDown, Crown,
  Search, UserPlus, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ui/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { useGuildStore } from '@/store/guildStore';
import { PageTransition } from '@/components/shared/PageTransition';
import { isOwner as checkIsOwner } from '@/config/env';
import { toast } from 'sonner';
import { HelpWidget } from '@/components/shared/HelpWidget';
import { SSEProvider } from '@/components/shared/SSEProvider';
import { LiveIndicator } from '@/components/shared/LiveIndicator';

// ─── Base nav sections (للجميع) ──────────────────────────────
const BASE_NAV_SECTIONS = [
  {
    label: 'الرئيسية',
    items: [
      { to: '/dashboard',         label: 'نظرة عامة',     icon: LayoutDashboard, end: true },
      { to: '/dashboard/stats',   label: 'الإحصائيات',    icon: BarChart3 },
      { to: '/dashboard/audit',   label: 'سجل الأنشطة',   icon: History },
      { to: '/dashboard/servers', label: 'تغيير السيرفر', icon: Server },
    ],
  },
  {
    label: 'الإعدادات الأساسية',
    items: [
      { to: '/dashboard/commands', label: 'الأوامر',  icon: Terminal },
      { to: '/dashboard/settings', label: 'إعدادات', icon: Settings },
    ],
  },
  {
    label: 'الأمان والإشراف',
    items: [
      { to: '/dashboard/protection', label: 'الحماية',           icon: Shield },
      { to: '/dashboard/automod',    label: 'الإشراف التلقائي', icon: ShieldAlert },
      { to: '/dashboard/moderation', label: 'الإشراف اليدوي',    icon: Gavel },
      { to: '/dashboard/logs',       label: 'السجلات',           icon: ScrollText },
    ],
  },
  {
    label: 'الأعضاء',
    items: [
      { to: '/dashboard/welcome',        label: 'الترحيب',          icon: PartyPopper },
      { to: '/dashboard/auto-role',      label: 'الرتبة التلقائية', icon: UserPlus },
      { to: '/dashboard/members',        label: 'الأعضاء',          icon: Users },
      { to: '/dashboard/reaction-roles', label: 'لوحات الرتب',      icon: ToggleRight },
    ],
  },
  {
    label: 'التفاعل',
    items: [
      { to: '/dashboard/tickets',  label: 'التذاكر',   icon: Ticket },
      { to: '/dashboard/levels',   label: 'المستويات', icon: TrendingUp },
      { to: '/dashboard/economy',  label: 'الاقتصاد',  icon: Coins },
      { to: '/dashboard/events',   label: 'الفعاليات', icon: CalendarDays },
    ],
  },
  {
    label: 'الأدوات الذكية',
    items: [
      { to: '/dashboard/ai',        label: 'الذكاء الاصطناعي', icon: Bot },
      { to: '/dashboard/embed',     label: 'منشئ الإيمبيد',    icon: Sparkles },
      { to: '/dashboard/scheduler', label: 'المُجدوِل',         icon: Clock },
      { to: '/dashboard/templates', label: 'القوالب',           icon: Layers },
    ],
  },
  {
    label: 'الحساب',
    items: [
      { to: '/dashboard/subscription', label: 'الاشتراك', icon: CreditCard },
    ],
  },
];

const OWNER_NAV_SECTION = {
  label: 'إدارة المالك',
  ownerOnly: true,
  items: [
    { to: '/dashboard/owner-admin', label: 'لوحة المالك', icon: Crown },
  ],
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { selectedGuild } = useGuildStore();

  const isOwner = user?.isOwner || checkIsOwner(user?.id);

  const navSections = useMemo(() => {
    const all = isOwner ? [...BASE_NAV_SECTIONS, OWNER_NAV_SECTION] : BASE_NAV_SECTIONS;
    if (!searchQuery.trim()) return all;

    const q = searchQuery.toLowerCase().trim();
    return all
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.label.toLowerCase().includes(q)),
      }))
      .filter(section => section.items.length > 0);
  }, [isOwner, searchQuery]);

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج');
    navigate('/login');
  };

  const userInitial = user?.username?.[0]?.toUpperCase() || 'م';

  const guildIconUrl = selectedGuild?.icon || null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 right-0 h-screen w-72 bg-sidebar border-l border-sidebar-border z-40 transition-transform duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/lyn-icon.png"
              alt="Lyn Bot"
              className="w-9 h-9 rounded-xl object-cover"
            />
            <span className="font-bold text-lg lyn-text-gradient">Lyn Bot</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guild indicator */}
        {selectedGuild && (
          <button
            onClick={() => navigate('/dashboard/servers')}
            className="flex items-center gap-3 px-4 py-3 mx-3 mt-3 rounded-xl hover:bg-sidebar-accent transition-colors border border-sidebar-border"
          >
            {guildIconUrl ? (
              <img src={guildIconUrl} alt={selectedGuild.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg lyn-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {selectedGuild.name?.[0]}
              </div>
            )}
            <div className="flex-1 min-w-0 text-right">
              <div className="text-sm font-semibold truncate">{selectedGuild.name}</div>
              <div className="text-xs text-muted-foreground">السيرفر الحالي</div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        )}

        {/* Search */}
        <div className="px-3 mt-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث..."
              className="w-full bg-sidebar-accent/40 border border-sidebar-border rounded-xl pr-9 pl-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-sidebar-accent rounded text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5">
          {navSections.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              لا توجد نتائج لـ "{searchQuery}"
            </div>
          ) : (
            navSections.map((section) => (
              <div key={section.label}>
                <div
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-widest px-3 mb-2 flex items-center gap-1.5',
                    section.ownerOnly ? 'text-amber-500' : 'text-sidebar-foreground/50',
                  )}
                >
                  {section.ownerOnly && <Crown className="w-3 h-3" />}
                  <span>{section.label}</span>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'lyn-gradient text-white lyn-glow'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-[-2px]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full bg-white/80" />
                          )}
                          <item.icon className={cn('w-5 h-5 transition-transform', !isActive && 'group-hover:scale-110')} />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-3 flex-shrink-0">
          {user && (
            <div className="flex items-center gap-3 px-2">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full lyn-gradient flex items-center justify-center text-white text-sm font-semibold">
                  {userInitial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{user.username}</div>
                <div className="text-xs text-muted-foreground">
                  {user.isOwner ? 'المالك' : 'مسؤول'}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-30" />}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-accent rounded-lg">
            <Menu className="w-5 h-5" />
          </button>

          {selectedGuild && (
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-sm font-semibold truncate max-w-32">{selectedGuild.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mr-auto">
          <LiveIndicator />
            <button onClick={toggleTheme} className="p-2 hover:bg-accent rounded-lg transition-colors" aria-label="تبديل الثيم">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 hover:bg-accent rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-lyn-pink-500 rounded-full" />
            </button>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full lyn-gradient flex items-center justify-center text-white text-sm font-semibold">
                {userInitial}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
         <SSEProvider>
          <PageTransition>
           <Outlet />
         </PageTransition>
        </SSEProvider>
       </main>
      </div>

      <HelpWidget />
    </div>
  );
}