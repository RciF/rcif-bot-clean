import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { QueryProvider } from '@/components/ui/QueryProvider';

/**
 * RootLayout — أعلى layout في التطبيق
 *
 * يحتوي على:
 *   - QueryProvider (react-query) — مرة واحدة في كل التطبيق
 *   - ThemeProvider — للـ dark/light mode
 *   - Toaster (sonner) — مرة واحدة في كل التطبيق
 *
 * ⚠️ مهم: هذي الـ providers ما تتكرر في main.jsx
 */
export default function RootLayout() {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="dark">
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
          <Toaster
            position="top-center"
            richColors
            closeButton
            dir="rtl"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'IBM Plex Sans Arabic, sans-serif',
              },
            }}
          />
        </div>
      </ThemeProvider>
    </QueryProvider>
  );
}