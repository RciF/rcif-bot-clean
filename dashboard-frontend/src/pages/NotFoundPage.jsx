import { Link } from 'react-router-dom';
import { Home, ArrowRight, Bot } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
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

      <div className="text-center relative z-10 animate-lyn-fade-up">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl lyn-gradient mb-8 lyn-glow animate-lyn-float">
          <Bot className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-9xl font-bold mb-4 lyn-text-gradient num">404</h1>
        <h2 className="text-3xl font-bold mb-3">الصفحة غير موجودة</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          عذراً، الصفحة اللي تبحث عنها مش موجودة أو تم نقلها لمكان ثاني
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 rounded-xl lyn-gradient text-white font-semibold hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            <span>الصفحة الرئيسية</span>
          </Link>
          <Link
            to="/dashboard"
            className="px-6 py-3 rounded-xl lyn-glass font-semibold hover:scale-105 transition-transform inline-flex items-center gap-2"
          >
            <span>لوحة التحكم</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
