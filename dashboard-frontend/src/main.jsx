import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initThemeSystem } from './lib/themeSystem';
import './index.css';

// ✅ ملاحظة: QueryProvider + Toaster موجودين في RootLayout.jsx
// لا تكررهم هنا — التكرار يسبب 2× QueryClient و 2× Toaster

// ✨ تفعيل نظام الثيمات اليومية قبل أول render
initThemeSystem();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);