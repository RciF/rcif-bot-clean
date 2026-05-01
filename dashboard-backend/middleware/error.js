/**
 * ═══════════════════════════════════════════════════════════
 *  Error Handler Middleware
 *  يلتقط كل الأخطاء + يرجع response موحد + يسجل في console
 * ═══════════════════════════════════════════════════════════
 */

const env = require("../config/env")

/**
 * Custom Error class — للأخطاء المعروفة
 *
 * @example
 *   throw new ApiError("الأمر غير موجود", 404, "CMD_NOT_FOUND")
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = true
  }
}

/**
 * Wrapper لـ async route handlers
 * يلتقط الأخطاء async ويوجهها للـ error handler
 *
 * @example
 *   router.get('/something', asyncHandler(async (req, res) => {
 *     ...
 *   }))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Middleware: 404 handler
 * يلتقط الطلبات لـ routes غير موجودة
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: "المسار غير موجود",
    code: "NOT_FOUND",
    path: req.path,
  })
}

/**
 * Middleware: error handler عام
 *
 * يجب يكون آخر middleware في الـ chain
 */
function errorHandler(err, req, res, next) {
  // CORS errors
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({
      error: "الطلب مرفوض من جهة الأمان (CORS)",
      code: "CORS_BLOCKED",
    })
  }

  // أخطاء معروفة (ApiError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details && { details: err.details }),
    })
  }

  // أخطاء PostgreSQL
  if (err.code?.startsWith("23")) {
    // 23xxx = integrity constraints
    const messages = {
      "23505": "هذا السجل موجود مسبقاً (قيمة مكررة)",
      "23503": "السجل المرتبط غير موجود (foreign key)",
      "23502": "حقل مطلوب فارغ",
    }
    return res.status(400).json({
      error: messages[err.code] || "خطأ في قاعدة البيانات",
      code: `DB_${err.code}`,
    })
  }

  // أخطاء غير معروفة — log كامل
  console.error("═══════════════ UNHANDLED ERROR ═══════════════")
  console.error(`Path: ${req.method} ${req.path}`)
  console.error(`User: ${req.user?.id || "anonymous"}`)
  console.error(`Error: ${err.message}`)
  if (!env.IS_PROD) {
    console.error(err.stack)
  }
  console.error("════════════════════════════════════════════════")

  // في prod: ما نكشف stack trace
  res.status(err.statusCode || 500).json({
    error: env.IS_PROD ? "حدث خطأ غير متوقع" : err.message,
    code: "INTERNAL_ERROR",
    ...(!env.IS_PROD && { stack: err.stack?.split("\n").slice(0, 5) }),
  })
}

module.exports = {
  ApiError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
}
