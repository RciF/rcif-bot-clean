import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import DashboardPage from '@/pages/DashboardPage';
import ServersPage from '@/pages/ServersPage';
import AISettingsPage from '@/pages/AISettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      // Public
      { path: '/', element: <HomePage /> },

      // Auth
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
        ],
      },
      { path: 'auth/callback', element: <AuthCallbackPage /> },

      // Protected dashboard
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'servers', element: <ServersPage /> },
          { path: 'ai', element: <AISettingsPage /> },
          { path: 'protection', element: <ComingSoonPage title="الحماية" /> },
          { path: 'levels', element: <ComingSoonPage title="المستويات" /> },
          { path: 'economy', element: <ComingSoonPage title="الاقتصاد" /> },
          { path: 'tickets', element: <ComingSoonPage title="التذاكر" /> },
          { path: 'settings', element: <ComingSoonPage title="الإعدادات" /> },
        ],
      },

      // 404
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

function ComingSoonPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-2xl lyn-gradient flex items-center justify-center mb-6 lyn-glow animate-lyn-float">
        <span className="text-3xl">🚀</span>
      </div>
      <h1 className="text-3xl font-bold mb-3 lyn-text-gradient">{title}</h1>
      <p className="text-muted-foreground">
        هذه الصفحة قيد التطوير وستكون متاحة قريباً
      </p>
    </div>
  );
}

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
