import axios from "axios"
import { env } from "@/config/env"

/**
 * API Client — axios instance مع interceptors
 *
 * - يحط الـ JWT token تلقائياً
 * - يتعامل مع 401 (يطلع المستخدم لـ /login)
 * - يرجع response.data مباشرة
 */

const client = axios.create({
  baseURL: env.API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
})

// ── Request: حط الـ token ──
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("lyn-auth-token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response: حول data + معالج errors ──
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 401 Unauthorized - الجلسة انتهت
    if (error.response?.status === 401) {
      const code = error.response.data?.code
      if (code === "INVALID_TOKEN" || code === "NO_TOKEN") {
        localStorage.removeItem("lyn-auth-token")
        localStorage.removeItem("lyn-user")
        localStorage.removeItem("lyn-guilds")

        // تجنّب redirect loop لو نحن في صفحة login بالفعل
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login"
        }
      }
    }

    // أرجع الخطأ بصيغة موحدة
    const errorData = {
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "حدث خطأ غير متوقع",
      code: error.response?.data?.code || "NETWORK_ERROR",
      status: error.response?.status,
      details: error.response?.data?.details,
    }

    return Promise.reject(errorData)
  },
)

export const apiClient = {
  get: (url, config) => client.get(url, config),
  post: (url, data, config) => client.post(url, data, config),
  put: (url, data, config) => client.put(url, data, config),
  patch: (url, data, config) => client.patch(url, data, config),
  delete: (url, config) => client.delete(url, config),
}
