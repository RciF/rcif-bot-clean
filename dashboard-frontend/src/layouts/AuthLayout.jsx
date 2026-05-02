import { Outlet, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 -right-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-lyn-float"
          style={{ background: 'radial-gradient(circle, var(--color-lyn-500), transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 -left-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-lyn-float"
          style={{
            background: 'radial-gradient(circle, var(--color-lyn-pink-500), transparent 70%)',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Back to Home */}
      <Link
        to="/"
        className="fixed top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-xl lyn-glass text-sm font-medium hover:scale-105 transition-transform"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة</span>
      </Link>

      {/* Logo */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl lyn-gradient flex items-center justify-center">
          <span className="text-white font-bold">L</span>
        </div>
        <span className="font-bold text-lg lyn-text-gradient">Lyn Bot</span>
      </div>

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
