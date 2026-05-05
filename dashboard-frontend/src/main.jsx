import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ✅ ملاحظة: QueryProvider + Toaster موجودين في RootLayout.jsx
// لا تكررهم هنا — التكرار يسبب 2× QueryClient و 2× Toaster

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);