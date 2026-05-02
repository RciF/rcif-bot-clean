import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Settings,
  Bot,
  Shield,
  TrendingUp,
  Coins,
  Ticket,
  Bell,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  PartyPopper,
  ScrollText,
  Gavel,
  ToggleRight,
  Sparkles,
  BarChart3,
  Users,
  History,
  Layers,
  CreditCard,
  Terminal,
  CalendarDays,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ui/ThemeProvider';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const navSections = [
  {
    label: 'الرئيسية',
    items: [
      { to: '/dashboard', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
      { to: '/dashboard/stats', label: 'الإحصائيات', icon: BarChart3 },
      { to: '/dashboard/audit', label: 'سجل الأنشطة', icon: History },
      { to: '/dashboard/servers', label: 'السيرفرات', icon: Server },
    ],
  },
  {
    label: 'إدارة السيرفر',
    items: [
      { to: '/dashboard/welcome', label: 'الترحيب', icon: PartyPopper },
      { to: '/dashboard/protection', label: 'الحماية', icon: Shield },
      { to: '/dashboard/logs', label: 'السجلات', icon: ScrollText },
      { to: '/dashboard/moderation', label: 'الإشراف', icon: Gavel },
      { to: '/dashboard/members', label: 'الأعضاء', icon: Users },
    ],
  },
  {
    label: 'التفاعل',
    items: [
      { to: '/dashboard/tickets', label: 'التذاكر', icon: Ticket },
      { to: '/dashboard/reaction-roles', label: 'لوحات الرتب', icon: ToggleRight },
      { to: '/dashboard/levels', label: 'المستويات', icon: TrendingUp },
      { to: '/dashboard/economy', label: 'الاقتصاد', icon: Coins },
      { to: '/dashboard/events', label: 'الفعاليات', icon: CalendarDays },
    ],
  },
  {
    label: 'المتقدم',
    items: [
      { to: '/dashboard/ai', label: 'الذكاء الاصطناعي', icon: Bot },
      { to: '/dashboard/embed', label: 'منشئ الإيمبيد', icon: Sparkles },
      { to: '/dashboard/scheduler', label: 'المُجدوِل', icon: Clock },
      { to: '/dashboard/templates', label: 'القوالب', icon: Layers },
    ],
  },
  {
    label: 'الإعدادات',
    items: [
      { to: '/dashboard/commands', label: 'الأوامر', icon: Terminal },
      { to: '/dashboard/subscription', label: 'الاشتراك', icon: CreditCard },
      { to: '/dashboard/settings', label: 'إعدادات عامة', icon: Settings },
    ],
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج');
    navigate('/login');
  };

  const userInitial = user?.username?.[0]?.toUpperCase() || 'م';

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'fixed lg:sticky top-0 right-0 h-screen w-72 bg-sidebar border-l border-sidebar-border z-40 transition-transform duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl lyn-gradient flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="font-bold text-lg lyn-text-gradient">Lyn Bot</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className="text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest px-3 mb-2">
                {section.label}
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
                        'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'lyn-gradient text-white lyn-glow'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                      )
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3 flex-shrink-0">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full lyn-gradient flex items-center justify-center text-white text-sm font-semibold">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{user.username}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.isOwner ? 'المالك' : 'مطوّر'}
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

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-30" />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-accent rounded-lg">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mr-auto">
            <button onClick={toggleTheme} className="p-2 hover:bg-accent rounded-lg transition-colors" aria-label="تبديل الثيم">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 hover:bg-accent rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-lyn-pink-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full lyn-gradient flex items-center justify-center text-white text-sm font-semibold">
              {userInitial}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
