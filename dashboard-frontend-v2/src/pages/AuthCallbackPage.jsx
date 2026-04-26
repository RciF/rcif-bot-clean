import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, error } = useAuthStore();

  useEffect(() => {
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
