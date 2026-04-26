import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { QueryProvider } from '@/components/ui/QueryProvider';

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
