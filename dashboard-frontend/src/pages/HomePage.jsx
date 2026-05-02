import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, Zap, Shield, Heart, Code2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ui/ThemeProvider';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const features = [
    { icon: Bot, title: 'بوت ذكي', description: 'AI متطور يفهم ويتفاعل بطبيعية', color: 'from-lyn-500 to-lyn-pink-500' },
    { icon: Shield, title: 'حماية شاملة', description: 'حماية من الـ Raid والـ Spam والـ Nuke', color: 'from-lyn-pink-500 to-lyn-500' },
    { icon: Zap, title: 'سرعة فائقة', description: 'استجابة فورية في أقل من ثانيتين', color: 'from-lyn-400 to-lyn-pink-400' },
    { icon: Heart, title: 'شخصية حقيقية', description: 'يعبر عن المشاعر ويتذكر تفاعلاته', color: 'from-lyn-pink-400 to-lyn-400' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 -right-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-lyn-float"
          style={{ background: 'radial-gradient(circle, var(--color-lyn-500), transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 -left-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-lyn-float"
          style={{ background: 'radial-gradient(circle, var(--color-lyn-pink-500), transparent 70%)', animationDelay: '2s' }}
        />
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 left-6 z-50 px-4 py-2 rounded-xl lyn-glass text-sm font-medium hover:scale-105 transition-transform"
      >
        {theme === 'dark' ? '☀️ فاتح' : '🌙 داكن'}
      </button>

      <main className="relative z-10 container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero */}
        <div className={cn('text-center transition-all duration-1000', mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full lyn-glass mb-8 animate-lyn-pulse">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Dashboard V2 — قيد التطوير</span>
          </div>

          <h1 className="text-7xl md:text-8xl font-bold mb-6 leading-tight">
            <span className="lyn-text-gradient">Lyn Bot</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
            لوحة تحكم أسطورية لأقوى بوت Discord عربي
          </p>

          <p className="text-base text-muted-foreground/70 mb-12">
            <span className="num">v2.0.0</span> · مبني بـ Vite + React 19 + Tailwind v4 + shadcn/ui
          </p>

          {/* CTA */}
          <div className="flex flex-wrap gap-4 justify-center mb-20">
            <Link
              to="/login"
              className="px-8 py-4 rounded-xl lyn-gradient text-white font-semibold lyn-glow hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              <span>ابدأ الآن</span>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link
              to="/dashboard"
              className="px-8 py-4 rounded-xl lyn-glass font-semibold hover:scale-105 transition-transform"
            >
              لوحة التحكم
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={cn(
                  'group relative p-6 rounded-2xl lyn-glass hover:lyn-glow transition-all duration-500',
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                )}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform', feature.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Status */}
        <div className="rounded-2xl lyn-border-animated p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Code2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-mono text-muted-foreground">DAY 2 — ROUTING ACTIVE</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">
            <span className="lyn-text-gradient">المرحلة 1 - اليوم 2</span>
          </h2>
          <p className="text-muted-foreground">
            React Router v7 + Layouts نظام كامل ✨
          </p>
        </div>

        <footer className="text-center mt-16 text-sm text-muted-foreground">
          <p>صُنع بـ ❤️ بواسطة فريق Lyn</p>
        </footer>
      </main>
    </div>
  );
}
