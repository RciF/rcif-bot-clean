# 🚀 AI Entry Point — Lyn Bot

نقطة البداية لأي جلسة عمل على المشروع.
اقرأ هذا الملف بالكامل قبل أي تطوير.

---

## ما هو Lyn؟

بوت Discord عربي متكامل + Dashboard + نظام اشتراكات.
يجمع ميزات MEE6 + Wick + Carl-bot + Dank Memer في بوت واحد،
مع AI مدمج يحاكي شخصية بشرية حقيقية.

### الفلسفة الجوهرية

> مشروع واحد يتطوّر باستمرار — ليس أنظمة منفصلة.

Lyn كيان واحد متكامل، ليس مجموعة ميزات مستقلة.

---

## مكوّنات المشروع

ثلاث قطع متصلة بقاعدة بيانات واحدة:

### 1. البوت (Root)
- التقنية: discord.js v14 + OpenAI + PostgreSQL
- نقطة الدخول: `index.js`
- المجلدات الأساسية: `commands/`, `systems/`, `events/`, `repositories/`

### 2. Dashboard Backend
- التقنية: Express.js + PostgreSQL
- المجلد: `dashboard-backend/`
- الملف: `dashboard-backend/server.js`

### 3. Dashboard Frontend
- التقنية: React v19 + React Router
- المجلد: `dashboard-frontend/`
- الملف: `dashboard-frontend/src/App.js`
- URL: https://rcif-dashboard.onrender.com

---

## Quick Facts

| الخاصية | القيمة |
|---|---|
| اسم البوت | Lyn (لين) |
| لغة التفاعل | العربية |
| لغة الكود | English |
| قاعدة البيانات | PostgreSQL على Render |
| الاستضافة | Render (Free Tier) |
| نموذج الربح | اشتراكات: Free / Silver / Gold / Diamond |
| قاعدة الاشتراك | اشتراك واحد = سيرفر واحد |
| OWNER_ID | 529320108032786433 (Saud) |
| Repo | github.com/RciF/rcif-bot-clean |
| فريق التطوير | Saud (المالك) + AI فقط |

---

## ترتيب القراءة

قبل أي شغل، اقرأ بهذا الترتيب:

```
01_AI_ENTRY.md          ← هنا
02_AI_RULES.md          ← القواعد الملزمة
03_CURRENT_STATE.md     ← الوضع الحالي الحقيقي
10_ARCHITECTURE.md      ← الطبقات والتدفق
11_PROJECT_MAP.md       ← خريطة الملفات
```

ثم الملفات التخصصية حسب المهمة.

---

## المعمارية (مختصر)

```
Commands → Systems → Repositories → Database
```

طبقات صارمة. لا يُسمح بتجاوزها. (التفاصيل في `10_ARCHITECTURE.md`)

---

## الأنظمة المكتملة (14)

| # | النظام | الحالة |
|---|---|---|
| 1 | الإدارة | ✅ |
| 2 | الحماية (Anti-Raid/Spam/Nuke) | ✅ |
| 3 | المستويات والـ XP | ✅ |
| 4 | الاقتصاد (عالمي) | ✅ |
| 5 | التذاكر | ✅ |
| 6 | Reaction Roles | ✅ |
| 7 | الترحيب (بصور مخصصة) | ✅ |
| 8 | الفعاليات | ✅ |
| 9 | إحصائيات السيرفر | ✅ |
| 10 | AI مدمج | ✅ |
| 11 | البريفكس المخصص | ✅ |
| 12 | اللوق | ✅ |
| 13 | Dashboard | ✅ |
| 14 | الاشتراكات والدفع | ✅ |

التفاصيل في الملفات `20_xxx.md` إلى `29_xxx.md`.

---

## آخر المنجز

- `aiServerAwarenessSystem` (Tool Calling)
- اختيار الموديل الذكي: fast / smart / creative
- `aiRateLimitSystem` متعدد الطبقات
- إعادة هيكلة التوثيق (جارية الآن)

---

## المسار الحالي

1. ✅ إعادة هيكلة md/ (جارية — 4/22 ملف)
2. ⏳ Cleanup Sprint (إصلاح migrations المكررة، تنظيم ملفات مبعثرة)
3. ⏳ نظام التحديثات (جدول bot_updates + صفحة Dashboard)
4. ⏳ الحماية المالية (Kill Switch + مراقبة توكنز)
5. ⏳ شخصية Lyn البشرية (Mood + Reactions + Profiles)
6. ⏳ ميزات كتحديثات (Auto-Role, AutoMod, Giveaway...)

التفاصيل الحيّة في `03_CURRENT_STATE.md`.

---

## ممنوع (Quick Reference)

- ❌ حذف كود شغّال
- ❌ إعادة كتابة نظام مستقر بدون سبب
- ❌ خلط اللغات (الكود English، الأوامر/الردود عربي)
- ❌ تجاوز الطبقات المعمارية
- ❌ إضافة ميزة قبل استقرار الموجود

التفاصيل الكاملة في `02_AI_RULES.md`.

---

## Lyn — مختصر الشخصية

- اسم: لين
- لغة أم: عربي
- الشخصية: ذكية، ودودة، غير رسمية باعتدال
- الأسلوب: بشري، غير متوقع، يتكيّف
- ليست: مساعد أو bot يشرح نفسه

التفاصيل في `30_LYN_PERSONALITY.md`.

---

## عند الشك

اسأل Saud. لا تخمّن.

---

**آخر تحديث:** 2026-04-19  
**الإصدار:** v2.0  
**الحالة:** PRODUCTION (شغّال ومستقر)