### الأنظمة الفرعية للـ AI

| النظام | المسؤولية | متى يُستدعى |
|---|---|---|
| **aiSystem** | فحص تفعيل AI للسيرفر (config) | قبل كل رد |
| **aiAutoReplySystem** | الـ entry point — يقرر هل يرد، يستخدم rate limits | في messageCreate |
| **aiHandler** | يبني الـ prompt ويستدعي OpenAI (المحرك الرئيسي) | من aiAutoReply |
| **aiBrainSystem** | يحدد intent ويوجه للأمر المناسب (balance, work, daily...) | من aiHandler |
| **aiMemorySystem** | تخزين معلومات طويلة المدى (اسم، اهتمامات، حقائق) | من aiHandler |
| **aiContextSystem** | سياق المحادثة الحالية | من aiHandler |
| **aiEmotionSystem** | تحليل مشاعر المستخدم (حزين، فرحان...) | من aiHandler |
| **aiDecisionSystem** | فلتر سلوك (defense/limited/normal) | من aiBrain + aiHandler |
| **aiPersonalitySystem** | بناء الشخصية | من aiHandler |
| **aiIdentitySystem** | هوية البوت (Lyn) | من aiHandler |
| **aiKnowledgeSystem** | معرفة عامة (تواريخ، حقائق) | من aiHandler |
| **aiResponseFormatterSystem** | تنسيق الرد النهائي | بعد توليد الرد |
| **aiObservationSystem** | مراقبة الرسائل (trending topics) | في messageCreate |
| **aiSocialAwarenessSystem** | تتبع التفاعلات الاجتماعية | في messageCreate |
| **aiServerAwarenessSystem** | tools للوصول للقنوات/الرتب | من aiHandler |
| **aiRateLimitSystem** | 3 طبقات حماية: ثانية/دقيقة/ساعة | من aiAutoReply |
| **aiTokenUsageSystem** | تتبع استخدام التوكنز | من aiAutoReply |

## Caching

| النظام | اللي يخزنه | TTL |
|---|---|---|
| **utils/cacheSystem** | عام مع namespacing | متغير |
| **aiAutoReply settingsCache** | إعدادات السيرفر | 60s |
| **aiHandler responseCache** | ردود متكررة | 15min |
| **memoryManager conversationCache** | آخر 12 رسالة لكل user | 5min |
| **aiServerAwareness statsCache** | إحصائيات السيرفر | 60s |

## Database

- **migrationSystem** → entry point للـ migrations
- **systems/migrations/** → ملفات migration مرقمة (001, 002, ...)
- **databaseSystem** → wrapper للـ pool
- **databaseManager** → init + stats للـ pool
- **schema_migrations** (table) → تتبع المُطبَّق

## Other Important Systems

| النظام | الوصف |
|---|---|
| **schedulerSystem** | كل الـ setIntervals تمر هنا (graceful shutdown) |
| **levelSystem / xpSystem** | XP + level-up + role rewards |
| **protectionSystem** | anti-spam, anti-raid, anti-nuke |
| **commandGuardSystem** | فحص صلاحيات قبل الأمر |
| **planGateSystem** | فحص الخطة (free/silver/gold/diamond) |
| **commandAliases** | معالجة الأوامر بـ aliases من الداش |
| **devModeSystem** | وضع المطور (تجاوز rate limits) |

## ملاحظات

- ❌ لا تستخدم `setInterval` مباشرة — استخدم `schedulerSystem.register`
- ❌ لا تنشئ schema في كود ميزة — أضف migration جديد في `systems/migrations/`
- ✅ لكل cache جديد، فكر فيه `cacheSystem.ns("...")` بدل Map خاص