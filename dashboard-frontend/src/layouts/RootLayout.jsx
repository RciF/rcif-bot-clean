import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from '@/components/ui/ThemeProvider';
import { QueryProvider } from '@/components/ui/QueryProvider';

/**
 * Toaster مع theme تلقائي
 */
function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      dir="rtl"
      theme={theme}
      expand={false}
      visibleToasts={4}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'lyn-toast',
          title: 'font-semibold',
          description: 'text-sm opacity-90',
          actionButton: 'lyn-gradient',
        },
        style: {
          fontFamily: 'IBM Plex Sans Arabic, sans-serif',
          borderRadius: '14px',
          border: '1px solid var(--border)',
        },
      }}
    />
  );
}

/**
 * RootLayout — أعلى layout في التطبيق
 */
export default function RootLayout() {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="dark">
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
          <ThemedToaster />
        </div>
      </ThemeProvider>
    </QueryProvider>
  );
}