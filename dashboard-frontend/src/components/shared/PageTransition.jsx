import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageTransition — fade-in animation عند تغيير الصفحة
 * يستخدم key على الـ pathname لإعادة تشغيل الـ animation
 */
export function PageTransition({ children }) {
  const { pathname } = useLocation();
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  return (
    <div key={key} className="animate-page-enter">
      {children}
    </div>
  );
}