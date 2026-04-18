import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom"
import { useEffect, useState, useRef, useCallback } from "react"

const API          = process.env.REACT_APP_API_URL      || "http://localhost:4000"
const CLIENT_ID    = process.env.REACT_APP_CLIENT_ID    || "1480292734353805373"
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || "http://localhost:3000/callback"
const OWNER_ID     = process.env.REACT_APP_OWNER_ID     || "529320108032786433"
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`
// ══════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════
const PLANS = [
  { id:"free",    name:"مجاني", price:0,   color:"#64748b", icon:"🆓", ai_limit:0,
    features:["الإشراف الكامل","معلومات السيرفر","أوامر أساسية"] },
  { id:"silver",  name:"فضي",   price:29,  color:"#94a3b8", icon:"🥈", ai_limit:0,
    features:["كل مميزات المجاني","نظام الترحيب والوداع","السجلات كامل","Reaction Roles + لوحة الرتب","إحصائيات السيرفر","XP والمستويات","تغيير أسماء الأوامر","بريفكس مخصص"] },
  { id:"gold",    name:"ذهبي",  price:79,  color:"#fbbf24", icon:"👑", ai_limit:300, popular:true,
    features:["كل مميزات الفضي","الاقتصاد الكامل","نظام التذاكر","الفعاليات","الحماية كاملة","ذكاء اصطناعي 300 رسالة/يوم"] },
  { id:"diamond", name:"ماسي",  price:149, color:"#00ffe7", icon:"💎", ai_limit:700,
    features:["جميع المميزات","ذكاء اصطناعي 700 رسالة/يوم","إحصائيات متقدمة في الداشبورد","أولوية دعم قصوى"] },
]

const PLAN_HIERARCHY = { free:0, silver:1, gold:2, diamond:3 }
const canUsePlan = (gp, rq) => (PLAN_HIERARCHY[gp]??0) >= (PLAN_HIERARCHY[rq]??0)

const BANK_INFO = {
  bank:"بنك الراجحي", accountName:"ALI TAWI A",
  accountNumber:"107000010006086076681",
  iban:"SA55 8000 0107 6080 1607 6681", applePay:"+966509992372",
}

// 86 أمر — كل أمر مع كاتيجوري وخطة
const ALL_COMMANDS = [
  // الإشراف
  { name:"حظر",            category:"moderation", plan:"free",    description:"حظر عضو من السيرفر نهائياً" },
  { name:"طرد",            category:"moderation", plan:"free",    description:"طرد عضو من السيرفر" },
  { name:"تحذير",          category:"moderation", plan:"free",    description:"إعطاء تحذير لعضو" },
  { name:"التحذيرات",      category:"moderation", plan:"free",    description:"عرض تحذيرات عضو محدد أو كل الأعضاء المحذرين" },
  { name:"مسح_التحذيرات",  category:"moderation", plan:"free",    description:"مسح تحذير محدد أو جميع تحذيرات عضو" },
  { name:"اسكت",           category:"moderation", plan:"free",    description:"كتم عضو لمدة محددة (Timeout)" },
  { name:"فك_الكتم",       category:"moderation", plan:"free",    description:"فك الكتم لعضو مكتوم" },
  { name:"فك_الحظر",       category:"moderation", plan:"free",    description:"فك حظر عضو من السيرفر" },
  { name:"مسح",            category:"moderation", plan:"free",    description:"مسح رسائل من القناة مع فلاتر متقدمة" },
  { name:"لقب",            category:"moderation", plan:"free",    description:"تغيير أو إزالة لقب عضو" },
  { name:"بطيء",           category:"moderation", plan:"free",    description:"تفعيل أو تعطيل السلو مود" },
  { name:"قفل",            category:"moderation", plan:"free",    description:"قفل قناة ومنع الكتابة" },
  { name:"فتح",            category:"moderation", plan:"free",    description:"فتح قناة مقفلة" },
  { name:"رتبة",           category:"moderation", plan:"free",    description:"إعطاء أو سحب رتبة" },
  { name:"ضبط_لوق",        category:"moderation", plan:"free",    description:"تحديد قناة اللوق لأحداث الإشراف" },
  // السجلات
  { name:"لوق ضبط",        category:"logs",       plan:"silver",  description:"تحديد قناة لحدث معين" },
  { name:"لوق تفعيل",      category:"logs",       plan:"silver",  description:"تفعيل نظام السجلات" },
  { name:"لوق إيقاف",      category:"logs",       plan:"silver",  description:"إيقاف نظام السجلات بالكامل" },
  { name:"لوق حالة",       category:"logs",       plan:"silver",  description:"عرض حالة نظام السجلات" },
  { name:"لوق الكل",       category:"logs",       plan:"silver",  description:"إرسال جميع الأحداث في قناة واحدة" },
  { name:"لوق مسح",        category:"logs",       plan:"silver",  description:"مسح جميع إعدادات السجلات" },
  { name:"لوق إزالة",      category:"logs",       plan:"silver",  description:"إيقاف تسجيل حدث معين" },
  // الحماية
  { name:"حماية سبام",     category:"protection", plan:"gold",    description:"إعداد نظام Anti-Spam" },
  { name:"حماية رايد",     category:"protection", plan:"gold",    description:"إعداد نظام Anti-Raid" },
  { name:"حماية نيوك",     category:"protection", plan:"gold",    description:"إعداد نظام Anti-Nuke" },
  { name:"حماية لوكداون",  category:"protection", plan:"gold",    description:"تفعيل أو إيقاف Lockdown يدوياً" },
  { name:"حماية وايتلست",  category:"protection", plan:"gold",    description:"إضافة أو إزالة من القائمة البيضاء" },
  { name:"حماية لوق",      category:"protection", plan:"gold",    description:"تحديد قناة سجل الحماية" },
  { name:"حماية حالة",     category:"protection", plan:"gold",    description:"عرض إعدادات الحماية الحالية" },
  // الترحيب
  { name:"ترحيب ضبط",      category:"welcome",    plan:"silver",  description:"ضبط إعدادات الترحيب" },
  { name:"ترحيب تفعيل",    category:"welcome",    plan:"silver",  description:"تفعيل نظام الترحيب" },
  { name:"ترحيب إيقاف",    category:"welcome",    plan:"silver",  description:"إيقاف نظام الترحيب" },
  { name:"ترحيب حالة",     category:"welcome",    plan:"silver",  description:"عرض الإعدادات الحالية" },
  { name:"ترحيب اختبار",   category:"welcome",    plan:"silver",  description:"اختبار رسالة الترحيب" },
  // التذاكر
  { name:"تذاكر إعداد",    category:"tickets",    plan:"gold",    description:"إعداد نظام التذاكر" },
  { name:"تذاكر إعدادات",  category:"tickets",    plan:"gold",    description:"تعديل إعدادات نظام التذاكر" },
  { name:"تذاكر معلومات",  category:"tickets",    plan:"gold",    description:"عرض إعدادات وإحصائيات التذاكر" },
  // الرتب
  { name:"reaction-role إعداد",  category:"roles", plan:"silver", description:"ربط إيموجي برتبة على رسالة" },
  { name:"reaction-role حذف",    category:"roles", plan:"silver", description:"حذف ربط إيموجي من رسالة" },
  { name:"reaction-role عرض",    category:"roles", plan:"silver", description:"عرض كل Reaction Roles" },
  { name:"reaction-role مسح",    category:"roles", plan:"silver", description:"مسح كل Reaction Roles على رسالة" },
  { name:"لوحة-رتب إنشاء",       category:"roles", plan:"silver", description:"إنشاء لوحة رتب جديدة" },
  { name:"لوحة-رتب إضافة",       category:"roles", plan:"silver", description:"إضافة زر رتبة للوحة" },
  { name:"لوحة-رتب تعديل",       category:"roles", plan:"silver", description:"تعديل لوحة موجودة" },
  { name:"لوحة-رتب حذف-زر",      category:"roles", plan:"silver", description:"حذف زر رتبة من لوحة" },
  { name:"لوحة-رتب قائمة",       category:"roles", plan:"silver", description:"عرض كل لوحات الرتب" },
  { name:"لوحة-رتب مسح",         category:"roles", plan:"silver", description:"حذف لوحة رتب بالكامل" },
  // XP
  { name:"مستوى",               category:"xp", plan:"silver", description:"عرض بطاقة XP ومستواك" },
  { name:"متصدرين_xp",          category:"xp", plan:"silver", description:"أكثر الأعضاء نشاطاً" },
  { name:"تسطيل_xp اعدادات",    category:"xp", plan:"silver", description:"منع كسب XP في قناة معينة" },
  { name:"تسطيل_xp حالة",       category:"xp", plan:"silver", description:"عرض حالة إعدادات XP" },
  { name:"تسطيل_xp قناة_الصعود",category:"xp", plan:"silver", description:"تحديد قناة رسائل الصعود" },
  { name:"تسطيل_xp مضاعف",      category:"xp", plan:"silver", description:"ضبط مضاعف XP لجميع الأعضاء" },
  // الاقتصاد
  { name:"متجر",     category:"economy", plan:"gold", description:"تصفح المتجر والسيارات والعقارات" },
  { name:"شراء",     category:"economy", plan:"gold", description:"شراء عنصر من المتجر" },
  { name:"بيع",      category:"economy", plan:"gold", description:"بيع عنصر من ممتلكاتك" },
  { name:"رصيد",     category:"economy", plan:"gold", description:"عرض رصيدك وثروتك" },
  { name:"يومي",     category:"economy", plan:"gold", description:"استلام مكافأتك اليومية" },
  { name:"عمل",      category:"economy", plan:"gold", description:"اشتغل واكسب كوينز" },
  { name:"تحويل",    category:"economy", plan:"gold", description:"تحويل كوينز لعضو آخر" },
  { name:"ممتلكاتي", category:"economy", plan:"gold", description:"عرض جميع ممتلكاتك" },
  { name:"متصدرين",  category:"economy", plan:"gold", description:"أغنى الأعضاء" },
  // الفعاليات
  { name:"فعالية إنشاء",  category:"events", plan:"gold", description:"إنشاء فعالية جديدة" },
  { name:"فعالية عرض",    category:"events", plan:"gold", description:"عرض فعالية محددة" },
  { name:"فعالية قائمة",  category:"events", plan:"gold", description:"عرض الفعاليات القادمة" },
  { name:"فعالية إلغاء",  category:"events", plan:"gold", description:"إلغاء فعالية" },
  { name:"فعالية بدء",    category:"events", plan:"gold", description:"تفعيل الفعالية (جارية الآن)" },
  { name:"فعالية إنهاء",  category:"events", plan:"gold", description:"إنهاء فعالية جارية" },
  { name:"فعالية حضور",   category:"events", plan:"gold", description:"قائمة المسجلين في فعالية" },
  { name:"فعالية تذكير",  category:"events", plan:"gold", description:"إرسال تذكير لجميع المسجلين" },
  // الإحصائيات
  { name:"إحصائيات إضافة",  category:"stats", plan:"silver", description:"إضافة قناة إحصائية واحدة" },
  { name:"إحصائيات تلقائي", category:"stats", plan:"silver", description:"إنشاء كل قنوات الإحصائيات تلقائياً" },
  { name:"إحصائيات حالة",   category:"stats", plan:"silver", description:"عرض الإحصائيات الحالية" },
  { name:"إحصائيات حذف",    category:"stats", plan:"silver", description:"حذف قناة إحصائية" },
  { name:"إحصائيات مسح",    category:"stats", plan:"silver", description:"مسح كل قنوات الإحصائيات" },
  { name:"إحصائيات تحديث",  category:"stats", plan:"silver", description:"تحديث كل القنوات يدوياً" },
  // AI
  { name:"ذكاء",   category:"ai", plan:"gold",    description:"سؤال الذكاء الاصطناعي" },
  { name:"اعلان",  category:"ai", plan:"diamond", description:"إغلاق الذاكرة الحالية للـ AI" },
  // المعلومات
  { name:"معلومات", category:"info", plan:"free", description:"معلومات تفصيلية عن عضو" },
  { name:"السيرفر", category:"info", plan:"free", description:"معلومات تفصيلية عن السيرفر" },
  { name:"بوت",     category:"info", plan:"free", description:"معلومات وإحصائيات البوت" },
  { name:"صورة",    category:"info", plan:"free", description:"صورة عضو بجودة عالية" },
  // الإدارة
  { name:"config",   category:"admin", plan:"free", description:"تفعيل أو تعطيل أنظمة السيرفر" },
  { name:"settings", category:"admin", plan:"free", description:"عرض إعدادات وحالة الأنظمة" },
  { name:"مطور",     category:"admin", plan:"free", description:"لوحة تحكم المطور" },
]

const CAT_META = {
  moderation: { label:"الإشراف",           icon:"🛡", color:"#22d3a2", plan:"free"    },
  logs:       { label:"السجلات",            icon:"📋", color:"#00c8ff", plan:"silver"  },
  protection: { label:"الحماية",            icon:"🔒", color:"#f43f5e", plan:"gold"    },
  welcome:    { label:"الترحيب",            icon:"🤝", color:"#00ffe7", plan:"silver"  },
  tickets:    { label:"التذاكر",            icon:"🎫", color:"#a855f7", plan:"gold"    },
  roles:      { label:"الرتب",              icon:"🎭", color:"#fbbf24", plan:"silver"  },
  xp:         { label:"XP والمستويات",     icon:"⭐", color:"#a855f7", plan:"silver"  },
  economy:    { label:"الاقتصاد",           icon:"💰", color:"#fbbf24", plan:"gold"    },
  events:     { label:"الفعاليات",          icon:"🎉", color:"#00ffe7", plan:"gold"    },
  stats:      { label:"الإحصائيات",         icon:"📊", color:"#00c8ff", plan:"silver"  },
  ai:         { label:"الذكاء الاصطناعي",  icon:"🤖", color:"#00c8ff", plan:"gold"    },
  info:       { label:"المعلومات",          icon:"ℹ️", color:"#64748b", plan:"free"    },
  admin:      { label:"الإعدادات",          icon:"⚙️", color:"#64748b", plan:"free"    },
}

const NAV_GROUPS = [
  { label:"الرئيسية",      ids:["overview"] },
  { label:"إدارة السيرفر", ids:["moderation","logs","protection","welcome","tickets","roles"] },
  { label:"الأعضاء",       ids:["xp","economy","events"] },
  { label:"أدوات",          ids:["stats","ai","info","analytics"] },
  { label:"التخصيص",        ids:["admin","prefix"] },
  { label:"الاشتراك",       ids:["subscriptions","payment-requests"] },
]

function authHeaders() {
  const t = localStorage.getItem("session_token")
  return { "Content-Type":"application/json", ...(t?{Authorization:`Bearer ${t}`}:{}) }
}
async function authFetch(url, opts={}) {
  return fetch(url, { ...opts, headers:{ ...authHeaders(), ...opts.headers } })
}

// ══════════════════════════════════════
//  GLOBAL STYLES
// ══════════════════════════════════════
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#030712;--bg2:#080e1c;--bg3:#0d1525;
      --panel:rgba(10,17,35,0.96);--border:rgba(0,200,255,0.12);--border2:rgba(0,200,255,0.36);
      --blue:#00c8ff;--cyan:#00ffe7;--purple:#a855f7;--gold:#fbbf24;
      --red:#f43f5e;--green:#22d3a2;--text:#e2e8f0;--muted:#64748b;
      --glow:0 0 28px rgba(0,200,255,.35),0 0 56px rgba(0,200,255,.1);
      --r:12px;
    }
    html{scroll-behavior:smooth}
    body{background:var(--bg);color:var(--text);font-family:'Tajawal',sans-serif;font-size:15px;min-height:100vh;overflow-x:hidden;direction:rtl}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-track{background:var(--bg2)}
    ::-webkit-scrollbar-thumb{background:linear-gradient(var(--blue),var(--cyan));border-radius:2px}

    .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;
      background-image:linear-gradient(rgba(0,200,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,200,255,.025) 1px,transparent 1px);
      background-size:64px 64px}
    .grid-bg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,200,255,.05),transparent)}

    .card{background:var(--panel);border:1px solid var(--border);border-radius:var(--r);backdrop-filter:blur(20px);position:relative;overflow:hidden;transition:border-color .25s,box-shadow .25s}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--blue),transparent);opacity:.3}
    .card:hover{border-color:var(--border2)}
    .card.glow:hover{box-shadow:var(--glow)}

    .btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px;border:none;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .btn-blue{background:linear-gradient(135deg,#0055bb,#0088ff);color:#fff;box-shadow:0 0 12px rgba(0,136,255,.25)}
    .btn-blue:hover:not(:disabled){box-shadow:0 0 24px rgba(0,136,255,.55);transform:translateY(-2px)}
    .btn-green{background:linear-gradient(135deg,#065f46,#059669);color:#fff}
    .btn-green:hover:not(:disabled){box-shadow:0 0 18px rgba(34,211,162,.4);transform:translateY(-2px)}
    .btn-red{background:linear-gradient(135deg,#991b1b,#f43f5e);color:#fff}
    .btn-red:hover:not(:disabled){box-shadow:0 0 18px rgba(244,63,94,.4);transform:translateY(-2px)}
    .btn-gold{background:linear-gradient(135deg,#92400e,#fbbf24);color:#000}
    .btn-gold:hover:not(:disabled){box-shadow:0 0 18px rgba(251,191,36,.4);transform:translateY(-2px)}
    .btn-ghost{background:rgba(255,255,255,.04);color:var(--muted);border:1px solid var(--border)}
    .btn-ghost:hover:not(:disabled){background:rgba(255,255,255,.08);color:var(--text)}
    .btn-discord{background:linear-gradient(135deg,#4752c4,#5865f2);color:#fff;box-shadow:0 0 20px rgba(88,101,242,.4);font-size:15px;padding:16px 32px;border-radius:12px}
    .btn-discord:hover{box-shadow:0 0 36px rgba(88,101,242,.7);transform:translateY(-3px) scale(1.02)}

    .toggle{position:relative;width:50px;height:26px;background:rgba(0,0,0,.5);border-radius:13px;border:1px solid var(--border);cursor:pointer;transition:all .28s;flex-shrink:0}
    .toggle.on{background:rgba(0,200,255,.18);border-color:var(--blue);box-shadow:0 0 14px rgba(0,200,255,.35)}
    .toggle::after{content:'';position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:var(--muted);transition:all .28s}
    .toggle.on::after{right:27px;background:var(--blue);box-shadow:0 0 8px var(--blue)}
    .toggle.locked{opacity:.35;cursor:not-allowed}

    .tag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700}
    .tag-blue{background:rgba(0,200,255,.1);color:var(--blue);border:1px solid rgba(0,200,255,.25)}
    .tag-green{background:rgba(34,211,162,.1);color:var(--green);border:1px solid rgba(34,211,162,.25)}
    .tag-red{background:rgba(244,63,94,.1);color:var(--red);border:1px solid rgba(244,63,94,.25)}
    .tag-gold{background:rgba(251,191,36,.1);color:var(--gold);border:1px solid rgba(251,191,36,.25)}
    .tag-purple{background:rgba(168,85,247,.1);color:var(--purple);border:1px solid rgba(168,85,247,.25)}
    .tag-cyan{background:rgba(0,255,231,.1);color:var(--cyan);border:1px solid rgba(0,255,231,.25)}
    .tag-muted{background:rgba(100,116,139,.1);color:var(--muted);border:1px solid rgba(100,116,139,.25)}

    .pulse-dot{width:7px;height:7px;border-radius:50%;background:var(--green);position:relative;flex-shrink:0}
    @keyframes pulse-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.7);opacity:0}}
    .pulse-dot::before{content:'';position:absolute;inset:0;border-radius:50%;background:var(--green);animation:pulse-ring 2s infinite}

    .bar-track{height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden}
    .bar-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--blue),var(--cyan));transition:width .7s cubic-bezier(.4,0,.2,1)}

    @keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    .fade-in{animation:fadeIn .4s ease both}

    @keyframes slideIn{from{transform:translateX(-110%)}to{transform:translateX(0)}}
    .notif{position:fixed;bottom:20px;left:20px;z-index:9999;padding:12px 18px;border-radius:10px;display:flex;align-items:center;gap:10px;background:rgba(8,14,28,.98);border:1px solid var(--green);box-shadow:0 0 20px rgba(34,211,162,.25);font-weight:600;font-size:13px;animation:slideIn .3s ease;max-width:360px;font-family:'Tajawal',sans-serif}
    .notif.err{border-color:var(--red);box-shadow:0 0 20px rgba(244,63,94,.25)}

    .sidebar{width:255px;flex-shrink:0;height:100vh;position:sticky;top:0;display:flex;flex-direction:column;background:rgba(4,9,20,.98);border-left:1px solid var(--border);backdrop-filter:blur(24px);overflow-y:auto}
    .nav-item{display:flex;align-items:center;gap:9px;padding:8px 13px;border-radius:8px;color:var(--muted);cursor:pointer;transition:all .18s;font-size:13px;font-weight:500}
    .nav-item:hover{color:var(--text);background:rgba(255,255,255,.03)}
    .nav-item.active{color:var(--blue);background:rgba(0,200,255,.08);border-right:2px solid var(--blue)}
    .section-lbl{font-size:9px;font-weight:700;color:var(--muted);letter-spacing:2px;text-transform:uppercase;padding:0 13px;margin:10px 0 3px}

    .guild-item{display:flex;align-items:center;gap:10px;padding:7px 11px;border-radius:8px;cursor:pointer;transition:all .18s;border:1px solid transparent}
    .guild-item:hover{background:rgba(0,200,255,.04);border-color:var(--border)}
    .guild-item.active{background:rgba(0,200,255,.09);border-color:rgba(0,200,255,.25)}

    input,select,textarea{background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 13px;font-family:'Tajawal',sans-serif;font-size:14px;outline:none;transition:border-color .2s;width:100%;direction:rtl}
    input:focus,select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,200,255,.07)}
    input:disabled{opacity:.4;cursor:not-allowed}

    /* cmd card */
    .cmd-card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px;transition:border-color .2s,box-shadow .2s;position:relative}
    .cmd-card:hover{border-color:var(--border2);box-shadow:0 0 14px rgba(0,200,255,.08)}
    .cmd-card.locked-card{opacity:.55}
    .cmd-card.disabled-card{opacity:.42}

    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}
    .stat-card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px 12px;text-align:center;transition:all .2s}
    .stat-card:hover{border-color:var(--border2);transform:translateY(-2px)}

    .plan-card{border:2px solid var(--border);border-radius:16px;padding:22px;background:var(--panel);transition:all .28s;cursor:pointer;position:relative;overflow:hidden}
    .plan-card:hover{transform:translateY(-5px);border-color:var(--border2)}
    .plan-card.popular{border-color:var(--gold)}
    .plan-card.current-plan{border-color:var(--green)}

    .chart-bar-wrap{display:flex;align-items:center;gap:9px;margin-bottom:8px}
    .chart-bar-bg{flex:1;height:8px;background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden}
    .chart-bar-fill{height:100%;border-radius:4px;transition:width .8s cubic-bezier(.4,0,.2,1)}

    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    .shimmer{background:linear-gradient(90deg,var(--bg3) 25%,rgba(0,200,255,.05) 50%,var(--bg3) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px}

    .prefix-preview{display:inline-flex;align-items:center;background:rgba(0,200,255,.08);border:1px solid rgba(0,200,255,.22);border-radius:5px;padding:3px 9px;font-family:'Orbitron',sans-serif;font-size:11px;color:var(--cyan)}

    .section-lock{padding:14px 18px;border-radius:10px;margin-bottom:20px;background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.22);display:flex;align-items:center;gap:12px}

    .info-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(0,200,255,.03);border-radius:7px;border:1px solid var(--border);margin-bottom:7px}
  `}</style>
)

// ══════════════════════════════════════
//  UTILS
// ══════════════════════════════════════
function Notif({ msg, onClose }) {
  const isErr = msg?.startsWith("❌")
  useEffect(() => {
    if(msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }
  }, [msg, onClose])
  if(!msg) return null
  return (
    <div className={`notif${isErr?" err":""}`}>
      <span style={{color:isErr?"var(--red)":"var(--green)",fontSize:18,flexShrink:0}}>{isErr?"✕":"✓"}</span>
      {msg}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--blue)" strokeWidth="2"
        strokeDasharray="19" strokeDashoffset="7"
        style={{animation:"spin .7s linear infinite",transformOrigin:"center"}}/>
    </svg>
  )
}

function PlanLock({ plan, guildPlan }) {
  if(canUsePlan(guildPlan, plan)) return null
  const p = PLANS.find(x => x.id === plan)
  return (
    <div className="section-lock">
      <span style={{fontSize:24}}>🔒</span>
      <div>
        <div style={{fontWeight:700,color:"var(--gold)",fontSize:14}}>يحتاج خطة {p?.name} أو أعلى</div>
        <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>اشترك لفتح هذه الميزة</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
//  COMMANDS PANEL — القلب الحقيقي
// ══════════════════════════════════════
function CommandsPanel({ guild, guildPlan, category, onNotif }) {
  const [commands, setCommands] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState({})
  const [editing,  setEditing]  = useState(null)
  const [tempName, setTempName] = useState("")
  const [search,   setSearch]   = useState("")
  const canCustomize = canUsePlan(guildPlan, "silver")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await authFetch(`${API}/api/guild/${guild.id}/commands?category=${category}`)
      const d = await r.json()
      if(d.commands) setCommands(d.commands)
    } catch { onNotif("❌ فشل تحميل الأوامر") }
    setLoading(false)
  }, [guild.id, category])

  useEffect(() => { load() }, [load])

  const toggle = async cmd => {
    if(cmd.plan_locked) { onNotif(`🔒 يحتاج خطة ${cmd.plan} أو أعلى`); return }
    const newVal = !cmd.enabled
    setSaving(s => ({...s, [cmd.name]:true}))
    setCommands(prev => prev.map(c => c.name===cmd.name ? {...c,enabled:newVal} : c))
    try {
      const r = await authFetch(`${API}/api/guild/${guild.id}/commands/${encodeURIComponent(cmd.name)}`, {
        method:"PATCH", body:JSON.stringify({ enabled:newVal })
      })
      const d = await r.json()
      if(!d.success) { onNotif(d.error||"❌ فشل"); load() }
      else onNotif(newVal ? `✅ تم تفعيل /${cmd.custom_name||cmd.name}` : `⏹ تم تعطيل /${cmd.custom_name||cmd.name}`)
    } catch { onNotif("❌ خطأ في الاتصال"); load() }
    setSaving(s => ({...s, [cmd.name]:false}))
  }

  const startEdit = cmd => {
    if(!canCustomize) { onNotif("🔒 تغيير الأسماء يحتاج فضي أو أعلى"); return }
    if(cmd.plan_locked) { onNotif(`🔒 يحتاج خطة ${cmd.plan} أو أعلى`); return }
    setEditing(cmd.name); setTempName(cmd.custom_name || "")
  }

  const saveName = async cmd => {
    setEditing(null)
    if(tempName === (cmd.custom_name||"")) return
    setSaving(s => ({...s,[cmd.name]:true}))
    setCommands(prev => prev.map(c => c.name===cmd.name ? {...c,custom_name:tempName||null} : c))
    try {
      const r = await authFetch(`${API}/api/guild/${guild.id}/commands/${encodeURIComponent(cmd.name)}`, {
        method:"PATCH", body:JSON.stringify({ custom_name:tempName||null })
      })
      const d = await r.json()
      if(!d.success) { onNotif(d.error||"❌ فشل"); load() }
      else onNotif(tempName ? `✅ تم تغيير الاسم إلى: /${tempName}` : "✅ تم إعادة الاسم الأصلي")
    } catch { onNotif("❌ خطأ"); load() }
    setSaving(s => ({...s,[cmd.name]:false}))
  }

  const resetName = async cmd => {
    setSaving(s => ({...s,[cmd.name]:true}))
    setCommands(prev => prev.map(c => c.name===cmd.name ? {...c,custom_name:null} : c))
    try {
      await authFetch(`${API}/api/guild/${guild.id}/commands/${encodeURIComponent(cmd.name)}`, {
        method:"PATCH", body:JSON.stringify({ custom_name:null })
      })
      onNotif("✅ تم إعادة الاسم الأصلي")
    } catch { onNotif("❌ خطأ") }
    setSaving(s => ({...s,[cmd.name]:false}))
  }

  const filtered = commands.filter(c =>
    !search || c.name.includes(search) || (c.custom_name||"").includes(search) || c.description.includes(search)
  )

  const enabledCount  = commands.filter(c => c.enabled && !c.plan_locked).length
  const disabledCount = commands.filter(c => !c.enabled && !c.plan_locked).length
  const lockedCount   = commands.filter(c => c.plan_locked).length

  if(loading) return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:11,marginTop:14}}>
      {Array(6).fill(0).map((_,i) => <div key={i} className="shimmer" style={{height:95,borderRadius:10}}/>)}
    </div>
  )

  return (
    <div>
      {/* Summary + Search */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,minWidth:200,position:"relative"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث في الأوامر..."
            style={{paddingRight:36,fontSize:13}}/>
          <span style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--muted)"}}>🔍</span>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          <span className="tag tag-green" style={{fontSize:10}}>✓ {enabledCount} مفعّل</span>
          <span className="tag tag-muted" style={{fontSize:10}}>⏹ {disabledCount} متوقف</span>
          {lockedCount > 0 && <span className="tag tag-gold" style={{fontSize:10}}>🔒 {lockedCount} مقفول</span>}
        </div>
        <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11}} onClick={load}>🔄</button>
      </div>

      {!canCustomize && (
        <div style={{padding:"9px 14px",borderRadius:8,background:"rgba(251,191,36,.05)",
          border:"1px solid rgba(251,191,36,.18)",marginBottom:12,fontSize:12,color:"var(--gold)"}}>
          🔒 تغيير أسماء الأوامر يحتاج خطة فضي أو أعلى
        </div>
      )}

      {!filtered.length && (
        <div style={{textAlign:"center",padding:"28px 0",color:"var(--muted)",fontSize:13}}>
          لا توجد نتائج
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(285px,1fr))",gap:11}}>
        {filtered.map(cmd => {
          const catColor = CAT_META[cmd.category]?.color || "var(--blue)"
          const isEditing = editing === cmd.name
          const isSaving  = saving[cmd.name]
          const planInfo  = PLANS.find(p => p.id === cmd.plan)

          return (
            <div key={cmd.name}
              className={`cmd-card${cmd.plan_locked?" locked-card":""}${!cmd.enabled&&!cmd.plan_locked?" disabled-card":""}`}>

              {/* اسم الأمر */}
              <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:7}}>
                <div style={{flex:1,minWidth:0}}>
                  {isEditing ? (
                    <div style={{display:"flex",gap:5}}>
                      <input value={tempName} onChange={e=>setTempName(e.target.value)}
                        placeholder={cmd.name} autoFocus
                        style={{fontSize:12,padding:"4px 8px",height:28}}
                        onKeyDown={e=>{if(e.key==="Enter")saveName(cmd);if(e.key==="Escape")setEditing(null)}}/>
                      <button className="btn btn-green" style={{padding:"3px 8px",fontSize:10}} onClick={()=>saveName(cmd)}>✓</button>
                      <button className="btn btn-ghost" style={{padding:"3px 8px",fontSize:10}} onClick={()=>setEditing(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <code style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,color:catColor,fontWeight:700}}>
                        /{cmd.custom_name || cmd.name}
                      </code>
                      {cmd.custom_name && (
                        <span style={{fontSize:10,color:"var(--muted)"}}>← /{cmd.name}</span>
                      )}
                    </div>
                  )}
                  <p style={{fontSize:11,color:"var(--muted)",marginTop:4,lineHeight:1.5}}>{cmd.description}</p>
                </div>

                {/* Toggle */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                  {isSaving
                    ? <div style={{width:50,height:26,display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner/></div>
                    : <div className={`toggle${cmd.enabled?" on":""}${cmd.plan_locked?" locked":""}`} onClick={()=>toggle(cmd)}/>
                  }
                  <span style={{fontSize:9,color:cmd.plan_locked?"var(--gold)":cmd.enabled?"var(--green)":"var(--muted)"}}>
                    {cmd.plan_locked ? `🔒 ${planInfo?.name}+` : cmd.enabled ? "مفعّل" : "متوقف"}
                  </span>
                </div>
              </div>

              {/* Footer — أزرار التعديل */}
              {!cmd.plan_locked && !isEditing && (
                <div style={{borderTop:"1px solid var(--border)",paddingTop:7,display:"flex",gap:5,justifyContent:"flex-end"}}>
                  {cmd.custom_name && (
                    <button className="btn btn-ghost" style={{padding:"3px 8px",fontSize:10}}
                      onClick={()=>resetName(cmd)} disabled={isSaving}>
                      ↩ الاسم الأصلي
                    </button>
                  )}
                  <button className="btn btn-ghost" style={{padding:"3px 8px",fontSize:10,color:canCustomize?"var(--blue)":"var(--muted)"}}
                    onClick={()=>startEdit(cmd)} disabled={isSaving}>
                    ✏ {cmd.custom_name?"تعديل":"اسم مخصص"}{!canCustomize?" 🔒":""}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
//  SECTION WRAPPER
// ══════════════════════════════════════
function SectionWrapper({ id, guild, guildPlan, children, requiredPlan="free" }) {
  const meta = CAT_META[id] || { label:id, icon:"⚙️", color:"var(--blue)" }
  const locked = !canUsePlan(guildPlan, requiredPlan)
  return (
    <div className="fade-in">
      <div style={{marginBottom:22}}>
        <div className="tag tag-blue" style={{marginBottom:9,color:meta.color,background:`${meta.color}18`,border:`1px solid ${meta.color}28`}}>
          {meta.icon} {meta.label}
        </div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:24,fontWeight:900}}>{meta.label}</h1>
        {guild && <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>{guild.name}</p>}
      </div>
      {locked
        ? <PlanLock plan={requiredPlan} guildPlan={guildPlan}/>
        : children
      }
    </div>
  )
}

// ══════════════════════════════════════
//  كل قسم بصفحته
// ══════════════════════════════════════
function ModerationSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="moderation" guild={guild} guildPlan={guildPlan} requiredPlan="free">
      <div className="card" style={{padding:18,marginBottom:14,borderColor:"rgba(34,211,162,.2)"}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          جميع أوامر الإشراف متاحة مجاناً. فعّل أو عطّل أي أمر، وغيّر اسمه من هنا (يحتاج فضي+).
          التغييرات تطبق فوراً في البوت.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="moderation" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function LogsSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="logs" guild={guild} guildPlan={guildPlan} requiredPlan="silver">
      <div className="card" style={{padding:18,marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          سجّل كل أحداث السيرفر في قنوات مخصصة. استخدم <code style={{color:"var(--cyan)"}}>/لوق ضبط</code> لتحديد قناة لكل حدث.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="logs" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function ProtectionSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="protection" guild={guild} guildPlan={guildPlan} requiredPlan="gold">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:14}}>
        {[
          {icon:"🛡",name:"Anti-Spam",  color:"var(--red)",   desc:"كشف وإيقاف الرسائل المتكررة"},
          {icon:"🌊",name:"Anti-Raid",  color:"var(--gold)",  desc:"حماية من الانضمام الجماعي المفاجئ"},
          {icon:"💣",name:"Anti-Nuke",  color:"var(--purple)",desc:"منع حذف القنوات والرتب المفاجئ"},
          {icon:"🔒",name:"Lockdown",   color:"var(--blue)",  desc:"قفل السيرفر بالكامل عند الطوارئ"},
        ].map(p => (
          <div key={p.name} className="card glow" style={{padding:16,textAlign:"center"}}>
            <div style={{fontSize:26,marginBottom:7}}>{p.icon}</div>
            <div style={{fontWeight:700,color:p.color,fontSize:13,marginBottom:4}}>{p.name}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{p.desc}</div>
          </div>
        ))}
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="protection" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function WelcomeSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="welcome" guild={guild} guildPlan={guildPlan} requiredPlan="silver">
      <div className="card" style={{padding:18,marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          رحّب بالأعضاء الجدد ووادّع المغادرين. المتغيرات المتاحة:
          <code style={{color:"var(--cyan)",marginRight:6}}>{"{user}"}</code>
          <code style={{color:"var(--cyan)",marginRight:6}}>{"{server}"}</code>
          <code style={{color:"var(--cyan)"}}>{"{count}"}</code>
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="welcome" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function TicketsSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="tickets" guild={guild} guildPlan={guildPlan} requiredPlan="gold">
      <div className="card" style={{padding:18,marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          نظام دعم متكامل — فتح تذاكر خاصة، حفظ المحادثات، إغلاق تلقائي، وتحديد رتبة الدعم.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="tickets" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function RolesSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="roles" guild={guild} guildPlan={guildPlan} requiredPlan="silver">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div className="card" style={{padding:16}}>
          <div style={{fontSize:22,marginBottom:7}}>😀</div>
          <div style={{fontWeight:700,color:"var(--gold)",fontSize:13,marginBottom:4}}>Reaction Roles</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>ربط إيموجي برتبة — الأعضاء يضغطون ليحصلوا على الرتبة</div>
        </div>
        <div className="card" style={{padding:16}}>
          <div style={{fontSize:22,marginBottom:7}}>🔘</div>
          <div style={{fontWeight:700,color:"var(--gold)",fontSize:13,marginBottom:4}}>لوحة الرتب بالأزرار</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>لوحة تفاعلية بأزرار جميلة لاختيار الرتب</div>
        </div>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="roles" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function XPSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="xp" guild={guild} guildPlan={guildPlan} requiredPlan="silver">
      <div className="card" style={{padding:18,marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          تتبع نشاط الأعضاء وامنحهم XP بالرسائل. ضبط المضاعف وقناة الصعود وتعطيل قنوات معينة.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="xp" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function EconomySection({ guild, guildPlan, onNotif }) {
  const [lb, setLB] = useState([])
  const [loadingLB, setLoadingLB] = useState(false)

  const loadLB = useCallback(async () => {
    setLoadingLB(true)
    try {
      const r = await authFetch(`${API}/api/economy/top/${guild.id}`)
      const d = await r.json()
      setLB(Array.isArray(d) ? d : [])
    } catch { setLB([]) }
    setLoadingLB(false)
  }, [guild.id])

  useEffect(() => { if(canUsePlan(guildPlan,"gold")) loadLB() }, [guildPlan, loadLB])

  return (
    <SectionWrapper id="economy" guild={guild} guildPlan={guildPlan} requiredPlan="gold">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
        <div className="card" style={{padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h3 style={{fontSize:13,fontWeight:700,color:"var(--gold)"}}>🏆 المتصدرون</h3>
            <button className="btn btn-ghost" style={{padding:"4px 9px",fontSize:10}} onClick={loadLB}>🔄</button>
          </div>
          {loadingLB && <div style={{color:"var(--muted)",textAlign:"center",padding:14,fontSize:12}}>⏳ تحميل...</div>}
          {!loadingLB && !lb.length && <div style={{color:"var(--muted)",textAlign:"center",padding:14,fontSize:12}}>لا توجد بيانات بعد</div>}
          {!loadingLB && lb.map((u,i) => {
            const max = lb[0]?.coins || 1
            const medals = ["🥇","🥈","🥉"]
            return (
              <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
                <span style={{width:22,textAlign:"center",flexShrink:0}}>
                  {i<3 ? <span style={{fontSize:14}}>{medals[i]}</span>
                       : <span style={{color:"var(--muted)",fontSize:11}}>#{i+1}</span>}
                </span>
                {u.avatar
                  ? <img src={u.avatar} alt="" width={26} height={26} style={{borderRadius:"50%",border:"1px solid var(--border)",flexShrink:0}}/>
                  : <div style={{width:26,height:26,borderRadius:"50%",background:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0}}>{u.username?.[0]?.toUpperCase()}</div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,marginBottom:3}}>{u.username}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{width:`${(u.coins/max)*100}%`,
                      background:i===0?"linear-gradient(90deg,var(--gold),#fde68a)":"linear-gradient(90deg,var(--blue),var(--cyan))"}}/>
                  </div>
                </div>
                <span style={{fontSize:11,fontWeight:700,color:i===0?"var(--gold)":"var(--blue)",flexShrink:0}}>
                  {u.coins?.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
        <div className="card" style={{padding:18}}>
          <h3 style={{fontSize:13,fontWeight:700,color:"var(--gold)",marginBottom:10}}>🌍 نظام التقدم</h3>
          <div style={{fontSize:12,color:"var(--muted)",lineHeight:2.2}}>
            {["🚗 سيارة","🏠 بيت","🛣 شارع","🏘 حي","🏚 قرية","🏙 مدينة","🏛 محافظة","🗺 منطقة","🌍 دولة","🌎 قارة","🌐 العالم"].map((s,i) => (
              <span key={i} style={{display:"inline-flex",gap:3,marginLeft:5}}>
                {s}{i<10&&<span style={{color:"var(--border2)",opacity:.6}}>←</span>}
              </span>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:12,color:"var(--muted)"}}>
            7 قارات = <span style={{color:"var(--gold)",fontWeight:700}}>إعلان عام 🎉</span>
          </div>
        </div>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="economy" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function EventsSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="events" guild={guild} guildPlan={guildPlan} requiredPlan="gold">
      <div className="card" style={{padding:18,marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          أنشئ فعاليات وتتبع الحضور. يدعم الجدولة المسبقة، التذكير التلقائي، وإدارة الحضور.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="events" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function StatsSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="stats" guild={guild} guildPlan={guildPlan} requiredPlan="silver">
      <div className="card" style={{padding:18,marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          قنوات تُحدَّث تلقائياً تعرض إحصائيات السيرفر كعدد الأعضاء والمتصلين والبوتات.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="stats" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function AISection({ guild, guildPlan, settings, onSaveSettings, onNotif }) {
  const plan    = PLANS.find(p => p.id === guildPlan) || PLANS[0]
  const aiLimit = plan.ai_limit || 0
  return (
    <SectionWrapper id="ai" guild={guild} guildPlan={guildPlan} requiredPlan="gold">
      <div className="card" style={{padding:20,marginBottom:14,borderColor:"rgba(0,200,255,.22)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--blue)",marginBottom:5}}>🤖 حد الرسائل اليومي</div>
            <div style={{fontSize:13,color:"var(--muted)"}}>
              خطة <span style={{color:plan.color,fontWeight:700}}>{plan.name}</span> ←
              <span style={{color:"var(--blue)",fontWeight:700}}> {aiLimit} </span>رسالة/يوم
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:30,fontWeight:900,color:"var(--blue)"}}>{aiLimit}</div>
            <div style={{fontSize:10,color:"var(--muted)"}}>رسالة/يوم</div>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <div className="bar-track" style={{height:5}}>
            <div className="bar-fill" style={{width:`${(aiLimit/700)*100}%`}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--muted)",marginTop:3}}>
            <span>0</span><span>700 (ماسي)</span>
          </div>
        </div>
      </div>

      <div className="card" style={{padding:18,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>تفعيل الذكاء الاصطناعي</div>
            <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>البوت يرد عند المنشن</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div className={`toggle${settings?.ai?" on":""}`} onClick={()=>onSaveSettings({...settings,ai:!settings?.ai})}/>
            <span style={{fontSize:9,color:settings?.ai?"var(--green)":"var(--muted)"}}>{settings?.ai?"مفعّل":"متوقف"}</span>
          </div>
        </div>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="ai" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function InfoSection({ guild, guildPlan, onNotif }) {
  return (
    <SectionWrapper id="info" guild={guild} guildPlan={guildPlan} requiredPlan="free">
      <div className="card" style={{padding:18,marginBottom:14}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.8}}>
          أوامر عرض المعلومات متاحة للجميع مجاناً.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="info" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function AdminSection({ guild, guildPlan, settings, onSaveSettings, onNotif }) {
  return (
    <SectionWrapper id="admin" guild={guild} guildPlan={guildPlan} requiredPlan="free">
      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:600,marginBottom:20}}>
        {[
          {key:"ai",     icon:"🤖",label:"الذكاء الاصطناعي",  desc:"البوت يرد على الرسائل تلقائياً بالمنشن", color:"var(--blue)",   plan:"gold"},
          {key:"xp",     icon:"⭐",label:"XP والمستويات",      desc:"تتبع نشاط الأعضاء ومنح XP بالرسائل",     color:"var(--purple)", plan:"silver"},
          {key:"economy",icon:"💰",label:"الاقتصاد",           desc:"عملات ومكافآت يومية ومتجر",              color:"var(--gold)",   plan:"gold"},
        ].map(s => {
          const locked = !canUsePlan(guildPlan, s.plan)
          return (
            <div key={s.key} className="card" style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <div style={{display:"flex",gap:12,flex:1}}>
                  <span style={{fontSize:26,flexShrink:0}}>{s.icon}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:s.color,marginBottom:4,display:"flex",gap:8,alignItems:"center"}}>
                      {s.label}
                      {locked && <span className="tag tag-muted" style={{fontSize:9}}>🔒 {PLANS.find(p=>p.id===s.plan)?.name}+</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>{s.desc}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div className={`toggle${settings?.[s.key]?" on":""}${locked?" locked":""}`}
                    onClick={()=>!locked&&onSaveSettings({...settings,[s.key]:!settings?.[s.key]})}/>
                  <span style={{fontSize:9,color:settings?.[s.key]&&!locked?"var(--green)":"var(--muted)"}}>
                    {locked?"مقفول":settings?.[s.key]?"مفعّل":"متوقف"}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="admin" onNotif={onNotif}/>
    </SectionWrapper>
  )
}

function PrefixSection({ guild, guildPlan, onNotif }) {
  const [prefix,  setPrefix]  = useState("!")
  const [input,   setInput]   = useState("!")
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const canChange = canUsePlan(guildPlan, "silver")

  useEffect(() => {
    authFetch(`${API}/api/guild/${guild.id}/prefix`)
      .then(r=>r.json()).then(d=>{setPrefix(d.prefix||"!");setInput(d.prefix||"!");setLoading(false)})
      .catch(()=>setLoading(false))
  }, [guild.id])

  const save = async () => {
    if(!canChange){onNotif("🔒 البريفكس المخصص يحتاج فضي أو أعلى");return}
    if(!input.trim()){onNotif("⚠ أدخل بريفكس صالح");return}
    setSaving(true)
    try {
      const r = await authFetch(`${API}/api/guild/${guild.id}/prefix`,{method:"POST",body:JSON.stringify({prefix:input.trim()})})
      const d = await r.json()
      if(d.success){setPrefix(d.prefix);onNotif(`✅ تم تغيير البريفكس إلى: ${d.prefix}`)}
      else onNotif(d.error||"❌ فشل")
    } catch { onNotif("❌ خطأ") }
    setSaving(false)
  }

  return (
    <div className="fade-in">
      <div style={{marginBottom:22}}>
        <div className="tag tag-cyan" style={{marginBottom:9}}>🔷 البريفكس</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:24,fontWeight:900}}>البريفكس المخصص</h1>
        {guild && <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>{guild.name}</p>}
      </div>
      <PlanLock plan="silver" guildPlan={guildPlan}/>
      {canChange && (
        <div style={{maxWidth:500}}>
          <div className="card" style={{padding:26,marginBottom:14}}>
            <div style={{marginBottom:20,padding:"12px 16px",background:"rgba(0,200,255,.04)",borderRadius:9,border:"1px solid var(--border)"}}>
              <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>معاينة الأوامر:</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["حظر","طرد","مسح","رصيد","بوت"].map(cmd=>(
                  <span key={cmd} className="prefix-preview">{input||prefix}{cmd}</span>
                ))}
              </div>
            </div>
            <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:7}}>البريفكس الحالي: <code style={{color:"var(--cyan)"}}>{prefix}</code></label>
            <div style={{display:"flex",gap:9}}>
              <input value={input} onChange={e=>setInput(e.target.value)} maxLength={5}
                placeholder="!" disabled={loading}
                style={{flex:1,fontSize:22,fontFamily:"'Orbitron',sans-serif",textAlign:"center",letterSpacing:4}}/>
              <button className="btn btn-blue" onClick={save}
                disabled={saving||input===prefix||loading||!input.trim()} style={{flexShrink:0}}>
                {saving?<><Spinner/> حفظ</>:"💾 حفظ"}
              </button>
            </div>
          </div>
          <div className="card" style={{padding:16}}>
            <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.9}}>
              <div>• البريفكس يُستخدم مع أوامر النص (prefix commands)</div>
              <div>• لا يؤثر على Slash Commands (<code style={{color:"var(--cyan)"}}>/</code>)</div>
              <div>• الحد الأقصى 5 أحرف</div>
              <div>• يُطبَّق فوراً في البوت (كاش 60 ثانية)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsSection({ guild, guildPlan, onNotif }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [days,    setDays]    = useState(30)
  const isAdvanced = canUsePlan(guildPlan, "diamond")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await authFetch(`${API}/api/guild/${guild.id}/analytics?days=${days}`)
      const d = await r.json()
      if(!d.error) setData(d)
    } catch {}
    setLoading(false)
  }, [guild.id, days])

  useEffect(() => { load() }, [load])

  const CAT_LABELS = Object.fromEntries(Object.entries(CAT_META).map(([k,v])=>[k,v.label]))

  return (
    <div className="fade-in">
      <div style={{marginBottom:22}}>
        <div className="tag tag-purple" style={{marginBottom:9}}>📈 الإحصائيات المتقدمة</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:24,fontWeight:900}}>إحصائيات متقدمة</h1>
        {guild && <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>{guild.name}</p>}
      </div>
      <PlanLock plan="diamond" guildPlan={guildPlan}/>
      {!canUsePlan(guildPlan,"diamond") && (
        <div style={{color:"var(--muted)",fontSize:12,marginTop:8}}>
          * الإحصائيات الأساسية متاحة لجميع الخطط، لكن الإحصائيات العالمية وبعض التفاصيل تحتاج خطة ماسي.
        </div>
      )}

      <div style={{display:"flex",gap:9,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
        <button className="btn btn-ghost" style={{padding:"6px 11px",fontSize:11}} onClick={load}>🔄 تحديث</button>
        {[7,14,30,90].map(d=>(
          <button key={d} onClick={()=>setDays(d)}
            className={`btn ${days===d?"btn-blue":"btn-ghost"}`} style={{padding:"6px 11px",fontSize:11}}>
            {d} يوم
          </button>
        ))}
      </div>

      {loading && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12}}>
          {Array(4).fill(0).map((_,i)=><div key={i} className="shimmer" style={{height:75,borderRadius:10}}/>)}
        </div>
      )}

      {!loading && data && (
        <>
          <div className="stats-grid" style={{marginBottom:22}}>
            {[
              {label:"إجمالي الاستخدام",    value:data.total_usage?.toLocaleString()||"0", icon:"⚡",color:"var(--blue)"},
              {label:"الأيام المحللة",        value:days,                                    icon:"📅",color:"var(--cyan)"},
              {label:"أكثر أمر استخداماً",   value:`/${data.top_commands_guild?.[0]?.command||"—"}`, icon:"🏆",color:"var(--gold)"},
              {label:"الفئة الأكثر",         value:CAT_LABELS[data.category_stats?.sort((a,b)=>b.total-a.total)[0]?.category]||"—", icon:"📊",color:"var(--purple)"},
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div style={{fontSize:22,marginBottom:5}}>{s.icon}</div>
                <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
            <div className="card" style={{padding:18}}>
              <h3 style={{fontSize:13,fontWeight:700,color:"var(--gold)",marginBottom:12}}>🏆 أكثر الأوامر استخداماً</h3>
              {!data.top_commands_guild?.length && <div style={{color:"var(--muted)",fontSize:12,textAlign:"center",padding:14}}>لا توجد بيانات بعد</div>}
              {data.top_commands_guild?.map((c,i)=>{
                const max = data.top_commands_guild[0]?.total||1
                const cols=["var(--gold)","#94a3b8","#c47c2b","var(--blue)","var(--cyan)"]
                return (
                  <div key={c.command} className="chart-bar-wrap">
                    <span style={{width:14,fontSize:10,color:cols[i]||"var(--muted)",flexShrink:0}}>#{i+1}</span>
                    <code style={{fontSize:10,color:cols[i]||"var(--muted)",width:90,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>/{c.command}</code>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{width:`${(c.total/max)*100}%`,background:cols[i]||"var(--blue)"}}/>
                    </div>
                    <span style={{fontSize:10,color:"var(--muted)",flexShrink:0,minWidth:24,textAlign:"left"}}>{c.total}</span>
                  </div>
                )
              })}
            </div>

            <div className="card" style={{padding:18}}>
              <h3 style={{fontSize:13,fontWeight:700,color:"var(--blue)",marginBottom:12}}>📊 التوزيع بالفئة</h3>
              {data.category_stats?.sort((a,b)=>b.total-a.total).filter(c=>c.total>0).slice(0,8).map(c=>{
                const max = Math.max(...(data.category_stats||[]).map(x=>x.total),1)
                const color = CAT_META[c.category]?.color||"var(--blue)"
                return (
                  <div key={c.category} className="chart-bar-wrap">
                    <span style={{width:72,fontSize:10,color,flexShrink:0}}>{CAT_LABELS[c.category]||c.category}</span>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{width:`${(c.total/max)*100}%`,background:color}}/>
                    </div>
                    <span style={{fontSize:10,color:"var(--muted)",flexShrink:0,minWidth:20,textAlign:"left"}}>{c.total}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{padding:18,marginBottom:14}}>
            <h3 style={{fontSize:13,fontWeight:700,color:"var(--cyan)",marginBottom:12}}>📅 الاستخدام اليومي (آخر {days} يوم)</h3>
            {!data.daily_usage?.length && <div style={{color:"var(--muted)",fontSize:12,textAlign:"center",padding:14}}>لا توجد بيانات بعد</div>}
            {data.daily_usage?.length > 0 && (() => {
              const maxVal = Math.max(...data.daily_usage.map(d=>d.total),1)
              return (
                <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
                  {data.daily_usage.map((d,i)=>{
                    const h = Math.max(3,(d.total/maxVal)*80)
                    return (
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",cursor:"default"}}
                        title={`${d.date}: ${d.total} أمر`}>
                        <div style={{width:"100%",height:h,background:"linear-gradient(to top,var(--blue),var(--cyan))",
                          borderRadius:"3px 3px 0 0",opacity:.8,transition:"all .3s"}}/>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {isAdvanced && data.top_commands_global?.length > 0 && (
            <div className="card" style={{padding:18,borderColor:"rgba(0,255,231,.18)"}}>
              <h3 style={{fontSize:13,fontWeight:700,color:"var(--cyan)",marginBottom:12}}>💎 الإحصائيات العالمية (ماسي حصري)</h3>
              {data.top_commands_global.map((c,i)=>{
                const max = data.top_commands_global[0]?.count||1
                return (
                  <div key={c.command} className="chart-bar-wrap">
                    <span style={{width:14,fontSize:10,color:"var(--cyan)",flexShrink:0}}>#{i+1}</span>
                    <code style={{fontSize:10,color:"var(--cyan)",width:90,flexShrink:0}}>/{c.command}</code>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{width:`${(c.count/max)*100}%`,background:"var(--cyan)"}}/>
                    </div>
                    <span style={{fontSize:10,color:"var(--muted)",flexShrink:0}}>{c.count?.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OverviewSection({ guild, guildPlan, settings, onSection }) {
  const plan = PLANS.find(p=>p.id===guildPlan)||PLANS[0]
  const [unlinking, setUnlinking] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [notif, setNotif] = useState("")
  const isLinked = guildPlan !== "free"

  const handleUnlink = async () => {
    setUnlinking(true)
    try {
      const r = await authFetch(`${API}/api/guild/${guild.id}/link`, { method: "DELETE" })
      const d = await r.json()
      if (d.success) {
        setNotif("✅ تم فك ربط السيرفر بنجاح. أعد تحميل الصفحة.")
        setConfirmUnlink(false)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setNotif("❌ " + (d.error || "فشل فك الربط"))
      }
    } catch {
      setNotif("❌ خطأ في الاتصال")
    }
    setUnlinking(false)
  }

  const quickBtns = [
    {id:"moderation",icon:"🛡",label:"الإشراف",   color:"var(--green)"},
    {id:"logs",      icon:"📋",label:"السجلات",   color:"var(--blue)"},
    {id:"protection",icon:"🔒",label:"الحماية",   color:"var(--red)"},
    {id:"welcome",   icon:"🤝",label:"الترحيب",   color:"var(--cyan)"},
    {id:"tickets",   icon:"🎫",label:"التذاكر",   color:"var(--purple)"},
    {id:"economy",   icon:"💰",label:"الاقتصاد",  color:"var(--gold)"},
    {id:"xp",        icon:"⭐",label:"XP",         color:"var(--purple)"},
    {id:"ai",        icon:"🤖",label:"الذكاء",    color:"var(--blue)"},
  ]
  return (
    <div className="fade-in">
      {notif && (
        <div className="card" style={{padding:12,marginBottom:14,background:notif.startsWith("✅")?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",borderColor:notif.startsWith("✅")?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}}>
          <div style={{fontSize:13,fontWeight:600}}>{notif}</div>
        </div>
      )}

      <div style={{marginBottom:22}}>
        <div className="tag tag-blue" style={{marginBottom:9}}>لوحة التحكم</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:24,fontWeight:900}}>{guild.name}</h1>
        <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>
          خطة <span style={{color:plan.color,fontWeight:700}}>{plan.icon} {plan.name}</span>
          {plan.ai_limit>0 && <span style={{marginRight:10,color:"var(--blue)"}}>• AI: {plan.ai_limit} رسالة/يوم</span>}
        </p>
      </div>

      {isLinked && (
        <div className="card" style={{padding:16,marginBottom:22,borderColor:"rgba(239,68,68,.2)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>🔗 حالة الربط</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>هذا السيرفر مربوط باشتراكك الحالي</div>
            </div>
            {!confirmUnlink ? (
              <button
                onClick={()=>setConfirmUnlink(true)}
                style={{padding:"8px 14px",background:"rgba(239,68,68,.1)",color:"var(--red)",border:"1px solid rgba(239,68,68,.3)",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}
              >
                🔓 فك الربط
              </button>
            ) : (
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:11,color:"var(--muted)"}}>متأكد؟</span>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  style={{padding:"7px 12px",background:"var(--red)",color:"#fff",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:unlinking?"wait":"pointer",opacity:unlinking?.6:1}}
                >
                  {unlinking?"...جاري":"✓ نعم، فك"}
                </button>
                <button
                  onClick={()=>setConfirmUnlink(false)}
                  disabled={unlinking}
                  style={{padding:"7px 12px",background:"transparent",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="stats-grid" style={{marginBottom:22}}>
        {[
          {label:"الأنظمة النشطة",    value:`${[settings?.ai,settings?.xp,settings?.economy].filter(Boolean).length}/3`, icon:"⚡",color:"var(--blue)"},
          {label:"الذكاء الاصطناعي", value:settings?.ai?"مفعّل":"متوقف",  icon:"🤖",color:settings?.ai?"var(--green)":"var(--red)"},
          {label:"نظام XP",           value:settings?.xp?"مفعّل":"متوقف",  icon:"⭐",color:settings?.xp?"var(--green)":"var(--red)"},
          {label:"الاقتصاد",          value:settings?.economy?"مفعّل":"متوقف", icon:"💰",color:settings?.economy?"var(--green)":"var(--red)"},
        ].map(s=>(
          <div key={s.label} className="card">
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:22,width:40,height:40,background:"rgba(88,101,242,.1)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{s.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:"var(--muted)",marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:15,fontWeight:800,color:s.color}}>{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{padding:18}}>
        <h3 style={{fontSize:15,fontWeight:800,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <span>⚡</span> وصول سريع
        </h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10}}>
          {quickBtns.map(b=>(
            <button
              key={b.id}
              onClick={()=>onSection(b.id)}
              style={{padding:"14px 10px",background:"rgba(255,255,255,.02)",border:"1px solid var(--border)",borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,color:"var(--text)",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.borderColor=b.color}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.02)";e.currentTarget.style.borderColor="var(--border)"}}
            >
              <div style={{fontSize:22,color:b.color}}>{b.icon}</div>
              <div style={{fontSize:11,fontWeight:700}}>{b.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SubscriptionsSection({ userId, userSubscription, onNotif, onRefresh }) {
  const [step, setStep] = useState("plans")
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [refNumber, setRefNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const activePlanId = userSubscription?.status==="active" ? userSubscription.plan_id : "free"
  const isActive = userSubscription?.status === "active"

  const handleSelect = plan => {
    if(plan.id==="free") return
    if(plan.id===activePlanId&&isActive){onNotif("هذه خطتك الحالية");return}
    setSelectedPlan(plan); setRefNumber(""); setStep("payment")
  }

  const handleSubmit = async () => {
    if(!refNumber.trim()){onNotif("⚠ أدخل رقم العملية");return}
    setSubmitting(true)
    try {
      const r = await authFetch(`${API}/api/payment-requests`,{method:"POST",body:JSON.stringify({planId:selectedPlan.id,refNumber:refNumber.trim()})})
      const d = await r.json()
      if(d.success){setStep("done");onRefresh?.()}
      else onNotif(d.error||"حدث خطأ")
    } catch { onNotif("❌ خطأ في الاتصال") }
    setSubmitting(false)
  }

  if(step==="done") return (
    <div className="fade-in" style={{textAlign:"center",maxWidth:480,margin:"0 auto",padding:"60px 20px"}}>
      <div style={{fontSize:60,marginBottom:18}}>✅</div>
      <h2 style={{fontSize:22,fontWeight:900,marginBottom:10}}>تم إرسال الطلب!</h2>
      <p style={{color:"var(--muted)",lineHeight:1.8,marginBottom:26}}>سيتم مراجعة طلبك خلال 24 ساعة وتفعيل الاشتراك. شكراً! 🙏</p>
      <button className="btn btn-blue" onClick={()=>{setStep("plans");setRefNumber("")}}>← العودة للخطط</button>
    </div>
  )

  if(step==="payment") return (
    <div className="fade-in" style={{maxWidth:580,margin:"0 auto"}}>
      <button onClick={()=>setStep("plans")} style={{background:"none",border:"none",color:"var(--blue)",cursor:"pointer",fontSize:14,marginBottom:18,display:"flex",alignItems:"center",gap:6,fontFamily:"'Tajawal',sans-serif"}}>← رجوع</button>
      <div className="card" style={{padding:26}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <span style={{fontSize:36}}>{selectedPlan?.icon}</span>
          <div>
            <h2 style={{fontSize:18,fontWeight:900}}>خطة {selectedPlan?.name}</h2>
            <div style={{fontSize:24,fontWeight:900,color:selectedPlan?.color}}>
              {selectedPlan?.price} <span style={{fontSize:12,color:"var(--muted)",fontWeight:400}}>ريال/شهر</span>
            </div>
          </div>
        </div>
        <div style={{background:"rgba(0,200,255,.04)",borderRadius:10,padding:16,marginBottom:20,border:"1px solid var(--border)"}}>
          <h3 style={{fontSize:13,fontWeight:700,color:"var(--cyan)",marginBottom:12}}>💳 معلومات التحويل</h3>
          {[["البنك",BANK_INFO.bank],["اسم الحساب",BANK_INFO.accountName],["رقم الحساب",BANK_INFO.accountNumber],["IBAN",BANK_INFO.iban],["Apple Pay",BANK_INFO.applePay]].map(([k,v])=>(
            <div key={k} className="info-row">
              <span style={{color:"var(--muted)",fontSize:13}}>{k}</span>
              <span style={{fontWeight:700,fontSize:13,fontFamily:k==="IBAN"||k==="رقم الحساب"?"monospace":"inherit"}}>{v}</span>
            </div>
          ))}
        </div>
        <h3 style={{fontSize:13,fontWeight:700,marginBottom:7}}>📩 أدخل رقم العملية بعد التحويل:</h3>
        <input type="text" placeholder="مثال: 1234567890" value={refNumber} onChange={e=>setRefNumber(e.target.value)} style={{marginBottom:9}}/>
        <div style={{fontSize:11,color:"var(--muted)",padding:"8px 12px",background:"rgba(251,191,36,.05)",borderRadius:7,border:"1px solid rgba(251,191,36,.18)",marginBottom:16}}>
          ⚠️ تأكد من إرسال {selectedPlan?.price} ريال. سيتم التحقق خلال 24 ساعة.
        </div>
        <button className="btn btn-gold" onClick={handleSubmit} disabled={submitting||!refNumber.trim()} style={{width:"100%",justifyContent:"center",fontSize:14,padding:"12px 0"}}>
          {submitting?<><Spinner/> جاري الإرسال...</>:"✅ تأكيد وإرسال الطلب"}
        </button>
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      <div style={{marginBottom:22}}>
        <div className="tag tag-gold" style={{marginBottom:9}}>👑 الاشتراكات</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:24,fontWeight:900}}>خطط الأسعار</h1>
        <p style={{color:"var(--muted)",fontSize:12,marginTop:4}}>اختر الخطة المناسبة لمجتمعك</p>
      </div>
      {isActive && (
        <div className="card" style={{padding:16,marginBottom:22,borderColor:"var(--green)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:26}}>👑</span>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>اشتراكك الحالي: <span style={{color:"var(--gold)"}}>{PLANS.find(p=>p.id===activePlanId)?.name}</span></div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>ينتهي: {userSubscription?.expires_at?new Date(userSubscription.expires_at).toLocaleDateString("ar-SA"):"غير محدد"}</div>
            </div>
            <span className="tag tag-green" style={{marginRight:"auto"}}>✓ مفعّل</span>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginBottom:36}}>
        {PLANS.map(plan=>{
          const isCurrent = plan.id===activePlanId&&isActive
          return (
            <div key={plan.id} className={`plan-card${plan.popular?" popular":""}${isCurrent?" current-plan":""}`} onClick={()=>handleSelect(plan)}>
              {plan.popular&&<div style={{position:"absolute",top:-1,right:16,padding:"2px 10px",borderRadius:"0 0 8px 8px",background:"linear-gradient(135deg,#92400e,#fbbf24)",color:"#000",fontSize:9,fontWeight:700,letterSpacing:1}}>⭐ الأكثر طلباً</div>}
              {isCurrent&&<div style={{position:"absolute",top:-1,right:16,padding:"2px 10px",borderRadius:"0 0 8px 8px",background:"linear-gradient(135deg,#065f46,#22d3a2)",color:"#000",fontSize:9,fontWeight:700}}>✓ خطتك</div>}
              <div style={{fontSize:34,marginBottom:10,textAlign:"center"}}>{plan.icon}</div>
              <div style={{fontSize:16,fontWeight:900,color:plan.color,marginBottom:7,textAlign:"center"}}>{plan.name}</div>
              <div style={{textAlign:"center",marginBottom:14}}>
                {plan.price===0 ? <span style={{fontSize:22,fontWeight:900}}>مجاني</span>
                  : <><span style={{fontSize:28,fontWeight:900,color:plan.color}}>{plan.price}</span><span style={{fontSize:11,color:"var(--muted)"}}> ريال/شهر</span></>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                {plan.features.map(f=>(
                  <div key={f} style={{display:"flex",gap:6,alignItems:"flex-start",fontSize:12}}>
                    <span style={{color:"var(--green)",flexShrink:0,marginTop:2,fontSize:10}}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              {plan.id!=="free"&&!isCurrent&&(
                <button className="btn btn-blue" style={{width:"100%",justifyContent:"center",
                  background:`linear-gradient(135deg,${plan.color}88,${plan.color})`,
                  color:plan.id==="gold"?"#000":"#fff",fontSize:12,padding:"9px 0"}}>
                  اشترك الآن
                </button>
              )}
              {isCurrent&&<div style={{textAlign:"center",color:"var(--green)",fontWeight:700,padding:"7px 0",fontSize:12}}>✓ مفعّل حالياً</div>}
              {plan.id==="free"&&!isCurrent&&<div style={{textAlign:"center",color:"var(--muted)",fontSize:12,padding:"7px 0"}}>خطتك الافتراضية</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminPaymentRequests({ onNotif }) {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState("pending")
  const si = { pending:{label:"قيد المراجعة",cls:"tag-gold"}, approved:{label:"مفعّل",cls:"tag-green"}, rejected:{label:"مرفوض",cls:"tag-red"} }
  const load = async () => {
    setLoading(true)
    try { const r=await authFetch(`${API}/api/admin/payment-requests`); setRequests(await r.json()) }
    catch { setRequests([]) }
    setLoading(false)
  }
  useEffect(()=>{load()},[])
  const action = async (id, act) => {
    try {
      const r=await authFetch(`${API}/api/admin/payment-requests/${id}/${act}`,{method:"POST"})
      const d=await r.json()
      if(d.success){onNotif(act==="approve"?"✅ تم التفعيل":"❌ تم الرفض");load()}
      else onNotif(d.error||"حدث خطأ")
    } catch { onNotif("خطأ") }
  }
  const filtered = requests.filter(r => filter==="all" || r.status===filter)
  const pending  = requests.filter(r => r.status==="pending").length
  return (
    <div className="fade-in">
      <div style={{marginBottom:22}}>
        <div className="tag tag-red" style={{marginBottom:9}}>🔐 الإدارة</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:24,fontWeight:900}}>
          طلبات الدفع {pending>0&&<span style={{marginRight:10,background:"var(--red)",color:"#fff",fontSize:11,padding:"2px 10px",borderRadius:20}}>{pending} جديد</span>}
        </h1>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        <button className="btn btn-blue" style={{padding:"6px 12px",fontSize:11}} onClick={load}>🔄 تحديث</button>
        {["all","pending","approved","rejected"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`btn ${filter===f?"btn-blue":"btn-ghost"}`} style={{padding:"6px 12px",fontSize:11}}>
            {f==="all"?"الكل":si[f]?.label}
            {f!=="all"&&<span style={{opacity:.65}}> ({requests.filter(r=>r.status===f).length})</span>}
          </button>
        ))}
      </div>
      {loading && <div style={{color:"var(--muted)",padding:26,textAlign:"center"}}>⏳ جاري التحميل...</div>}
      {!loading && !filtered.length && (
        <div className="card" style={{padding:40,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:10,opacity:.3}}>📭</div>
          <p style={{color:"var(--muted)"}}>لا توجد طلبات</p>
        </div>
      )}
      {!loading && filtered.map(req=>{
        const plan = PLANS.find(p=>p.id===req.plan_id)
        const s    = si[req.status]||{label:req.status,cls:"tag-blue"}
        return (
          <div key={req.id} className="card" style={{padding:"16px 20px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:12}}>
                <span style={{fontSize:26}}>{plan?.icon||"💳"}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:2,color:"var(--cyan)",fontFamily:"monospace"}}>{req.user_id}</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:2}}>الخطة: <span style={{color:plan?.color}}>{plan?.name}</span> — {plan?.price} ريال</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>رقم العملية: <code style={{color:"var(--text)",fontWeight:600}}>{req.ref_number}</code></div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{new Date(req.created_at).toLocaleDateString("ar-SA")} {new Date(req.created_at).toLocaleTimeString("ar-SA")}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
                <span className={`tag ${s.cls}`}>{s.label}</span>
                {req.status==="pending" && (
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn btn-green" style={{padding:"5px 11px",fontSize:11}} onClick={()=>action(req.id,"approve")}>✅ تفعيل</button>
                    <button className="btn btn-red"   style={{padding:"5px 11px",fontSize:11}} onClick={()=>action(req.id,"reject")}>❌ رفض</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════
//  HOME
// ══════════════════════════════════════
function Home() {
  const login = () => {
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`
  }
  const features = [
    {icon:"🤖",label:"ذكاء اصطناعي",    desc:"ردود ذكية متقدمة",            color:"var(--blue)"},
    {icon:"⭐", label:"نظام XP",          desc:"مستويات وتطور",               color:"var(--purple)"},
    {icon:"💰", label:"الاقتصاد",         desc:"عملات وسوق متكامل",          color:"var(--gold)"},
    {icon:"🛡", label:"الإشراف",          desc:"حماية السيرفر",              color:"var(--green)"},
    {icon:"⚙️", label:"86 أمر",           desc:"تحكم كامل بكل أمر",          color:"var(--cyan)"},
    {icon:"🔒", label:"خطط مميزة",        desc:"ميزات حصرية للمشتركين",      color:"var(--red)"},
  ]
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",position:"relative"}}>
      <div className="grid-bg"/>
      <div className="fade-in" style={{position:"relative",zIndex:2,textAlign:"center",marginBottom:12}}>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(28px,7vw,64px)",fontWeight:900,letterSpacing:"4px",lineHeight:1,
          background:"linear-gradient(135deg,#fff 0%,var(--blue) 50%,var(--cyan) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          LYN CONTROL
        </h1>
        <p style={{color:"var(--muted)",fontSize:14,marginTop:9}}>لوحة تحكم بوت Lyn — 86 أمر تحت سيطرتك</p>
      </div>
      <p style={{maxWidth:420,textAlign:"center",color:"var(--muted)",fontSize:14,lineHeight:1.8,marginBottom:36,position:"relative",zIndex:2}}>
        فعّل وعطّل أي أمر، غيّر اسمه لأي سيرفر، واضبط البريفكس والإعدادات من مكان واحد.
      </p>
      <div style={{position:"relative",zIndex:2,marginBottom:48}}>
        <button className="btn btn-discord" onClick={login}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.085.12 18.11.144 18.13a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          تسجيل الدخول بـ Discord
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:11,maxWidth:820,width:"100%",position:"relative",zIndex:2}}>
        {features.map(f=>(
          <div key={f.label} className="card glow" style={{padding:"16px 12px",textAlign:"center"}}>
            <div style={{fontSize:26,marginBottom:8}}>{f.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:f.color,marginBottom:3}}>{f.label}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
//  CALLBACK
// ══════════════════════════════════════
function Callback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState("جاري التحقق...")
  const ran = useRef(false)
  useEffect(() => {
    if(ran.current) return; ran.current = true
    const code = new URLSearchParams(window.location.search).get("code")
    if(!code){navigate("/");return}
    ;(async()=>{
      try {
        setStatus("جاري الاتصال بـ Discord...")
        const r = await fetch(`${API}/api/auth/callback?code=${code}`)
        const d = await r.json()
        if(!d?.user||!d?.token) throw new Error("فشل")
        setStatus("جاري تحميل البيانات...")
        localStorage.setItem("session_token", d.token)
        localStorage.setItem("user",   JSON.stringify(d.user))
        localStorage.setItem("guilds", JSON.stringify(d.guilds||[]))
        setTimeout(()=>navigate("/dashboard"), 600)
      } catch {
        setStatus("فشل تسجيل الدخول، جاري الإعادة...")
        setTimeout(()=>navigate("/"), 2000)
      }
    })()
  }, [navigate])
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="grid-bg"/>
      <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
        <div style={{width:60,height:60,margin:"0 auto 22px"}}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(0,200,255,.1)" strokeWidth="4"/>
            <circle cx="30" cy="30" r="26" fill="none" stroke="var(--blue)" strokeWidth="4"
              strokeDasharray="163" strokeDashoffset="120" strokeLinecap="round"
              style={{animation:"spin 1.4s linear infinite",transformOrigin:"center"}}/>
          </svg>
        </div>
        <p style={{fontSize:14,color:"var(--blue)"}}>{status}</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
//  BOT NOT IN GUILD — شاشة إضافة البوت
// ══════════════════════════════════════
function BotNotInGuild({guild, inviteUrl}) {
  const fullInvite = `${inviteUrl}&guild_id=${guild.id}&disable_guild_select=true`
  return (
    <div className="fade-in" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"75vh",textAlign:"center",gap:22,padding:"30px 20px"}}>

      {/* Server icon with warning badge */}
      <div style={{position:"relative"}}>
        {guild.icon ? (
          <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`}
            alt="" width={100} height={100}
            style={{borderRadius:24,border:"3px solid rgba(251,191,36,.4)",boxShadow:"0 0 32px rgba(251,191,36,.22)"}}/>
        ) : (
          <div style={{width:100,height:100,borderRadius:24,background:"var(--bg3)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,
            color:"var(--gold)",fontWeight:900,border:"3px solid rgba(251,191,36,.4)"}}>
            {guild.name.slice(0,2)}
          </div>
        )}
        <div style={{position:"absolute",bottom:-10,right:-10,width:38,height:38,borderRadius:"50%",
          background:"var(--bg2)",border:"3px solid var(--gold)",display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:18,boxShadow:"0 0 18px rgba(251,191,36,.4)"}}>⚠</div>
      </div>

      <div style={{maxWidth:500}}>
        <div className="tag tag-gold" style={{marginBottom:13,fontSize:11}}>⚠ البوت غير موجود</div>
        <h2 style={{fontSize:28,fontWeight:900,marginBottom:12,fontFamily:"'Tajawal',sans-serif"}}>{guild.name}</h2>
        <p style={{color:"var(--muted)",fontSize:14,lineHeight:1.9,marginBottom:30}}>
          البوت <strong style={{color:"var(--blue)"}}>Lyn</strong> غير مضاف لهذا السيرفر بعد.
          <br/>
          أضفه الآن لتستفيد من <strong style={{color:"var(--cyan)"}}>86 أمر</strong> والتحكم الكامل من الداشبورد.
        </p>

        <a href={fullInvite} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
          <button className="btn btn-discord" style={{fontSize:15,padding:"16px 34px"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.085.12 18.11.144 18.13a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            أضف البوت لـ {guild.name}
          </button>
        </a>

        <div style={{marginTop:16}}>
          <button className="btn btn-ghost" style={{padding:"9px 20px",fontSize:12}} onClick={()=>window.location.reload()}>
            🔄 لقد أضفت البوت — تحقق الآن
          </button>
        </div>

        <div style={{marginTop:26,padding:"13px 17px",background:"rgba(0,200,255,.04)",
          borderRadius:10,border:"1px solid var(--border)",fontSize:12,color:"var(--muted)",lineHeight:1.8}}>
          💡 سيفتح Discord في نافذة جديدة. بعد إضافة البوت، اضغط "تحقق الآن" أو أعد تحميل الصفحة.
        </div>
      </div>

      {/* Features preview */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,maxWidth:580,width:"100%",marginTop:14}}>
        {[
          {icon:"🛡",label:"15 أمر إشراف",color:"var(--green)"},
          {icon:"🤖",label:"ذكاء اصطناعي",color:"var(--blue)"},
          {icon:"💰",label:"نظام اقتصاد",color:"var(--gold)"},
          {icon:"🎫",label:"نظام تذاكر",color:"var(--purple)"},
          {icon:"⭐",label:"XP ومستويات",color:"var(--purple)"},
          {icon:"🔒",label:"حماية كاملة",color:"var(--red)"},
        ].map(f=>(
          <div key={f.label} className="card" style={{padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:5}}>{f.icon}</div>
            <div style={{fontSize:11,fontWeight:700,color:f.color}}>{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
function Dashboard() {
  const navigate = useNavigate()
  const [activeSection,  setActiveSection]  = useState("overview")
  const [selectedGuild,  setSelectedGuild]  = useState(null)
  const [settings,       setSettings]       = useState({ai:true,xp:true,economy:true})
  const [notif,          setNotif]          = useState("")
  const [saving,         setSaving]         = useState(false)
  const [userSubscription, setUserSub]      = useState(null)
  const [guildPlan,      setGuildPlan]      = useState("free")
  const [botGuilds, setBotGuilds] = useState([])
  const [loadingBotGuilds, setLoadingBotGuilds] = useState(true)

  let user=null, guilds=[]
  try { user=JSON.parse(localStorage.getItem("user")) } catch {}
  try { guilds=JSON.parse(localStorage.getItem("guilds"))||[] } catch {}
  const token   = localStorage.getItem("session_token")
  const isOwner = user?.id === OWNER_ID

  useEffect(()=>{if(!user||!token) navigate("/")},[user,token,navigate])

  const fetchSub = () => {
    if(!user?.id) return
    authFetch(`${API}/api/subscription/${user.id}`)
      .then(r=>r.json()).then(d=>{if(!d.error)setUserSub(d)}).catch(()=>{})
  }
  useEffect(()=>{fetchSub()},[user?.id])

  // جلب قائمة سيرفرات البوت
  const fetchBotGuilds = useCallback(() => {
    setLoadingBotGuilds(true)
    fetch(`${API}/api/bot/guilds`)
      .then(r => r.json())
      .then(d => { if(Array.isArray(d)) setBotGuilds(d) })
      .catch(()=>{})
      .finally(()=>setLoadingBotGuilds(false))
  }, [])

  useEffect(() => { fetchBotGuilds() }, [fetchBotGuilds])

  const selectGuild = async g => {
    setSelectedGuild(g); setActiveSection("overview")

    // لو البوت مو موجود في السيرفر → لا تحمل أي بيانات
    if (!botGuilds.includes(g.id)) return

    try {
      await authFetch(`${API}/api/guild/save`,{method:"POST",body:JSON.stringify({guildId:g.id})})
      const [sr,pr] = await Promise.all([
        authFetch(`${API}/api/guild/${g.id}/settings`),
        authFetch(`${API}/api/guild/${g.id}/plan`),
      ])
      const sd=await sr.json(); const pd=await pr.json()
      if(sd&&!sd.error) setSettings({ai:sd.ai??true,xp:sd.xp??true,economy:sd.economy??true})
      setGuildPlan(pd.plan_id||"free")
    } catch {}
  }

  const saveSettings = async newS => {
    setSettings(newS); setSaving(true)
    try {
      await authFetch(`${API}/api/guild/${selectedGuild.id}/settings`,{method:"POST",body:JSON.stringify(newS)})
      setNotif("✅ تم حفظ الإعدادات")
    } catch { setNotif("❌ خطأ في الحفظ") }
    setSaving(false)
  }

  const logout = () => { localStorage.clear(); navigate("/") }

  const currentPlan = PLANS.find(p=>p.id===(userSubscription?.status==="active"?userSubscription.plan_id:"free"))||PLANS[0]

  const renderSection = () => {
    if(!selectedGuild && !["subscriptions","payment-requests"].includes(activeSection)) return (
      <div className="fade-in" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",textAlign:"center",gap:16}}>
        <div style={{fontSize:64,opacity:.2}}>🌐</div>
        <h2 style={{fontSize:20,fontWeight:900,color:"var(--muted)"}}>اختر سيرفراً</h2>
        <p style={{color:"var(--muted)",maxWidth:300,fontSize:13}}>اختر سيرفراً من القائمة الجانبية لعرض لوحة التحكم</p>
      </div>
    )

    // ✅ البوت مو موجود في السيرفر → اعرض صفحة الدعوة
    if (selectedGuild && !botGuilds.includes(selectedGuild.id) && !["subscriptions","payment-requests"].includes(activeSection)) {
      return <BotNotInGuild guild={selectedGuild} inviteUrl={BOT_INVITE_URL}/>
    }

    const p = { guild:selectedGuild, guildPlan, onNotif:setNotif }
    switch(activeSection) {
      case "overview":          return <OverviewSection {...p} settings={settings} onSection={setActiveSection}/>
      case "moderation":        return <ModerationSection {...p}/>
      case "logs":              return <LogsSection {...p}/>
      case "protection":        return <ProtectionSection {...p}/>
      case "welcome":           return <WelcomeSection {...p}/>
      case "tickets":           return <TicketsSection {...p}/>
      case "roles":             return <RolesSection {...p}/>
      case "xp":                return <XPSection {...p}/>
      case "economy":           return <EconomySection {...p}/>
      case "events":            return <EventsSection {...p}/>
      case "stats":             return <StatsSection {...p}/>
      case "ai":                return <AISection {...p} settings={settings} onSaveSettings={saveSettings}/>
      case "info":              return <InfoSection {...p}/>
      case "analytics":         return <AnalyticsSection {...p}/>
      case "admin":             return <AdminSection {...p} settings={settings} onSaveSettings={saveSettings}/>
      case "prefix":            return <PrefixSection {...p}/>
      case "subscriptions":     return <SubscriptionsSection userId={user?.id} userSubscription={userSubscription} onNotif={setNotif} onRefresh={fetchSub}/>
      case "payment-requests":  return isOwner ? <AdminPaymentRequests onNotif={setNotif}/> : null
      default:                  return null
    }
  }

  return (
    <div style={{display:"flex",minHeight:"100vh",position:"relative"}}>
      <div className="grid-bg"/>
      <Notif msg={notif} onClose={()=>setNotif("")}/>

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar" style={{zIndex:10,order:2}}>
        {/* Logo */}
        <div style={{padding:"15px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:900,color:"var(--blue)",letterSpacing:3}}>LYN</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:"var(--muted)",letterSpacing:3}}>CONTROL v5.1</div>
          </div>
          <div className="pulse-dot" style={{width:6,height:6}}/>
        </div>

        {/* User */}
        <div style={{padding:"9px 13px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
          {user?.avatar
            ? <img src={user.avatar} alt="" width={30} height={30} style={{borderRadius:"50%",border:"2px solid var(--blue)",flexShrink:0}}/>
            : <div style={{width:30,height:30,borderRadius:"50%",background:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--blue)",color:"var(--blue)",fontWeight:700,flexShrink:0,fontSize:13}}>{user?.username?.[0]?.toUpperCase()}</div>
          }
          <div style={{overflow:"hidden",flex:1}}>
            <div style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.username}</div>
            <div style={{display:"flex",gap:3,marginTop:2,flexWrap:"wrap"}}>
              <span className="tag tag-green" style={{fontSize:8,padding:"1px 5px"}}><div className="pulse-dot" style={{width:4,height:4}}/> مدير</span>
              {isOwner&&<span className="tag tag-red" style={{fontSize:8,padding:"1px 5px"}}>👑 مالك</span>}
              <span className="tag" style={{fontSize:8,padding:"1px 5px",color:currentPlan.color,background:`${currentPlan.color}15`,border:`1px solid ${currentPlan.color}28`}}>
                {currentPlan.icon} {currentPlan.name}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{flex:1,overflowY:"auto",padding:"5px 7px"}}>
          {NAV_GROUPS.map(group => {
            const visibleItems = group.ids
              .filter(id => id !== "payment-requests" || isOwner)
              .map(id => {
                const meta = CAT_META[id]
                const sectionMeta = {
                  overview:       {icon:"⚡",label:"نظرة عامة"},
                  analytics:      {icon:"📈",label:"إحصائيات متقدمة"},
                  prefix:         {icon:"🔷",label:"البريفكس"},
                  admin:          {icon:"⚙️",label:"الإعدادات"},
                  subscriptions:  {icon:"👑",label:"الاشتراكات"},
                  "payment-requests":{icon:"🔐",label:"طلبات الدفع"},
                }[id]
                const info = meta || sectionMeta || {icon:"●",label:id}
                const planKey = meta?.plan || (id==="analytics"?"diamond":id==="prefix"?"silver":undefined)
                const locked = planKey && selectedGuild && !canUsePlan(guildPlan, planKey)
                return { id, info, locked }
              })
            if(!visibleItems.length) return null
            return (
              <div key={group.label}>
                <div className="section-lbl">{group.label}</div>
                {visibleItems.map(({id,info,locked})=>(
                  <div key={id} className={`nav-item${activeSection===id?" active":""}`}
                    onClick={()=>setActiveSection(id)}
                    style={{opacity:locked?.55:1}}>
                    <span style={{fontSize:13}}>{info.icon}</span>
                    <span style={{flex:1,fontSize:12.5}}>{info.label}</span>
                    {locked && <span style={{fontSize:9,opacity:.6}}>🔒</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Guilds */}
        <div style={{padding:"7px 7px 0",borderTop:"1px solid var(--border)",flexShrink:0}}>
          <div className="section-lbl">السيرفرات ({guilds.length})</div>
          <div style={{maxHeight:160,overflowY:"auto"}}>
            {guilds.slice(0,15).map(g => {
              const hasBot = botGuilds.includes(g.id)
              return (
                <div key={g.id}
                  className={`guild-item${selectedGuild?.id===g.id?" active":""}`}
                  onClick={()=>selectGuild(g)}
                  title={hasBot ? g.name : `${g.name} — البوت غير موجود، اضغط للإضافة`}>
                  {g.icon
                    ? <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" width={24} height={24} style={{borderRadius:6,flexShrink:0,opacity:hasBot?1:.5,filter:hasBot?"none":"grayscale(.6)"}}/>
                    : <div style={{width:24,height:24,borderRadius:6,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:hasBot?"var(--blue)":"var(--muted)",fontWeight:700,flexShrink:0,opacity:hasBot?1:.6}}>{g.name.slice(0,2)}</div>
                  }
                  <span style={{fontSize:11,fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",opacity:hasBot?1:.65}}>{g.name}</span>
                  {!hasBot && <span style={{fontSize:11,color:"var(--gold)",flexShrink:0}} title="البوت غير موجود">⚠</span>}
                  {hasBot && selectedGuild?.id===g.id && <div className="pulse-dot" style={{width:5,height:5}}/>}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{padding:"6px 7px",flexShrink:0}}>
          <div className="nav-item" onClick={logout} style={{color:"var(--red)"}}>
            <span>⎋</span><span style={{fontSize:12}}>تسجيل الخروج</span>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{flex:1,padding:"26px 30px",overflowY:"auto",zIndex:2,minHeight:"100vh",order:1,maxWidth:"calc(100% - 255px)"}}>
        {renderSection()}
      </main>
    </div>
  )
}

// ══════════════════════════════════════
//  APP ROOT
// ══════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <GlobalStyle/>
      <Routes>
        <Route path="/"          element={<Home/>}/>
        <Route path="/callback"  element={<Callback/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </BrowserRouter>
  )
}