import axios from 'axios';
import { toast } from 'sonner';
import { env } from '@/config/env';

/**
 * Axios instance with interceptors
 */
export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor — attach auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lyn-auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Don't show toast for cancelled requests
    if (axios.isCancel(error)) return Promise.reject(error);

    switch (status) {
      case 401:
        localStorage.removeItem('lyn-auth-token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        break;
      case 403:
        toast.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
        break;
      case 404:
        toast.error('المورد غير موجود');
        break;
      case 429:
        toast.error('تجاوزت الحد المسموح من الطلبات، حاول لاحقاً');
        break;
      case 500:
      case 502:
      case 503:
        toast.error('خطأ في الخادم، حاول مرة أخرى لاحقاً');
        break;
      default:
        if (!error.response) {
          toast.error('فشل الاتصال بالخادم');
        } else if (status >= 400) {
          toast.error(message);
        }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
