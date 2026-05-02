import { Link } from 'react-router-dom';
import { Bot, Shield, Zap, Heart, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const features = [
  { icon: Bot,    title: 'بوت ذكي',       description: 'AI متطور يفهم ويتفاعل بطبيعية',           gradient: 'from-violet-500 to-pink-500' },
  { icon: Shield, title: 'حماية شاملة',   description: 'حماية من الـ Raid والـ Spam والـ Nuke',    gradient: 'from-pink-500 to-violet-500' },
  { icon: Zap,    title: 'سرعة فائقة',    description: 'استجابة فورية في أقل من ثانيتين',          gradient: 'from-violet-400 to-pink-400' },
  { icon: Heart,  title: 'شخصية حقيقية', description: 'يعبر عن المشاعر ويتذكر تفاعلاته',          gradient: 'from-pink-400 to-violet-400' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-lyn-float"
          style={{ background: 'radial-gradient(circle, var(--color-lyn-500), transparent 70%)' }} />
        <div className="absolute bottom-0 -left-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-lyn-float"
          style={{ background: 'radial-gradient(circle, var(--color-lyn-pink-500), transparent 70%)', animationDelay: '2s' }} />
      </div>

      <main className="relative z-10 container mx-auto px-6 py-20 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-20 animate-lyn-fade-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl lyn-gradient mb-6 lyn-glow animate-lyn-float">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-6xl font-bold mb-4 lyn-text-gradient">Lyn Bot</h1>
          <p className="text-xl text-muted-foreground mb-3">لوحة تحكم أسطورية لأقوى بوت Discord عربي</p>
          <p className="text-sm text-muted-foreground/70 mb-10">Vite + React 19 + Tailwind v4 + shadcn/ui — v2.0.0</p>

          <div className="flex gap-4 justify-center flex-wrap">
            {isAuthenticated ? (
              <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl lyn-gradient text-white font-semibold hover:scale-105 transition-transform lyn-glow">
                لوحة التحكم
                <ArrowLeft className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl lyn-gradient text-white font-semibold hover:scale-105 transition-transform lyn-glow">
                  ابدأ الآن
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border border-border font-semibold hover:scale-105 transition-transform hover:border-primary/50">
                  لوحة التحكم
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.description}</p>
              </div>
            );
          })}
        </div>

        <footer className="text-center text-sm text-muted-foreground">
          صُنع بـ ❤️ بواسطة فريق Lyn
        </footer>
      </main>
    </div>
  );
}