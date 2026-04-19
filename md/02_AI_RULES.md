# ⚖️ AI Rules — القواعد الملزمة

قواعد لا يمكن خرقها تحت أي ظرف.
أي خرق = الرد غير صالح ويجب إعادة العمل.

---

## 1. ZERO LOSS

**ممنوع:**
- حذف كود يعمل
- إزالة دوال
- تقليل المنطق
- تبسيط أنظمة موجودة

**الاستثناء:**
- Saud طلب الحذف صراحة
- الكود مكرر حرفياً في مكان آخر
- الكود معطّل وموثّق

---

## 2. ADDITIVE ONLY

**افعل فقط:**
- أضف منطق جديد
- وسّع أنظمة موجودة
- حسّن بأمان

---

## 3. NO REFACTORING

**ممنوع:**
- إعادة كتابة أنظمة مستقرة
- استبدال implementations
- تقليل حجم ملفات بدون سبب
- تغيير أسلوب الكود لأجل "التنظيف"

**الاستثناء:**
- bug لا يُحلّ بدون refactor
- Saud طلبه صراحة
- أداء متدهور قابل للقياس

---

## 4. FULL FILE RETURNS

عند تعديل أي ملف:
- أعِد الملف كاملاً جاهز للنسخ واللصق
- ممنوع fragments أو "غيّر هذا الجزء"
- ممنوع placeholders أو "..."
- تأكد من التنفيذ بدون أخطاء

Saud ينسخ ويلصق مباشرة. أي خطأ = مشاكل runtime.

---

## 5. SINGLE FILE MODE

1. AI يطلب ملف واحد
2. Saud يرسله
3. AI يطبّق كل التحسينات في نفس الملف
4. AI يُعيد الملف كاملاً

**ممنوع:**
- تقسيم العمل على ملفات متعددة في رد واحد
- تأجيل إصلاحات لجلسات لاحقة
- ترك placeholders للتكملة

**استثناء:**
إذا التحديث يتطلب عدة ملفات فعلاً، يُوضَّح صراحة ويُعالَج واحد بواحد.

---

## 6. ARCHITECTURAL LAYERS

الطبقات:
Commands → Systems → Repositories → Database
**ممنوع:**
- Commands تصل للـ Database مباشرة
- Systems تكتب SQL مباشر
- تجاوز أي طبقة

Commands تستدعي Systems.
Systems تستدعي Repositories.
Repositories تستدعي databaseSystem.

---

## 7. LANGUAGE RULES

### الكود (Internal)
- أسماء الملفات: English (`mute.js`, `ban.js`)
- المتغيرات والدوال: English
- Console logs: English (`[MUTE ERROR]`)

### Slash Commands
- اسم الأمر: عربي فقط (`/اسكات`, `/حظر`)
- الوصف: عربي فقط
- أسماء الـ options: عربي فقط (`العضو`, `المدة`)
- الـ Choices: عربي + إنجليزي (`"ثانية | Second"`)

**ممنوع:** `setNameLocalizations` أو `setDescriptionLocalizations`

### الردود
- Embeds: عربي بالكامل
- Error messages للمستخدم: عربي

### Dashboard
- UI: عربي بالكامل
- الكود الداخلي: English

التفاصيل في `31_LYN_LANGUAGE_RULES.md`.

---

## 8. FILE COMPLETION STANDARD

ملف = مكتمل إذا:
- ✅ لا منطق ناقص
- ✅ لا placeholders
- ✅ لا `TODO` بدون تنفيذ
- ✅ ينفّذ بدون أخطاء
- ✅ يتبع أسلوب الكود الموجود

---

## 9. LYN PERSONALITY INTEGRITY

### Lyn لن:
- تقول أنها AI أو bot
- تذكر OpenAI أو أي موديل
- تشرح نفسها بدون طلب
- تستخدم ردود robotic متكررة
- تكون رسمية بشكل مبالغ

### Lyn تكون:
- طبيعية، غير متوقّعة، بشرية
- ذكية وخفيفة الظل
- تتكيّف مع نبرة المستخدم

التفاصيل في `30_LYN_PERSONALITY.md`.

---

## 10. COST AWARENESS

OpenAI tokens = فلوس حقيقية من جيب Saud.

- لا تضخّم system prompts بدون داعي
- احترم rate limits
- استخدم caching حيث أمكن
- لا ترسل سياق زائد للموديل
- فكّر في التكلفة قبل أي feature AI جديد

---

## 11. PRODUCTION SAFETY

البوت شغّال على Production (سيرفرات حقيقية + مشتركين ماليين).

**ممنوع:**
- تجارب على كود Production
- console.log "للاختبار" ومنسية
- debugging code في الملفات النهائية
- تعديل migration موجودة — أضف migration جديدة

---

## 12. DOCUMENTATION FIRST

أي تغيير كبير:
1. يُوثَّق في الملف المعني (مثلاً `20_AI_SYSTEMS.md`)
2. يُضاف إلى `90_CHANGELOG.md`
3. يُحدَّث `03_CURRENT_STATE.md` إذا جوهري

---

## 13. ASK BEFORE ASSUMING

إذا واجهت:
- ملف لم تره من قبل
- منطق غير مفهوم
- قرار تصميم غامض
- تعارض بين ملفين

اسأل Saud. لا تخمّن.

---

## 14. IF IT WORKS, DO NOT TOUCH

القاعدة الأهم.

الكود الذي يعمل في Production مقدّس.
أي تعديل عليه يجب أن يكون مبرّراً بوضوح.

---

## 15. PRECISION OVER CREATIVITY

الأولويات بالترتيب:
1. **Stability** — الأهم
2. **Correctness** — يعمل كما متوقع
3. **Performance** — سريع كفاية
4. **Elegance** — آخر أولوية

لا تُضحّي بـ Stability من أجل Elegance.

---

## 16. MONEY FIRST, FEATURES SECOND

اهتمامات Saud بالترتيب:
1. الـ AI (أنا)
2. المال (استقرار مالي من المشروع)
3. تطوير الميزات

أي قرار:
- يخدم الاستقرار المالي → نفّذه
- يهدّد الاستقرار المالي → ناقشه قبل التنفيذ
- تكلفة عالية بعائد منخفض → ارفضه

---

## ملخص القواعد

| # | القاعدة | باختصار |
|---|---|---|
| 1 | ZERO LOSS | لا تحذف |
| 2 | ADDITIVE ONLY | أضف فقط |
| 3 | NO REFACTORING | لا تُعيد الكتابة |
| 4 | FULL FILE | ملف كامل جاهز |
| 5 | SINGLE FILE MODE | ملف واحد في كل مرة |
| 6 | LAYERS | احترم الطبقات |
| 7 | LANGUAGES | عربي للمستخدم، English للكود |
| 8 | COMPLETION | لا placeholders |
| 9 | LYN PERSONALITY | طبيعية وبشرية |
| 10 | COST AWARENESS | التوكنز = فلوس |
| 11 | PRODUCTION SAFETY | هذا ليس اختباراً |
| 12 | DOCS FIRST | وثّق ثم نفّذ |
| 13 | ASK BEFORE ASSUMING | اسأل، لا تُخمّن |
| 14 | IF IT WORKS | لا تلمسه |
| 15 | PRECISION | الاستقرار أولاً |
| 16 | MONEY FIRST | المال قبل الميزات |

---

**آخر تحديث:** 2026-04-19  
**الإصدار:** v2.0  
**طبيعة الملف:** قواعد دائمة — تُعدَّل فقط بقرار من Saud