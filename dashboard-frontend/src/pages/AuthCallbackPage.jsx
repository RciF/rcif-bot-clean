import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

/**
 * AuthCallbackPage — صفحة استقبال OAuth code من Discord
 *
 * ⚠️ مهم: في React 19 + StrictMode، الـ effect يُنفذ مرتين في dev.
 * Discord OAuth code يُستخدم لمرة واحدة فقط — المحاولة الثانية تفشل.
 *
 * الحل: useRef guard يضمن إن login() يُستدعى مرة واحدة فقط.
 */
export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, error } = useAuthStore();

  // ✅ FIX: guard ضد التنفيذ المزدوج في StrictMode
  const consumedRef = useRef(false);

  useEffect(() => {
    // لو الـ code استُهلك بالفعل، تجاهل
    if (consumedRef.current) return;
    consumedRef.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      toast.error('تم إلغاء عملية تسجيل الدخول');
      navigate('/login');
      return;
    }

    if (!code) {
      toast.error('رمز التحقق غير موجود');
      navigate('/login');
      return;
    }

    (async () => {
      const result = await login(code);
      if (result.success) {
        toast.success('تم تسجيل الدخول بنجاح');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'فشل تسجيل الدخول');
        navigate('/login');
      }
    })();

    // ملاحظة: searchParams + login + navigate مستقرين بين renders،
    // لكن نضيفهم للـ deps حتى يلتزم react-hooks/exhaustive-deps
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">جاري تسجيل الدخول...</p>
          </>
        )}
      </div>
    </div>
  );
}