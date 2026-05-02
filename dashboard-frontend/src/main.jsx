import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/components/ui/QueryProvider';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryProvider>
      <App />
      <Toaster
        position="bottom-right"
        dir="rtl"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </QueryProvider>
  </StrictMode>,
);