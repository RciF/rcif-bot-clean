import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle, X, Shield, Bot, PartyPopper, ScrollText,
  Ticket, TrendingUp, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { to: '/dashboard/protection', label: 'الحماية', icon: Shield, color: 'text-red-500' },
  { to: '/dashboard/ai',         label: 'الذكاء الاصطناعي', icon: Bot, color: 'text-violet-500' },
  { to: '/dashboard/welcome',    label: 'الترحيب', icon: PartyPopper, color: 'text-pink-500' },
  { to: '/dashboard/logs',       label: 'السجلات', icon: ScrollText, color: 'text-amber-500' },
  { to: '/dashboard/tickets',    label: 'التذاكر', icon: Ticket, color: 'text-blue-500' },
  { to: '/dashboard/levels',     label: 'المستويات', icon: TrendingUp, color: 'text-emerald-500' },
];

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const goTo = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full lyn-gradient text-white shadow-lg',
          'flex items-center justify-center transition-all hover:scale-110',
          'lyn-glow',
        )}
        aria-label="مساعدة سريعة"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </button>

      {/* Panel */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />
          <div
            className={cn(
              'fixed bottom-24 left-6 z-50 w-72 max-w-[calc(100vw-3rem)]',
              'bg-card border border-border rounded-2xl shadow-2xl overflow-hidden',
              'animate-page-enter',
            )}
          >
            <div className="p-4 border-b border-border lyn-gradient text-white">
              <div className="font-bold text-base mb-0.5">وصول سريع</div>
              <div className="text-xs opacity-90">انتقل لأي إعداد بنقرة</div>
            </div>

            <div className="p-2 max-h-80 overflow-y-auto">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.to}
                  onClick={() => goTo(link.to)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-right group"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center',
                    'group-hover:scale-110 transition-transform',
                    link.color,
                  )}>
                    <link.icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{link.label}</span>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-border bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">
                💡 استخدم البحث في الشريط الجانبي للأسرع
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}