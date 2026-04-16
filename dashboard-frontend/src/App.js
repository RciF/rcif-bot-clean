import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";

const API          = process.env.REACT_APP_API_URL    || "http://localhost:4000";
const CLIENT_ID    = process.env.REACT_APP_CLIENT_ID  || "1480292734353805373";
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || "http://localhost:3000/callback";

// ══════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════
const PLANS = [
  { id:"free",    name:"مجاني", price:0,   color:"var(--muted)", icon:"🆓", ai_limit:0,
    features:["الإشراف الكامل","معلومات السيرفر","أوامر أساسية"] },
  { id:"silver",  name:"فضي",   price:29,  color:"#94a3b8",      icon:"🥈", ai_limit:0, popular:false,
    features:["كل مميزات المجاني","نظام الترحيب والوداع","السجلات (لوق) كامل","Reaction Roles + لوحة الرتب","إحصائيات السيرفر","XP والمستويات","تغيير أسماء الأوامر","بريفكس مخصص"] },
  { id:"gold",    name:"ذهبي",  price:79,  color:"var(--gold)",  icon:"👑", ai_limit:300, popular:true,
    features:["كل مميزات الفضي","الاقتصاد الكامل","نظام التذاكر","الفعاليات","الحماية (Anti-Spam/Raid/Nuke)","ذكاء اصطناعي 300 رسالة/يوم"] },
  { id:"diamond", name:"ماسي",  price:149, color:"var(--cyan)",  icon:"💎", ai_limit:700,
    features:["جميع المميزات","ذكاء اصطناعي 700 رسالة/يوم","إحصائيات متقدمة في الداشبورد","أولوية دعم قصوى"] },
];

const PLAN_HIERARCHY = { free:0, silver:1, gold:2, diamond:3 };
const canUsePlan = (gp, req) => (PLAN_HIERARCHY[gp]??0) >= (PLAN_HIERARCHY[req]??0);

const BANK_INFO = {
  bank:"بنك الراجحي", accountName:"ALI TAWI A",
  accountNumber:"107000010006086076681",
  iban:"SA55 8000 0107 6080 1607 6681", applePay:"+966509992372",
};

// كل الأقسام مع metadata
const SECTIONS = [
  { id:"overview",    icon:"⚡",  label:"نظرة عامة",         plan:"free"   },
  { id:"moderation",  icon:"🛡",  label:"الإشراف",            plan:"free"   },
  { id:"logs",        icon:"📋",  label:"السجلات",            plan:"silver" },
  { id:"protection",  icon:"🔒",  label:"الحماية",            plan:"gold"   },
  { id:"welcome",     icon:"🤝",  label:"الترحيب",            plan:"silver" },
  { id:"tickets",     icon:"🎫",  label:"التذاكر",            plan:"gold"   },
  { id:"roles",       icon:"🎭",  label:"الرتب",              plan:"silver" },
  { id:"xp",          icon:"⭐",  label:"XP والمستويات",      plan:"silver" },
  { id:"economy",     icon:"💰",  label:"الاقتصاد",           plan:"gold"   },
  { id:"events",      icon:"🎉",  label:"الفعاليات",          plan:"gold"   },
  { id:"stats",       icon:"📊",  label:"الإحصائيات",         plan:"silver" },
  { id:"ai",          icon:"🤖",  label:"الذكاء الاصطناعي",  plan:"gold"   },
  { id:"info",        icon:"ℹ️",  label:"المعلومات",          plan:"free"   },
  { id:"admin",       icon:"⚙️",  label:"الإعدادات",          plan:"free"   },
  { id:"prefix",      icon:"🔷",  label:"البريفكس",           plan:"silver" },
  { id:"analytics",   icon:"📈",  label:"إحصائيات متقدمة",   plan:"diamond"},
  { id:"subscriptions",icon:"👑", label:"الاشتراكات",         plan:"free"   },
];

// أوامر كل قسم
const SECTION_COMMANDS = {
  moderation: ["حظر","طرد","تحذير","التحذيرات","مسح_التحذيرات","اسكت","فك_الكتم","فك_الحظر","مسح","لقب","بطيء","قفل","فتح","رتبة","ضبط_لوق"],
  logs:       ["لوق"],
  protection: ["حماية"],
  welcome:    ["ترحيب"],
  tickets:    ["تذاكر"],
  roles:      ["reaction-role","لوحة-رتب"],
  xp:         ["مستوى","متصدرين_xp","تسطيل_xp"],
  economy:    ["متجر","شراء","بيع","رصيد","يومي","عمل","تحويل","ممتلكاتي","متصدرين"],
  events:     ["فعالية"],
  stats:      ["إحصائيات"],
  ai:         ["ذكاء","اعلان"],
  info:       ["معلومات","السيرفر","بوت","صورة"],
  admin:      ["config","settings","مطور"],
};

const CATEGORY_COLOR = {
  moderation:"var(--green)", logs:"var(--blue)",    protection:"var(--red)",
  welcome:"var(--cyan)",     tickets:"var(--purple)",roles:"var(--gold)",
  xp:"var(--purple)",        economy:"var(--gold)",  events:"var(--cyan)",
  stats:"var(--blue)",       ai:"var(--blue)",        info:"var(--muted)",
  admin:"var(--muted)",
};

function authHeaders() {
  const t = localStorage.getItem("session_token");
  return { "Content-Type":"application/json", ...(t ? { Authorization:`Bearer ${t}` } : {}) };
}
async function authFetch(url, opts={}) {
  return fetch(url, { ...opts, headers:{ ...authHeaders(), ...opts.headers } });
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
      --panel:rgba(10,17,35,0.95);--border:rgba(0,200,255,0.13);--border2:rgba(0,200,255,0.38);
      --blue:#00c8ff;--cyan:#00ffe7;--purple:#a855f7;--gold:#fbbf24;
      --red:#f43f5e;--green:#22d3a2;--text:#e2e8f0;--muted:#64748b;
      --glow:0 0 28px rgba(0,200,255,0.4),0 0 56px rgba(0,200,255,0.12);
      --glow-g:0 0 24px rgba(251,191,36,0.38);
      --glow-gr:0 0 20px rgba(34,211,162,0.38);
      --glow-r:0 0 20px rgba(244,63,94,0.38);
      --r:12px;
    }

    html{scroll-behavior:smooth}
    body{background:var(--bg);color:var(--text);font-family:'Tajawal',sans-serif;
      font-size:15px;min-height:100vh;overflow-x:hidden;direction:rtl}

    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-track{background:var(--bg2)}
    ::-webkit-scrollbar-thumb{background:linear-gradient(var(--blue),var(--cyan));border-radius:2px}

    .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;
      background-image:linear-gradient(rgba(0,200,255,0.025) 1px,transparent 1px),
        linear-gradient(90deg,rgba(0,200,255,0.025) 1px,transparent 1px);
      background-size:64px 64px}
    .grid-bg::after{content:'';position:absolute;inset:0;
      background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,200,255,0.05),transparent)}

    .scanlines{position:fixed;inset:0;z-index:1;pointer-events:none;
      background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.02) 2px,rgba(0,0,0,0.02) 4px)}

    @keyframes float-up{0%{transform:translateY(0) scale(1);opacity:0}20%{opacity:1}80%{opacity:.5}100%{transform:translateY(-100vh) scale(.3);opacity:0}}
    .particle{position:fixed;width:2px;height:2px;border-radius:50%;pointer-events:none;z-index:0;animation:float-up linear infinite}

    /* ── Cards ── */
    .card{background:var(--panel);border:1px solid var(--border);border-radius:var(--r);
      backdrop-filter:blur(20px);transition:border-color .25s,box-shadow .25s;position:relative;overflow:hidden}
    .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
      background:linear-gradient(90deg,transparent,var(--blue),transparent);opacity:.35}
    .card:hover{border-color:var(--border2)}
    .card.glow:hover{box-shadow:var(--glow)}
    .card.active-border{border-color:rgba(0,200,255,.4);box-shadow:var(--glow)}

    /* ── Buttons ── */
    .btn{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:8px;
      border:none;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;
      cursor:pointer;transition:all .22s}
    .btn:disabled{opacity:.45;cursor:not-allowed}
    .btn-blue{background:linear-gradient(135deg,#0055bb,#0088ff);color:#fff;box-shadow:0 0 14px rgba(0,136,255,.3)}
    .btn-blue:hover:not(:disabled){box-shadow:0 0 26px rgba(0,136,255,.6);transform:translateY(-2px)}
    .btn-green{background:linear-gradient(135deg,#065f46,#059669);color:#fff}
    .btn-green:hover:not(:disabled){box-shadow:var(--glow-gr);transform:translateY(-2px)}
    .btn-red{background:linear-gradient(135deg,#991b1b,#f43f5e);color:#fff}
    .btn-red:hover:not(:disabled){box-shadow:var(--glow-r);transform:translateY(-2px)}
    .btn-gold{background:linear-gradient(135deg,#92400e,#fbbf24);color:#000}
    .btn-gold:hover:not(:disabled){box-shadow:var(--glow-g);transform:translateY(-2px)}
    .btn-ghost{background:rgba(255,255,255,.04);color:var(--muted);border:1px solid var(--border)}
    .btn-ghost:hover:not(:disabled){background:rgba(255,255,255,.08);color:var(--text)}
    .btn-discord{background:linear-gradient(135deg,#4752c4,#5865f2);color:#fff;
      box-shadow:0 0 22px rgba(88,101,242,.45);font-size:16px;padding:18px 36px}
    .btn-discord:hover{box-shadow:0 0 40px rgba(88,101,242,.75);transform:translateY(-3px) scale(1.02)}

    /* ── Toggle ── */
    .toggle{position:relative;width:50px;height:26px;background:rgba(0,0,0,.5);
      border-radius:13px;border:1px solid var(--border);cursor:pointer;transition:all .28s;flex-shrink:0}
    .toggle.on{background:rgba(0,200,255,.18);border-color:var(--blue);box-shadow:var(--glow)}
    .toggle::after{content:'';position:absolute;top:3px;right:3px;width:18px;height:18px;
      border-radius:50%;background:var(--muted);transition:all .28s}
    .toggle.on::after{right:27px;background:var(--blue);box-shadow:0 0 10px var(--blue)}
    .toggle.locked{opacity:.4;cursor:not-allowed}

    /* ── Tags ── */
    .tag{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
    .tag-blue{background:rgba(0,200,255,.1);color:var(--blue);border:1px solid rgba(0,200,255,.28)}
    .tag-purple{background:rgba(168,85,247,.1);color:var(--purple);border:1px solid rgba(168,85,247,.28)}
    .tag-green{background:rgba(34,211,162,.1);color:var(--green);border:1px solid rgba(34,211,162,.28)}
    .tag-gold{background:rgba(251,191,36,.1);color:var(--gold);border:1px solid rgba(251,191,36,.28)}
    .tag-red{background:rgba(244,63,94,.1);color:var(--red);border:1px solid rgba(244,63,94,.28)}
    .tag-cyan{background:rgba(0,255,231,.1);color:var(--cyan);border:1px solid rgba(0,255,231,.28)}
    .tag-muted{background:rgba(100,116,139,.1);color:var(--muted);border:1px solid rgba(100,116,139,.28)}

    /* ── Pulse ── */
    @keyframes pulse-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.6);opacity:0}}
    .pulse-dot{width:8px;height:8px;border-radius:50%;background:var(--green);position:relative;flex-shrink:0}
    .pulse-dot::before{content:'';position:absolute;inset:0;border-radius:50%;background:var(--green);animation:pulse-ring 2s infinite}

    /* ── Progress bar ── */
    .bar-track{height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden}
    .bar-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--blue),var(--cyan));
      transition:width .7s cubic-bezier(.4,0,.2,1);box-shadow:0 0 6px var(--blue)}

    /* ── Animations ── */
    @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
    .fade-in{animation:fadeIn .45s ease both}
    .fade-in-1{animation-delay:.07s}.fade-in-2{animation-delay:.14s}
    .fade-in-3{animation-delay:.21s}.fade-in-4{animation-delay:.28s}

    @keyframes slideIn{from{transform:translateX(-120%)}to{transform:translateX(0)}}
    .notif{position:fixed;bottom:22px;left:22px;z-index:9999;padding:13px 18px;border-radius:10px;
      display:flex;align-items:center;gap:10px;background:rgba(10,17,35,.97);border:1px solid var(--green);
      box-shadow:0 0 22px rgba(34,211,162,.3);font-weight:600;animation:slideIn .35s ease;max-width:360px}
    .notif.err{border-color:var(--red);box-shadow:0 0 22px rgba(244,63,94,.3)}

    /* ── Sidebar ── */
    .sidebar{width:260px;flex-shrink:0;height:100vh;position:sticky;top:0;
      display:flex;flex-direction:column;background:rgba(5,10,22,.98);
      border-left:1px solid var(--border);backdrop-filter:blur(24px)}

    .guild-item{display:flex;align-items:center;gap:11px;padding:8px 11px;border-radius:9px;
      cursor:pointer;transition:all .18s;border:1px solid transparent}
    .guild-item:hover{background:rgba(0,200,255,.05);border-color:var(--border)}
    .guild-item.active{background:rgba(0,200,255,.1);border-color:rgba(0,200,255,.28)}

    .nav-item{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:8px;
      color:var(--muted);cursor:pointer;transition:all .18s;font-size:13.5px;font-weight:500;
      position:relative}
    .nav-item:hover{color:var(--text);background:rgba(255,255,255,.03)}
    .nav-item.active{color:var(--blue);background:rgba(0,200,255,.08);border-right:2px solid var(--blue)}
    .nav-item .lock-badge{margin-right:auto;font-size:10px;opacity:.5}

    /* ── Section header ── */
    .section-lbl{font-size:9.5px;font-weight:700;color:var(--muted);letter-spacing:2px;
      text-transform:uppercase;padding:0 13px;margin:9px 0 3px}
    .divider{height:1px;background:var(--border);margin:8px 0}

    /* ── Inputs ── */
    input,select,textarea{background:rgba(0,0,0,.32);border:1px solid var(--border);border-radius:8px;
      color:var(--text);padding:9px 13px;font-family:'Tajawal',sans-serif;font-size:14px;
      outline:none;transition:border-color .2s;width:100%;direction:rtl}
    input:focus,select:focus,textarea:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,200,255,.08)}
    input:disabled,select:disabled{opacity:.4;cursor:not-allowed}

    /* ── Command card ── */
    .cmd-card{background:var(--panel);border:1px solid var(--border);border-radius:10px;
      padding:15px;transition:all .22s;position:relative;overflow:hidden}
    .cmd-card:hover{border-color:var(--border2);box-shadow:var(--glow)}
    .cmd-card.locked-cmd{opacity:.55}
    .cmd-card.locked-cmd::after{content:'🔒';position:absolute;top:8px;left:8px;font-size:11px}
    .cmd-card.disabled-cmd{opacity:.45}

    /* ── Stats grid ── */
    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:13px}
    .stat-card{background:var(--panel);border:1px solid var(--border);border-radius:10px;
      padding:17px 13px;text-align:center;transition:all .22s;cursor:default}
    .stat-card:hover{border-color:var(--border2);transform:translateY(-2px)}

    /* ── Plan cards ── */
    .plan-card{border:2px solid var(--border);border-radius:16px;padding:22px;
      background:var(--panel);transition:all .28s;cursor:pointer;position:relative;overflow:hidden}
    .plan-card:hover{transform:translateY(-5px);border-color:var(--border2)}
    .plan-card.popular{border-color:var(--gold);box-shadow:0 0 28px rgba(251,191,36,.12)}
    .plan-card.current{border-color:var(--green);box-shadow:0 0 18px rgba(34,211,162,.12)}
    .plan-card.diamond-plan{border-color:var(--cyan);box-shadow:0 0 22px rgba(0,255,231,.1)}
    .plan-badge{position:absolute;top:-1px;right:18px;padding:3px 12px;
      border-radius:0 0 9px 9px;font-size:10px;font-weight:700;letter-spacing:1px}

    /* ── Info row ── */
    .info-row{display:flex;justify-content:space-between;align-items:center;
      padding:8px 12px;background:rgba(0,200,255,.04);border-radius:7px;
      border:1px solid var(--border);margin-bottom:7px}

    /* ── Search ── */
    .search-wrap{position:relative}
    .search-wrap input{padding-right:38px}
    .search-wrap::before{content:'🔍';position:absolute;right:11px;top:50%;transform:translateY(-50%);font-size:13px;z-index:1}

    /* ── Prefix preview ── */
    .prefix-preview{display:inline-flex;align-items:center;gap:3px;
      background:rgba(0,200,255,.08);border:1px solid rgba(0,200,255,.22);
      border-radius:5px;padding:3px 9px;font-family:'Orbitron',sans-serif;font-size:11px;color:var(--cyan)}

    /* ── Chart bar ── */
    .chart-bar-wrap{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .chart-bar-bg{flex:1;height:8px;background:rgba(255,255,255,.05);border-radius:4px;overflow:hidden}
    .chart-bar-fill{height:100%;border-radius:4px;transition:width .8s cubic-bezier(.4,0,.2,1)}

    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    .shimmer{background:linear-gradient(90deg,var(--bg3) 25%,rgba(0,200,255,.06) 50%,var(--bg3) 75%);
      background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px}

    /* ── Notification ── */
    .section-lock-banner{padding:13px 18px;border-radius:10px;margin-bottom:20px;
      background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.25);
      display:flex;align-items:center;gap:12px}
  `}</style>
);

// ══════════════════════════════════════
//  UTILS
// ══════════════════════════════════════
const Particles = () => {
  const ps = Array.from({length:16},(_,i)=>({
    id:i,left:`${Math.random()*100}%`,
    delay:`${Math.random()*10}s`,duration:`${8+Math.random()*12}s`,
    color:i%3===0?"#a855f7":i%3===1?"#00ffe7":"#00c8ff"
  }));
  return <>{ps.map(p=><div key={p.id} className="particle" style={{left:p.left,bottom:"-8px",animationDelay:p.delay,animationDuration:p.duration,background:p.color,boxShadow:`0 0 5px ${p.color}`}}/>)}</>;
};

function Notif({msg,onClose}) {
  const isErr = msg?.startsWith("❌");
  useEffect(()=>{if(msg){const t=setTimeout(onClose,4000);return()=>clearTimeout(t)}},[msg,onClose]);
  if(!msg) return null;
  return (
    <div className={`notif${isErr?" err":""}`}>
      <span style={{color:isErr?"var(--red)":"var(--green)",fontSize:18,flexShrink:0}}>{isErr?"✕":"✓"}</span>
      <span style={{fontSize:14}}>{msg}</span>
    </div>
  );
}

function PlanLock({plan, guildPlan, children}) {
  const locked = !canUsePlan(guildPlan, plan);
  if(!locked) return children;
  const planInfo = PLANS.find(p=>p.id===plan);
  return (
    <div className="section-lock-banner">
      <span style={{fontSize:22}}>🔒</span>
      <div>
        <div style={{fontWeight:700,color:"var(--gold)",fontSize:14}}>هذا القسم يحتاج خطة {planInfo?.name} أو أعلى</div>
        <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>اشترك لفتح هذه الميزة وكل مميزاتها.</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  COMMANDS PANEL — يُستخدم في كل قسم
// ══════════════════════════════════════
function CommandsPanel({guild, guildPlan, category, onNotif}) {
  const [commands, setCommands] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});
  const [editing,  setEditing]  = useState(null);
  const [tempName, setTempName] = useState("");
  const canCustomize = canUsePlan(guildPlan,"silver");

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const r = await authFetch(`${API}/api/guild/${guild.id}/commands?category=${category}`);
      const d = await r.json();
      if(d.commands) setCommands(d.commands);
    }catch{ onNotif("❌ فشل تحميل الأوامر"); }
    setLoading(false);
  },[guild.id,category]);

  useEffect(()=>{load()},[load]);

  const toggle = async(cmd)=>{
    if(cmd.plan_locked){onNotif(`🔒 يحتاج خطة ${cmd.plan} أو أعلى`);return;}
    const newVal = !cmd.enabled;
    setSaving(s=>({...s,[cmd.name]:true}));
    setCommands(prev=>prev.map(c=>c.name===cmd.name?{...c,enabled:newVal}:c));
    try{
      const r = await authFetch(`${API}/api/guild/${guild.id}/commands/${encodeURIComponent(cmd.name)}`,{
        method:"PATCH",body:JSON.stringify({enabled:newVal})
      });
      const d = await r.json();
      if(!d.success){onNotif(d.error||"❌ فشل");load();}
      else onNotif(newVal?`✅ تم تفعيل /${cmd.custom_name||cmd.name}`:`⏹ تم تعطيل /${cmd.custom_name||cmd.name}`);
    }catch{onNotif("❌ خطأ");load();}
    setSaving(s=>({...s,[cmd.name]:false}));
  };

  const startEdit = (cmd)=>{
    if(!canCustomize){onNotif("🔒 تغيير الأسماء يحتاج فضي أو أعلى");return;}
    setEditing(cmd.name); setTempName(cmd.custom_name||"");
  };

  const saveName = async(cmd)=>{
    setEditing(null);
    setSaving(s=>({...s,[cmd.name]:true}));
    setCommands(prev=>prev.map(c=>c.name===cmd.name?{...c,custom_name:tempName||null}:c));
    try{
      const r = await authFetch(`${API}/api/guild/${guild.id}/commands/${encodeURIComponent(cmd.name)}`,{
        method:"PATCH",body:JSON.stringify({custom_name:tempName||null})
      });
      const d = await r.json();
      if(!d.success){onNotif(d.error||"❌ فشل");load();}
      else onNotif("✅ تم حفظ الاسم المخصص");
    }catch{onNotif("❌ خطأ");load();}
    setSaving(s=>({...s,[cmd.name]:false}));
  };

  if(loading) return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginTop:16}}>
      {Array(4).fill(0).map((_,i)=><div key={i} className="shimmer" style={{height:100,borderRadius:10}}/>)}
    </div>
  );

  if(!commands.length) return (
    <div style={{textAlign:"center",padding:"32px 0",color:"var(--muted)",fontSize:14}}>
      لا توجد أوامر في هذا القسم
    </div>
  );

  return (
    <div>
      {!canCustomize && (
        <div style={{padding:"10px 14px",borderRadius:8,background:"rgba(251,191,36,.05)",
          border:"1px solid rgba(251,191,36,.2)",marginBottom:14,fontSize:12,color:"var(--gold)",display:"flex",gap:8,alignItems:"center"}}>
          🔒 تغيير أسماء الأوامر يحتاج خطة فضي أو أعلى
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {commands.map(cmd=>{
          const isEdit = editing===cmd.name;
          const isSave = saving[cmd.name];
          const catColor = CATEGORY_COLOR[cmd.category]||"var(--blue)";
          return (
            <div key={cmd.name} className={`cmd-card${cmd.plan_locked?" locked-cmd":""}${!cmd.enabled&&!cmd.plan_locked?" disabled-cmd":""}`}>
              {/* Name row */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  {isEdit ? (
                    <div style={{display:"flex",gap:6}}>
                      <input value={tempName} onChange={e=>setTempName(e.target.value)}
                        placeholder={cmd.name} autoFocus
                        style={{fontSize:12,padding:"5px 9px",height:30}}
                        onKeyDown={e=>{if(e.key==="Enter")saveName(cmd);if(e.key==="Escape")setEditing(null)}}/>
                      <button className="btn btn-green" style={{padding:"4px 9px",fontSize:11}} onClick={()=>saveName(cmd)}>✓</button>
                      <button className="btn btn-ghost" style={{padding:"4px 9px",fontSize:11}} onClick={()=>setEditing(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <code style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,color:catColor,fontWeight:700}}>
                        /{cmd.custom_name||cmd.name}
                      </code>
                      {cmd.custom_name&&<span style={{fontSize:10,color:"var(--muted)"}}>← /{cmd.name}</span>}
                    </div>
                  )}
                  <p style={{fontSize:11,color:"var(--muted)",marginTop:4,lineHeight:1.5}}>{cmd.description}</p>
                </div>
                {/* Toggle */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                  {isSave
                    ? <div style={{width:50,height:26,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--blue)" strokeWidth="2" strokeDasharray="19" strokeDashoffset="7" style={{animation:"spin .7s linear infinite",transformOrigin:"center"}}/></svg>
                      </div>
                    : <div className={`toggle${cmd.enabled?" on":""}${cmd.plan_locked?" locked":""}`} onClick={()=>toggle(cmd)}/>
                  }
                  <span style={{fontSize:9,color:cmd.enabled?"var(--green)":"var(--muted)"}}>
                    {cmd.plan_locked?"مقفول":cmd.enabled?"مفعّل":"متوقف"}
                  </span>
                </div>
              </div>
              {/* Footer */}
              {!cmd.plan_locked && !isEdit && (
                <div style={{borderTop:"1px solid var(--border)",paddingTop:7,marginTop:2,display:"flex",justifyContent:"flex-end"}}>
                  <button className="btn btn-ghost" style={{padding:"3px 9px",fontSize:10}}
                    onClick={()=>startEdit(cmd)}>
                    ✏ {cmd.custom_name?"تعديل الاسم":"اسم مخصص"}{!canCustomize?" 🔒":""}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  SECTION WRAPPER — يُغلف كل قسم
// ══════════════════════════════════════
function SectionWrapper({id, icon, label, color, tagClass, guild, guildPlan, onNotif, children, requiredPlan="free"}) {
  const locked = !canUsePlan(guildPlan, requiredPlan);
  return (
    <div className="fade-in">
      <div style={{marginBottom:24}}>
        <div className={`tag ${tagClass}`} style={{marginBottom:10}}>{icon} {label}</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:26,fontWeight:900}}>{label}</h1>
        <p style={{color:"var(--muted)",marginTop:5,fontSize:13}}>
          {guild?.name} — {locked ? `🔒 يحتاج خطة ${PLANS.find(p=>p.id===requiredPlan)?.name} أو أعلى` : ""}
        </p>
      </div>
      {locked && <PlanLock plan={requiredPlan} guildPlan={guildPlan}><></></PlanLock>}
      {!locked && children}
    </div>
  );
}

// ══════════════════════════════════════
//  MODERATION SECTION
// ══════════════════════════════════════
function ModerationSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="moderation" icon="🛡" label="الإشراف" tagClass="tag-green"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="free">
      <div className="card" style={{padding:20,marginBottom:16,borderColor:"rgba(34,211,162,.2)"}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          جميع أوامر الإشراف متاحة للخطة المجانية. يمكنك تفعيل/تعطيل أي أمر وتغيير اسمه (يحتاج خطة فضي+).
          البوت يحتاج صلاحيات <strong style={{color:"var(--text)"}}>BanMembers</strong> و<strong style={{color:"var(--text)"}}>KickMembers</strong>.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="moderation" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  LOGS SECTION
// ══════════════════════════════════════
function LogsSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="logs" icon="📋" label="السجلات" tagClass="tag-blue"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="silver">
      <div className="card" style={{padding:20,marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"var(--blue)",marginBottom:10}}>📋 نظام السجلات</h3>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          سجّل كل أحداث السيرفر في قنوات مخصصة. استخدم الأمر <code style={{color:"var(--cyan)"}}>/لوق ضبط</code> لتحديد القناة لكل حدث،
          أو <code style={{color:"var(--cyan)"}}>/لوق الكل</code> لإرسال جميع الأحداث في قناة واحدة.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="logs" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  PROTECTION SECTION
// ══════════════════════════════════════
function ProtectionSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="protection" icon="🔒" label="الحماية" tagClass="tag-red"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="gold">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:16}}>
        {[
          {icon:"🛡",name:"Anti-Spam",  desc:"كشف وإيقاف الرسائل المتكررة",    color:"var(--red)"},
          {icon:"🌊",name:"Anti-Raid",  desc:"حماية من الانضمام الجماعي المفاجئ",color:"var(--gold)"},
          {icon:"💣",name:"Anti-Nuke",  desc:"منع حذف القنوات والرتب بشكل مفاجئ",color:"var(--purple)"},
          {icon:"🔒",name:"Lockdown",   desc:"قفل السيرفر بالكامل عند الطوارئ",  color:"var(--blue)"},
        ].map(p=>(
          <div key={p.name} className="card glow" style={{padding:18,textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}>{p.icon}</div>
            <div style={{fontWeight:700,color:p.color,marginBottom:5}}>{p.name}</div>
            <p style={{fontSize:12,color:"var(--muted)"}}>{p.desc}</p>
          </div>
        ))}
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="protection" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  WELCOME SECTION
// ══════════════════════════════════════
function WelcomeSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="welcome" icon="🤝" label="الترحيب" tagClass="tag-cyan"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="silver">
      <div className="card" style={{padding:20,marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"var(--cyan)",marginBottom:10}}>🤝 نظام الترحيب والوداع</h3>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          رحّب بالأعضاء الجدد ووادّع المغادرين برسائل مخصصة.
          استخدم المتغيرات: <code style={{color:"var(--cyan)"}}>{"{user}"}</code> <code style={{color:"var(--cyan)"}}>{"{server}"}</code> <code style={{color:"var(--cyan)"}}>{"{count}"}</code>
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="welcome" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  TICKETS SECTION
// ══════════════════════════════════════
function TicketsSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="tickets" icon="🎫" label="التذاكر" tagClass="tag-purple"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="gold">
      <div className="card" style={{padding:20,marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"var(--purple)",marginBottom:10}}>🎫 نظام التذاكر</h3>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          نظام دعم متكامل يتيح للأعضاء فتح تذاكر خاصة مع فريق الدعم.
          يدعم حفظ المحادثات، الإغلاق التلقائي، وتحديد رتبة الدعم.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="tickets" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  ROLES SECTION
// ══════════════════════════════════════
function RolesSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="roles" icon="🎭" label="الرتب" tagClass="tag-gold"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="silver">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:22,marginBottom:8}}>😀</div>
          <div style={{fontWeight:700,color:"var(--gold)",marginBottom:5}}>Reaction Roles</div>
          <p style={{fontSize:12,color:"var(--muted)"}}>ربط إيموجي برتبة — الأعضاء يحصلون على الرتبة بالضغط على الإيموجي</p>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:22,marginBottom:8}}>🔘</div>
          <div style={{fontWeight:700,color:"var(--gold)",marginBottom:5}}>لوحة الرتب بالأزرار</div>
          <p style={{fontSize:12,color:"var(--muted)"}}>إنشاء لوحة تفاعلية بأزرار جميلة لاختيار الرتب</p>
        </div>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="roles" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  XP SECTION
// ══════════════════════════════════════
function XPSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="xp" icon="⭐" label="XP والمستويات" tagClass="tag-purple"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="silver">
      <div className="card" style={{padding:20,marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"var(--purple)",marginBottom:10}}>⭐ نظام XP والمستويات</h3>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          تتبع نشاط الأعضاء وامنحهم XP مقابل الرسائل. كلما أرسلوا أكثر كلما صعدوا مستوى.
          يمكنك ضبط مضاعف XP وقناة الصعود وتعطيل قنوات معينة.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="xp" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  ECONOMY SECTION
// ══════════════════════════════════════
function EconomySection({guild, guildPlan, onNotif}) {
  const [leaderboard, setLB] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async()=>{
    setLoading(true);
    try{
      const r=await authFetch(`${API}/api/economy/top/${guild.id}`);
      const d=await r.json();
      setLB(Array.isArray(d)?d:[]);
    }catch{setLB([]);}
    setLoading(false);
  };
  useEffect(()=>{if(canUsePlan(guildPlan,"gold"))load();},[guild.id,guildPlan]);

  return (
    <SectionWrapper id="economy" icon="💰" label="الاقتصاد" tagClass="tag-gold"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="gold">

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        {/* Leaderboard */}
        <div className="card" style={{padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:"var(--gold)"}}>🏆 المتصدرون</h3>
            <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11}} onClick={load}>🔄</button>
          </div>
          {loading && <div style={{color:"var(--muted)",textAlign:"center",padding:16,fontSize:13}}>⏳ جاري التحميل...</div>}
          {!loading && !leaderboard.length && <div style={{color:"var(--muted)",textAlign:"center",padding:16,fontSize:13}}>لا توجد بيانات بعد</div>}
          {!loading && leaderboard.map((u,i)=>{
            const max=leaderboard[0]?.coins||1;
            const medals=["🥇","🥈","🥉"];
            return (
              <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <span style={{width:24,textAlign:"center",flexShrink:0}}>
                  {i<3?<span style={{fontSize:16}}>{medals[i]}</span>:<span style={{color:"var(--muted)",fontSize:11}}>#{i+1}</span>}
                </span>
                {u.avatar
                  ?<img src={u.avatar} alt="" width={28} height={28} style={{borderRadius:"50%",border:"1px solid var(--border)",flexShrink:0}}/>
                  :<div style={{width:28,height:28,borderRadius:"50%",background:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{u.username?.[0]?.toUpperCase()}</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{u.username}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{width:`${(u.coins/max)*100}%`,background:i===0?"linear-gradient(90deg,var(--gold),#fde68a)":"linear-gradient(90deg,var(--blue),var(--cyan))"}}/>
                  </div>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:i===0?"var(--gold)":"var(--blue)",flexShrink:0}}>
                  {u.coins?.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        {/* Info */}
        <div className="card" style={{padding:20}}>
          <h3 style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:12}}>💰 نظام التقدم الاقتصادي</h3>
          <div style={{fontSize:12,color:"var(--muted)",lineHeight:2}}>
            {["🚗 سيارة","🏠 بيت","🛣 شارع","🏘 حي","🏚 قرية","🏙 مدينة","🏛 محافظة","🗺 منطقة","🌍 دولة","🌎 قارة","🌐 العالم"].map((s,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,marginLeft:6,marginBottom:4}}>
                <span>{s}</span>{i<10&&<span style={{color:"var(--border2)"}}>←</span>}
              </span>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:12,color:"var(--muted)"}}>
            السيطرة على <strong style={{color:"var(--gold)"}}>7 قارات</strong> = إعلان عام 🎉
          </div>
        </div>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="economy" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  EVENTS SECTION
// ══════════════════════════════════════
function EventsSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="events" icon="🎉" label="الفعاليات" tagClass="tag-cyan"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="gold">
      <div className="card" style={{padding:20,marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"var(--cyan)",marginBottom:10}}>🎉 نظام الفعاليات</h3>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          أنشئ فعاليات في سيرفرك وتتبع الحضور. يدعم جدولة الفعاليات المستقبلية، التذكير التلقائي، وإدارة الحضور.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="events" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  STATS SECTION
// ══════════════════════════════════════
function StatsSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="stats" icon="📊" label="الإحصائيات" tagClass="tag-blue"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="silver">
      <div className="card" style={{padding:20,marginBottom:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:"var(--blue)",marginBottom:10}}>📊 قنوات الإحصائيات</h3>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          أنشئ قنوات تُحدَّث تلقائياً لعرض إحصائيات السيرفر مثل عدد الأعضاء، المتصلين، والبوتات.
          استخدم <code style={{color:"var(--cyan)"}}>/إحصائيات تلقائي</code> لإنشاء جميع القنوات دفعة واحدة.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="stats" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  AI SECTION
// ══════════════════════════════════════
function AISection({guild, guildPlan, onNotif, settings, onSaveSettings}) {
  const plan    = PLANS.find(p=>p.id===guildPlan)||PLANS[0];
  const aiLimit = plan.ai_limit||0;
  return (
    <SectionWrapper id="ai" icon="🤖" label="الذكاء الاصطناعي" tagClass="tag-blue"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="gold">

      {/* AI limit info */}
      <div className="card" style={{padding:20,marginBottom:16,borderColor:"rgba(0,200,255,.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"var(--blue)",marginBottom:5}}>🤖 حد الرسائل اليومي</div>
            <div style={{fontSize:13,color:"var(--muted)"}}>
              خطتك الحالية <span style={{color:plan.color,fontWeight:700}}>{plan.name}</span> تسمح بـ
              <span style={{color:"var(--blue)",fontWeight:700}}> {aiLimit} </span>رسالة يومياً
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:32,fontWeight:900,color:"var(--blue)"}}>{aiLimit}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>رسالة/يوم</div>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <div className="bar-track" style={{height:6}}>
            <div className="bar-fill" style={{width:`${(aiLimit/700)*100}%`}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--muted)",marginTop:4}}>
            <span>0</span><span>700 (ماسي)</span>
          </div>
        </div>
      </div>

      {/* Toggle AI */}
      <div className="card" style={{padding:20,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>تفعيل الذكاء الاصطناعي</div>
            <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>البوت يرد على الرسائل عند المنشن</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div className={`toggle${settings?.ai?" on":""}`} onClick={()=>onSaveSettings({...settings,ai:!settings?.ai})}/>
            <span style={{fontSize:10,color:settings?.ai?"var(--green)":"var(--muted)"}}>{settings?.ai?"مفعّل":"متوقف"}</span>
          </div>
        </div>
      </div>

      <CommandsPanel guild={guild} guildPlan={guildPlan} category="ai" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  INFO SECTION
// ══════════════════════════════════════
function InfoSection({guild, guildPlan, onNotif}) {
  return (
    <SectionWrapper id="info" icon="ℹ️" label="المعلومات" tagClass="tag-muted"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="free">
      <div className="card" style={{padding:20,marginBottom:16}}>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7}}>
          أوامر عرض المعلومات متاحة للجميع مجاناً. تشمل معلومات الأعضاء، السيرفر، والبوت.
        </p>
      </div>
      <CommandsPanel guild={guild} guildPlan={guildPlan} category="info" onNotif={onNotif}/>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  ADMIN SECTION
// ══════════════════════════════════════
function AdminSection({guild, guildPlan, settings, onSaveSettings, onNotif}) {
  return (
    <SectionWrapper id="admin" icon="⚙️" label="الإعدادات" tagClass="tag-muted"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="free">

      <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:620}}>
        {[
          {key:"ai",    icon:"🤖",label:"نظام الذكاء الاصطناعي",desc:"البوت يرد على الرسائل تلقائياً بالمنشن",color:"var(--blue)",  plan:"gold"},
          {key:"xp",    icon:"⭐",label:"نظام XP والمستويات",   desc:"تتبع نشاط الأعضاء ومنح XP بالرسائل",  color:"var(--purple)",plan:"silver"},
          {key:"economy",icon:"💰",label:"نظام الاقتصاد",        desc:"عملات ومكافآت يومية ومتجر",            color:"var(--gold)",  plan:"gold"},
        ].map(s=>{
          const locked=!canUsePlan(guildPlan,s.plan);
          return (
            <div key={s.key} className="card" style={{padding:22,borderColor:settings?.[s.key]&&!locked?`${s.color}33`:undefined}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14}}>
                <div style={{display:"flex",gap:14,flex:1}}>
                  <div style={{fontSize:28,flexShrink:0}}>{s.icon}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:s.color,marginBottom:5,display:"flex",alignItems:"center",gap:8}}>
                      {s.label}
                      {locked&&<span className="tag tag-muted" style={{fontSize:9}}>🔒 {PLANS.find(p=>p.id===s.plan)?.name}+</span>}
                    </div>
                    <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>{s.desc}</p>
                    <div style={{marginTop:10}}>
                      <div className="bar-track" style={{width:200}}>
                        <div className="bar-fill" style={{width:settings?.[s.key]&&!locked?"100%":"0%",background:settings?.[s.key]?`linear-gradient(90deg,${s.color},var(--cyan))`:"transparent"}}/>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                  <div className={`toggle${settings?.[s.key]?" on":""}${locked?" locked":""}`}
                    onClick={()=>!locked&&onSaveSettings({...settings,[s.key]:!settings?.[s.key]})}/>
                  <span style={{fontSize:9,color:settings?.[s.key]&&!locked?"var(--green)":"var(--muted)"}}>
                    {locked?"مقفول":settings?.[s.key]?"مفعّل":"متوقف"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{marginTop:20}}>
        <CommandsPanel guild={guild} guildPlan={guildPlan} category="admin" onNotif={onNotif}/>
      </div>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  PREFIX SECTION
// ══════════════════════════════════════
function PrefixSection({guild, guildPlan, onNotif}) {
  const [prefix,  setPrefix]  = useState("!");
  const [input,   setInput]   = useState("!");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const canChange = canUsePlan(guildPlan,"silver");

  useEffect(()=>{
    authFetch(`${API}/api/guild/${guild.id}/prefix`).then(r=>r.json())
      .then(d=>{setPrefix(d.prefix||"!");setInput(d.prefix||"!");setLoading(false);})
      .catch(()=>setLoading(false));
  },[guild.id]);

  const save=async()=>{
    if(!canChange){onNotif("🔒 البريفكس المخصص يحتاج فضي أو أعلى");return;}
    if(!input.trim()){onNotif("⚠ أدخل بريفكس صالح");return;}
    setSaving(true);
    try{
      const r=await authFetch(`${API}/api/guild/${guild.id}/prefix`,{method:"POST",body:JSON.stringify({prefix:input.trim()})});
      const d=await r.json();
      if(d.success){setPrefix(d.prefix);onNotif(`✅ تم تغيير البريفكس إلى: ${d.prefix}`);}
      else onNotif(d.error||"❌ فشل");
    }catch{onNotif("❌ خطأ");}
    setSaving(false);
  };

  return (
    <SectionWrapper id="prefix" icon="🔷" label="البريفكس" tagClass="tag-cyan"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="silver">
      <div style={{maxWidth:520}}>
        <div className="card" style={{padding:28,marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:700,color:"var(--cyan)",marginBottom:20}}>⚙ إعداد البريفكس</h3>

          {/* Preview */}
          <div style={{marginBottom:22,padding:"14px 18px",background:"rgba(0,200,255,.04)",borderRadius:9,border:"1px solid var(--border)"}}>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:7}}>معاينة الأوامر:</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {["حظر","طرد","مسح","رصيد","بوت"].map(cmd=>(
                <span key={cmd} className="prefix-preview">{input||prefix}{cmd}</span>
              ))}
            </div>
          </div>

          <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:7}}>البريفكس الحالي</label>
          <div style={{display:"flex",gap:9}}>
            <input value={input} onChange={e=>setInput(e.target.value)} maxLength={5}
              placeholder="!" disabled={!canChange||loading}
              style={{flex:1,fontSize:24,fontFamily:"'Orbitron',sans-serif",textAlign:"center",letterSpacing:5}}/>
            <button className="btn btn-blue" onClick={save}
              disabled={saving||!canChange||input===prefix||loading} style={{flexShrink:0}}>
              {saving?"⏳":"💾 حفظ"}
            </button>
          </div>

          {input!==prefix&&canChange&&(
            <div style={{marginTop:10,fontSize:11,color:"var(--gold)",display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              ⚠ الحالي: <span className="prefix-preview" style={{fontSize:10}}>{prefix}</span>
              سيتغير إلى: <span className="prefix-preview" style={{fontSize:10,borderColor:"var(--gold)",color:"var(--gold)"}}>{input}</span>
            </div>
          )}
        </div>
        <div className="card" style={{padding:18,borderColor:"rgba(0,200,255,.18)"}}>
          <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.8}}>
            <div>• البريفكس يُستخدم مع أوامر النص (prefix commands)</div>
            <div>• لا يؤثر على Slash Commands (<code style={{color:"var(--cyan)"}}>/</code>)</div>
            <div>• الحد الأقصى 5 أحرف</div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  ANALYTICS SECTION — إحصائيات متقدمة
// ══════════════════════════════════════
function AnalyticsSection({guild, guildPlan, onNotif}) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(30);
  const isAdvanced = canUsePlan(guildPlan,"diamond");

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await authFetch(`${API}/api/guild/${guild.id}/analytics?days=${days}`);
      const d=await r.json();
      if(!d.error) setData(d);
    }catch{}
    setLoading(false);
  },[guild.id,days]);

  useEffect(()=>{load();},[load]);

  const CAT_LABELS = {
    moderation:"الإشراف",logs:"السجلات",protection:"الحماية",
    welcome:"الترحيب",tickets:"التذاكر",roles:"الرتب",
    xp:"XP",economy:"الاقتصاد",events:"الفعاليات",
    stats:"الإحصائيات",ai:"الذكاء الاصطناعي",info:"المعلومات",admin:"الإدارة"
  };

  return (
    <SectionWrapper id="analytics" icon="📈" label="إحصائيات متقدمة" tagClass="tag-purple"
      guild={guild} guildPlan={guildPlan} onNotif={onNotif} requiredPlan="diamond">

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={load}>🔄 تحديث</button>
        {[7,14,30,90].map(d=>(
          <button key={d} onClick={()=>setDays(d)}
            className={`btn${days===d?" btn-blue":" btn-ghost"}`} style={{padding:"6px 12px",fontSize:12}}>
            {d} يوم
          </button>
        ))}
      </div>

      {loading && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:13}}>
          {Array(4).fill(0).map((_,i)=><div key={i} className="shimmer" style={{height:80,borderRadius:10}}/>)}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="stats-grid" style={{marginBottom:24}}>
            {[
              {label:"إجمالي الاستخدام",value:data.total_usage?.toLocaleString()||"0",icon:"⚡",color:"var(--blue)"},
              {label:"الأيام المحللة",   value:days,                                    icon:"📅",color:"var(--cyan)"},
              {label:"أكثر أمر استخداماً",value:data.top_commands_guild?.[0]?.command||"—",icon:"🏆",color:"var(--gold)"},
              {label:"الفئة الأكثر",    value:CAT_LABELS[data.category_stats?.sort((a,b)=>b.total-a.total)[0]?.category]||"—",icon:"📊",color:"var(--purple)"},
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div style={{fontSize:22,marginBottom:5}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            {/* Top commands */}
            <div className="card" style={{padding:20}}>
              <h3 style={{fontSize:14,fontWeight:700,color:"var(--gold)",marginBottom:14}}>🏆 أكثر الأوامر استخداماً</h3>
              {data.top_commands_guild?.length===0&&<div style={{color:"var(--muted)",fontSize:12,textAlign:"center",padding:16}}>لا توجد بيانات بعد</div>}
              {data.top_commands_guild?.map((c,i)=>{
                const max=data.top_commands_guild[0]?.total||1;
                const colors=["var(--gold)","#94a3b8","#c47c2b","var(--blue)","var(--cyan)"];
                return (
                  <div key={c.command} className="chart-bar-wrap">
                    <span style={{width:16,textAlign:"center",fontSize:11,color:colors[i]||"var(--muted)",flexShrink:0}}>#{i+1}</span>
                    <code style={{fontSize:11,color:colors[i]||"var(--muted)",width:100,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis"}}>/{c.command}</code>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{width:`${(c.total/max)*100}%`,background:colors[i]||"var(--blue)"}}/>
                    </div>
                    <span style={{fontSize:11,color:"var(--muted)",flexShrink:0}}>{c.total}</span>
                  </div>
                );
              })}
            </div>

            {/* Category stats */}
            <div className="card" style={{padding:20}}>
              <h3 style={{fontSize:14,fontWeight:700,color:"var(--blue)",marginBottom:14}}>📊 توزيع الاستخدام بالفئة</h3>
              {data.category_stats?.sort((a,b)=>b.total-a.total).filter(c=>c.total>0).slice(0,8).map(c=>{
                const max=Math.max(...(data.category_stats||[]).map(x=>x.total)||[1]);
                const color=CATEGORY_COLOR[c.category]||"var(--blue)";
                return (
                  <div key={c.category} className="chart-bar-wrap">
                    <span style={{width:80,fontSize:11,color,flexShrink:0}}>{CAT_LABELS[c.category]||c.category}</span>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{width:`${(c.total/max)*100}%`,background:color}}/>
                    </div>
                    <span style={{fontSize:11,color:"var(--muted)",flexShrink:0}}>{c.total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily usage chart */}
          <div className="card" style={{padding:20}}>
            <h3 style={{fontSize:14,fontWeight:700,color:"var(--cyan)",marginBottom:14}}>📅 الاستخدام اليومي (آخر {days} يوم)</h3>
            {!data.daily_usage?.length&&<div style={{color:"var(--muted)",fontSize:12,textAlign:"center",padding:16}}>لا توجد بيانات بعد</div>}
            {data.daily_usage?.length>0&&(()=>{
              const maxVal=Math.max(...data.daily_usage.map(d=>d.total),1);
              return (
                <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80,padding:"0 4px"}}>
                  {data.daily_usage.map((d,i)=>{
                    const h=Math.max(4,(d.total/maxVal)*80);
                    return (
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"default"}}
                        title={`${d.date}: ${d.total} أمر`}>
                        <div style={{width:"100%",height:h,background:`linear-gradient(to top,var(--blue),var(--cyan))`,borderRadius:"3px 3px 0 0",opacity:.8,transition:"all .3s"}}/>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Global stats — diamond only */}
          {isAdvanced && data.top_commands_global?.length>0&&(
            <div className="card" style={{padding:20,marginTop:16,borderColor:"rgba(0,255,231,.2)"}}>
              <h3 style={{fontSize:14,fontWeight:700,color:"var(--cyan)",marginBottom:14}}>💎 الإحصائيات العالمية (ماسي حصري)</h3>
              {data.top_commands_global.map((c,i)=>{
                const max=data.top_commands_global[0]?.count||1;
                return (
                  <div key={c.command} className="chart-bar-wrap">
                    <span style={{width:16,textAlign:"center",fontSize:11,color:"var(--cyan)",flexShrink:0}}>#{i+1}</span>
                    <code style={{fontSize:11,color:"var(--cyan)",width:100,flexShrink:0}}>/{c.command}</code>
                    <div className="chart-bar-bg">
                      <div className="chart-bar-fill" style={{width:`${(c.count/max)*100}%`,background:"var(--cyan)"}}/>
                    </div>
                    <span style={{fontSize:11,color:"var(--muted)",flexShrink:0}}>{c.count?.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </SectionWrapper>
  );
}

// ══════════════════════════════════════
//  OVERVIEW SECTION
// ══════════════════════════════════════
function OverviewSection({guild, guildPlan, settings, onSection}) {
  const plan = PLANS.find(p=>p.id===guildPlan)||PLANS[0];
  const sectionBtns = [
    {id:"moderation",icon:"🛡",label:"الإشراف",   color:"var(--green)"},
    {id:"logs",      icon:"📋",label:"السجلات",   color:"var(--blue)"},
    {id:"protection",icon:"🔒",label:"الحماية",   color:"var(--red)"},
    {id:"welcome",   icon:"🤝",label:"الترحيب",   color:"var(--cyan)"},
    {id:"tickets",   icon:"🎫",label:"التذاكر",   color:"var(--purple)"},
    {id:"economy",   icon:"💰",label:"الاقتصاد",  color:"var(--gold)"},
    {id:"xp",        icon:"⭐",label:"XP",         color:"var(--purple)"},
    {id:"ai",        icon:"🤖",label:"الذكاء",    color:"var(--blue)"},
  ];
  return (
    <div className="fade-in">
      <div style={{marginBottom:24}}>
        <div className="tag tag-blue" style={{marginBottom:10}}>لوحة التحكم</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:26,fontWeight:900}}>{guild.name}</h1>
        <p style={{color:"var(--muted)",marginTop:5,fontSize:13}}>
          خطة <span style={{color:plan.color,fontWeight:700}}>{plan.icon} {plan.name}</span>
          {plan.ai_limit>0&&<span style={{marginRight:10,color:"var(--blue)"}}>• AI: {plan.ai_limit} رسالة/يوم</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{marginBottom:24}}>
        {[
          {label:"الأنظمة النشطة",   value:`${[settings?.ai,settings?.xp,settings?.economy].filter(Boolean).length}/3`,color:"var(--blue)",  icon:"⚡"},
          {label:"الذكاء الاصطناعي",value:settings?.ai?"مفعّل":"متوقف",                                               color:settings?.ai?"var(--green)":"var(--red)",   icon:"🤖"},
          {label:"نظام XP",          value:settings?.xp?"مفعّل":"متوقف",                                               color:settings?.xp?"var(--green)":"var(--red)",   icon:"⭐"},
          {label:"الاقتصاد",         value:settings?.economy?"مفعّل":"متوقف",                                          color:settings?.economy?"var(--green)":"var(--red)",icon:"💰"},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div style={{fontSize:24,marginBottom:5}}>{s.icon}</div>
            <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="card" style={{padding:20,marginBottom:18}}>
        <h3 style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>الأقسام</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
          {sectionBtns.map(s=>{
            const sec=SECTIONS.find(x=>x.id===s.id);
            const locked=sec&&!canUsePlan(guildPlan,sec.plan);
            return (
              <button key={s.id} onClick={()=>!locked&&onSection(s.id)}
                className="btn btn-ghost"
                style={{justifyContent:"flex-start",gap:8,padding:"10px 13px",
                  border:`1px solid ${locked?"var(--border)":s.color+"44"}`,
                  color:locked?"var(--muted)":s.color,opacity:locked?.55:1}}>
                <span style={{fontSize:16}}>{s.icon}</span>
                <span style={{fontSize:12}}>{s.label}</span>
                {locked&&<span style={{marginRight:"auto",fontSize:9}}>🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Systems status */}
      <div className="card" style={{padding:20}}>
        <h3 style={{fontSize:13,color:"var(--muted)",marginBottom:14}}>حالة الأنظمة</h3>
        {[
          {name:"الذكاء الاصطناعي",   active:settings?.ai,      plan:"gold",   desc:`${plan.ai_limit||0} رسالة/يوم`},
          {name:"XP والمستويات",      active:settings?.xp,      plan:"silver", desc:"تتبع نشاط الأعضاء"},
          {name:"الاقتصاد",           active:settings?.economy, plan:"gold",   desc:"عملات وسوق متكامل"},
        ].map((s,i)=>(
          <div key={s.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"11px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div className="pulse-dot" style={{background:s.active?"var(--green)":"var(--red)",
                boxShadow:s.active?"0 0 8px var(--green)":"none"}}/>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{s.name}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{s.desc}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              {!canUsePlan(guildPlan,s.plan)&&
                <span className="tag tag-muted" style={{fontSize:9}}>🔒 {PLANS.find(p=>p.id===s.plan)?.name}+</span>}
              <span className={`tag ${s.active?"tag-green":"tag-blue"}`} style={{fontSize:9}}>
                {s.active?"نشط":"متوقف"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  SUBSCRIPTIONS SECTION
// ══════════════════════════════════════
function SubscriptionsSection({userId, userSubscription, onNotif, onRefresh}) {
  const [step,setStep]=useState("plans");
  const [selectedPlan,setSelectedPlan]=useState(null);
  const [refNumber,setRefNumber]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const activePlanId=userSubscription?.status==="active"?userSubscription.plan_id:"free";
  const isActive=userSubscription?.status==="active";

  const handleSelect=(plan)=>{
    if(plan.id==="free") return;
    if(plan.id===activePlanId&&isActive){onNotif("هذه خطتك الحالية");return;}
    setSelectedPlan(plan);setRefNumber("");setStep("payment");
  };
  const handleSubmit=async()=>{
    if(!refNumber.trim()){onNotif("⚠ أدخل رقم العملية");return;}
    setSubmitting(true);
    try{
      const r=await authFetch(`${API}/api/payment-requests`,{method:"POST",body:JSON.stringify({planId:selectedPlan.id,refNumber:refNumber.trim()})});
      const d=await r.json();
      if(d.success){setStep("done");onRefresh&&onRefresh();}
      else onNotif(d.error||"حدث خطأ");
    }catch{onNotif("❌ خطأ في الاتصال");}
    setSubmitting(false);
  };

  if(step==="done") return (
    <div className="fade-in" style={{textAlign:"center",maxWidth:480,margin:"0 auto",padding:"60px 20px"}}>
      <div style={{fontSize:64,marginBottom:20}}>✅</div>
      <h2 style={{fontSize:24,fontWeight:900,marginBottom:12}}>تم إرسال الطلب!</h2>
      <p style={{color:"var(--muted)",lineHeight:1.8,marginBottom:28}}>سيتم مراجعة طلبك خلال 24 ساعة وتفعيل الاشتراك. شكراً! 🙏</p>
      <button className="btn btn-blue" onClick={()=>{setStep("plans");setRefNumber("");}}>← العودة للخطط</button>
    </div>
  );

  if(step==="payment") return (
    <div className="fade-in" style={{maxWidth:600,margin:"0 auto"}}>
      <button onClick={()=>setStep("plans")} style={{background:"none",border:"none",color:"var(--blue)",cursor:"pointer",fontSize:14,marginBottom:20,display:"flex",alignItems:"center",gap:7,fontFamily:"'Tajawal',sans-serif"}}>
        ← رجوع
      </button>
      <div className="card" style={{padding:28}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
          <span style={{fontSize:40}}>{selectedPlan?.icon}</span>
          <div>
            <h2 style={{fontSize:20,fontWeight:900}}>خطة {selectedPlan?.name}</h2>
            <div style={{fontSize:26,fontWeight:900,color:selectedPlan?.color}}>
              {selectedPlan?.price} <span style={{fontSize:13,color:"var(--muted)",fontWeight:400}}>ريال/شهر</span>
            </div>
          </div>
        </div>
        <div style={{background:"rgba(0,200,255,.04)",borderRadius:10,padding:18,marginBottom:22,border:"1px solid var(--border)"}}>
          <h3 style={{fontSize:14,fontWeight:700,color:"var(--cyan)",marginBottom:13}}>💳 معلومات التحويل</h3>
          {[["البنك",BANK_INFO.bank],["اسم الحساب",BANK_INFO.accountName],["رقم الحساب",BANK_INFO.accountNumber],["IBAN",BANK_INFO.iban],["Apple Pay",BANK_INFO.applePay]].map(([k,v])=>(
            <div key={k} className="info-row">
              <span style={{color:"var(--muted)",fontSize:13}}>{k}</span>
              <span style={{fontWeight:700,fontFamily:k==="IBAN"||k==="رقم الحساب"?"monospace":"inherit",fontSize:13}}>{v}</span>
            </div>
          ))}
        </div>
        <h3 style={{fontSize:13,fontWeight:700,marginBottom:8}}>📩 أدخل رقم العملية بعد التحويل:</h3>
        <input type="text" placeholder="مثال: 1234567890" value={refNumber} onChange={e=>setRefNumber(e.target.value)} style={{marginBottom:10}}/>
        <div style={{fontSize:11,color:"var(--muted)",padding:"8px 12px",background:"rgba(251,191,36,.05)",borderRadius:7,border:"1px solid rgba(251,191,36,.18)",marginBottom:18}}>
          ⚠️ تأكد من إرسال {selectedPlan?.price} ريال. سيتم التحقق يدوياً خلال 24 ساعة.
        </div>
        <button className="btn btn-gold" onClick={handleSubmit} disabled={submitting||!refNumber.trim()} style={{width:"100%",justifyContent:"center",fontSize:15,padding:"13px 22px"}}>
          {submitting?"⏳ جاري الإرسال...":"✅ تأكيد وإرسال الطلب"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{marginBottom:24}}>
        <div className="tag tag-gold" style={{marginBottom:10}}>الاشتراكات</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:26,fontWeight:900}}>خطط الأسعار</h1>
        <p style={{color:"var(--muted)",marginTop:5,fontSize:13}}>اختر الخطة المناسبة لمجتمعك</p>
      </div>
      {isActive&&(
        <div className="card" style={{padding:18,marginBottom:24,borderColor:"var(--green)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:28}}>👑</span>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>اشتراكك الحالي: <span style={{color:"var(--gold)"}}>{PLANS.find(p=>p.id===activePlanId)?.name}</span></div>
              <div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>ينتهي: {userSubscription?.expires_at?new Date(userSubscription.expires_at).toLocaleDateString("ar-SA"):"غير محدد"}</div>
            </div>
            <div className="tag tag-green" style={{marginRight:"auto"}}>✓ مفعّل</div>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginBottom:40}}>
        {PLANS.map(plan=>{
          const isCurrent=plan.id===activePlanId&&isActive;
          return (
            <div key={plan.id} className={`plan-card${plan.popular?" popular":""}${isCurrent?" current":""}${plan.id==="diamond"?" diamond-plan":""}`} onClick={()=>handleSelect(plan)}>
              {plan.popular&&<div className="plan-badge" style={{background:"linear-gradient(135deg,#92400e,#fbbf24)",color:"#000"}}>⭐ الأكثر طلباً</div>}
              {isCurrent&&<div className="plan-badge" style={{background:"linear-gradient(135deg,#065f46,#22d3a2)",color:"#000"}}>✓ خطتك</div>}
              <div style={{fontSize:38,marginBottom:12,textAlign:"center"}}>{plan.icon}</div>
              <div style={{fontSize:18,fontWeight:900,color:plan.color,marginBottom:8,textAlign:"center"}}>{plan.name}</div>
              <div style={{textAlign:"center",marginBottom:16}}>
                {plan.price===0
                  ?<span style={{fontSize:24,fontWeight:900}}>مجاني</span>
                  :<><span style={{fontSize:30,fontWeight:900,color:plan.color}}>{plan.price}</span><span style={{fontSize:12,color:"var(--muted)"}}> ريال/شهر</span></>
                }
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
                {plan.features.map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"flex-start",gap:7,fontSize:12}}>
                    <span style={{color:"var(--green)",flexShrink:0,fontSize:11,marginTop:2}}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              {plan.id!=="free"&&!isCurrent&&(
                <button className="btn btn-blue" style={{width:"100%",justifyContent:"center",
                  background:`linear-gradient(135deg,${plan.color}99,${plan.color})`,
                  color:plan.id==="gold"?"#000":"#fff",fontSize:13,padding:"10px 0"}}>
                  اشترك الآن
                </button>
              )}
              {isCurrent&&<div style={{textAlign:"center",color:"var(--green)",fontWeight:700,padding:"8px 0",fontSize:13}}>✓ مفعّل حالياً</div>}
              {plan.id==="free"&&!isCurrent&&<div style={{textAlign:"center",color:"var(--muted)",fontSize:12,padding:"8px 0"}}>خطتك الافتراضية</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  ADMIN PAYMENT REQUESTS
// ══════════════════════════════════════
function AdminPaymentRequests({onNotif}) {
  const [requests,setRequests]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState("pending");
  const statusInfo={pending:{label:"قيد المراجعة",cls:"tag-gold"},approved:{label:"مفعّل",cls:"tag-green"},rejected:{label:"مرفوض",cls:"tag-red"}};
  const load=async()=>{
    setLoading(true);
    try{const r=await authFetch(`${API}/api/admin/payment-requests`);setRequests(await r.json());}
    catch{setRequests([]);}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  const action=async(id,act)=>{
    try{
      const r=await authFetch(`${API}/api/admin/payment-requests/${id}/${act}`,{method:"POST"});
      const d=await r.json();
      if(d.success){onNotif(act==="approve"?"✅ تم تفعيل الاشتراك":"❌ تم رفض الطلب");load();}
      else onNotif(d.error||"حدث خطأ");
    }catch{onNotif("خطأ");}
  };
  const filtered=requests.filter(r=>filter==="all"||r.status===filter);
  const pending=requests.filter(r=>r.status==="pending").length;
  return (
    <div className="fade-in">
      <div style={{marginBottom:24}}>
        <div className="tag tag-red" style={{marginBottom:10}}>👑 الإدارة</div>
        <h1 style={{fontFamily:"'Tajawal',sans-serif",fontSize:26,fontWeight:900}}>
          طلبات الدفع {pending>0&&<span style={{marginRight:10,background:"var(--red)",color:"#fff",fontSize:12,padding:"2px 10px",borderRadius:20}}>{pending} جديد</span>}
        </h1>
      </div>
      <div style={{display:"flex",gap:9,marginBottom:20,flexWrap:"wrap"}}>
        <button className="btn btn-blue" style={{padding:"7px 13px",fontSize:12}} onClick={load}>🔄 تحديث</button>
        {["all","pending","approved","rejected"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`btn ${filter===f?"btn-blue":"btn-ghost"}`} style={{padding:"7px 13px",fontSize:12}}>
            {f==="all"?"الكل":statusInfo[f]?.label}
            {f!=="all"&&<span style={{opacity:.7}}> ({requests.filter(r=>r.status===f).length})</span>}
          </button>
        ))}
      </div>
      {loading&&<div style={{color:"var(--muted)",padding:28,textAlign:"center"}}>⏳ جاري التحميل...</div>}
      {!loading&&filtered.length===0&&(
        <div className="card" style={{padding:40,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12,opacity:.35}}>📭</div>
          <p style={{color:"var(--muted)"}}>لا توجد طلبات</p>
        </div>
      )}
      {!loading&&filtered.map(req=>{
        const plan=PLANS.find(p=>p.id===req.plan_id);
        const si=statusInfo[req.status]||{label:req.status,cls:"tag-blue"};
        return (
          <div key={req.id} className="card" style={{padding:"18px 22px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:13}}>
                <span style={{fontSize:28}}>{plan?.icon||"💳"}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>
                    <span style={{color:"var(--cyan)",fontFamily:"monospace",fontSize:13}}>{req.user_id}</span>
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:2}}>الخطة: <span style={{color:plan?.color}}>{plan?.name}</span> — {plan?.price} ريال</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>رقم العملية: <span style={{fontFamily:"monospace",color:"var(--text)",fontWeight:600}}>{req.ref_number}</span></div>
                  <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{new Date(req.created_at).toLocaleDateString("ar-SA")} — {new Date(req.created_at).toLocaleTimeString("ar-SA")}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:9}}>
                <span className={`tag ${si.cls}`}>{si.label}</span>
                {req.status==="pending"&&(
                  <div style={{display:"flex",gap:7}}>
                    <button className="btn btn-green" style={{padding:"6px 12px",fontSize:11}} onClick={()=>action(req.id,"approve")}>✅ تفعيل</button>
                    <button className="btn btn-red"   style={{padding:"6px 12px",fontSize:11}} onClick={()=>action(req.id,"reject")}>❌ رفض</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════
//  HOME PAGE
// ══════════════════════════════════════
function Home() {
  const login=()=>{ window.location.href=`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`; };
  const features=[
    {icon:"🤖",label:"ذكاء اصطناعي",  desc:"ردود ذكية متقدمة",       color:"var(--blue)"},
    {icon:"⭐", label:"نظام XP",        desc:"مستويات وتطور",           color:"var(--purple)"},
    {icon:"💰", label:"الاقتصاد",       desc:"عملات وسوق متكامل",      color:"var(--gold)"},
    {icon:"🛡", label:"الإشراف",        desc:"حماية السيرفر",          color:"var(--green)"},
    {icon:"⚙️", label:"داشبورد أسطوري", desc:"تحكم كامل من الويب",    color:"var(--cyan)"},
    {icon:"🔒", label:"خطط مميزة",      desc:"ميزات حصرية للمشتركين",  color:"var(--red)"},
  ];
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",padding:"40px 20px"}}>
      <div className="grid-bg"/><div className="scanlines"/><Particles/>
      <div className="fade-in" style={{marginBottom:24,position:"relative",zIndex:2}}>
        <div className="tag tag-blue" style={{fontSize:10}}>
          <div className="pulse-dot" style={{width:6,height:6}}/> النظام يعمل
        </div>
      </div>
      <div style={{position:"relative",zIndex:2,textAlign:"center",marginBottom:14}}>
        <h1 className="fade-in fade-in-1" style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(32px,7vw,68px)",fontWeight:900,letterSpacing:"4px",lineHeight:1,background:"linear-gradient(135deg,#fff 0%,var(--blue) 50%,var(--cyan) 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          CONTROL PANEL
        </h1>
        <p className="fade-in fade-in-2" style={{fontSize:16,color:"var(--muted)",marginTop:10}}>لوحة تحكم بوت Lyn المتطور</p>
      </div>
      <p className="fade-in fade-in-2" style={{maxWidth:440,textAlign:"center",color:"var(--muted)",fontSize:15,lineHeight:1.8,marginBottom:40,position:"relative",zIndex:2}}>
        أدر سيرفرك من مكان واحد. تحكم في كل أمر، غيّر الأسماء، اضبط البريفكس، وتابع الإحصائيات.
      </p>
      <div className="fade-in fade-in-3" style={{position:"relative",zIndex:2,marginBottom:56}}>
        <button className="btn btn-discord" onClick={login}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.085.12 18.11.144 18.13a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
          تسجيل الدخول بـ Discord
        </button>
      </div>
      <div className="fade-in fade-in-4" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,maxWidth:860,width:"100%",position:"relative",zIndex:2}}>
        {features.map(f=>(
          <div key={f.label} className="card glow" style={{padding:"18px 13px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:9}}>{f.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:f.color,marginBottom:4}}>{f.label}</div>
            <div style={{fontSize:11,color:"var(--muted)"}}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  CALLBACK
// ══════════════════════════════════════
function Callback() {
  const navigate=useNavigate();
  const [status,setStatus]=useState("جاري التحقق...");
  const ran=useRef(false);
  useEffect(()=>{
    if(ran.current) return; ran.current=true;
    const code=new URLSearchParams(window.location.search).get("code");
    if(!code){navigate("/");return;}
    (async()=>{
      try{
        setStatus("جاري الاتصال بـ Discord...");
        const r=await fetch(`${API}/api/auth/callback?code=${code}`);
        const d=await r.json();
        if(!d?.user||!d?.token) throw new Error("فشل");
        setStatus("جاري تحميل البيانات...");
        localStorage.setItem("session_token",d.token);
        localStorage.setItem("user",JSON.stringify(d.user));
        localStorage.setItem("guilds",JSON.stringify(d.guilds||[]));
        setTimeout(()=>navigate("/dashboard"),600);
      }catch{
        setStatus("فشل تسجيل الدخول، جاري الإعادة...");
        setTimeout(()=>navigate("/"),2000);
      }
    })();
  },[navigate]);
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div className="grid-bg"/><Particles/>
      <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
        <div style={{width:72,height:72,margin:"0 auto 28px"}}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="32" fill="none" stroke="rgba(0,200,255,0.1)" strokeWidth="4"/>
            <circle cx="36" cy="36" r="32" fill="none" stroke="var(--blue)" strokeWidth="4"
              strokeDasharray="201" strokeDashoffset="150" strokeLinecap="round"
              style={{animation:"spin 1.4s linear infinite",transformOrigin:"center"}}/>
          </svg>
        </div>
        <p style={{fontSize:15,color:"var(--blue)"}}>{status}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
function Dashboard() {
  const navigate=useNavigate();
  const [activeSection,setActiveSection]=useState("overview");
  const [selectedGuild,setSelectedGuild]=useState(null);
  const [settings,setSettings]=useState({ai:true,xp:true,economy:true});
  const [notif,setNotif]=useState("");
  const [saving,setSaving]=useState(false);
  const [userSubscription,setUserSubscription]=useState(null);
  const [guildPlan,setGuildPlan]=useState("free");

  let user=null,guilds=[];
  try{user=JSON.parse(localStorage.getItem("user"));}catch{}
  try{guilds=JSON.parse(localStorage.getItem("guilds"))||[];}catch{}
  const token=localStorage.getItem("session_token");
  const isOwner=user?.id===(process.env.REACT_APP_OWNER_ID||"529320108032786433");

  useEffect(()=>{if(!user||!token)navigate("/");},[user,token,navigate]);

  const fetchSub=()=>{
    if(!user?.id) return;
    authFetch(`${API}/api/subscription/${user.id}`)
      .then(r=>r.json()).then(d=>{if(!d.error)setUserSubscription(d);}).catch(()=>{});
  };
  useEffect(()=>{fetchSub();},[user?.id]);

  const selectGuild=async(g)=>{
    setSelectedGuild(g);setActiveSection("overview");
    try{
      await authFetch(`${API}/api/guild/save`,{method:"POST",body:JSON.stringify({guildId:g.id})});
      const [sr,pr]=await Promise.all([
        authFetch(`${API}/api/guild/${g.id}/settings`),
        authFetch(`${API}/api/guild/${g.id}/plan`),
      ]);
      const sd=await sr.json(); const pd=await pr.json();
      if(sd&&!sd.error) setSettings({ai:sd.ai??true,xp:sd.xp??true,economy:sd.economy??true});
      setGuildPlan(pd.plan_id||"free");
    }catch{}
  };

  const saveSettings=async(newS)=>{
    setSettings(newS);setSaving(true);
    try{
      await authFetch(`${API}/api/guild/${selectedGuild.id}/settings`,{method:"POST",body:JSON.stringify(newS)});
      setNotif("✅ تم حفظ الإعدادات");
    }catch{setNotif("❌ خطأ في الحفظ");}
    setSaving(false);
  };

  const logout=()=>{localStorage.clear();navigate("/");};

  const currentPlan=PLANS.find(p=>p.id===(userSubscription?.status==="active"?userSubscription.plan_id:"free"))||PLANS[0];

  // Nav items مقسمة
  const navGroups = [
    { label:"الرئيسية", items:[
      {id:"overview",    icon:"⚡",  label:"نظرة عامة"},
    ]},
    { label:"الإدارة", items:[
      {id:"moderation",  icon:"🛡",  label:"الإشراف",          plan:"free"},
      {id:"logs",        icon:"📋",  label:"السجلات",           plan:"silver"},
      {id:"protection",  icon:"🔒",  label:"الحماية",           plan:"gold"},
      {id:"welcome",     icon:"🤝",  label:"الترحيب",           plan:"silver"},
      {id:"tickets",     icon:"🎫",  label:"التذاكر",           plan:"gold"},
      {id:"roles",       icon:"🎭",  label:"الرتب",             plan:"silver"},
    ]},
    { label:"الأعضاء", items:[
      {id:"xp",          icon:"⭐",  label:"XP والمستويات",     plan:"silver"},
      {id:"economy",     icon:"💰",  label:"الاقتصاد",          plan:"gold"},
      {id:"events",      icon:"🎉",  label:"الفعاليات",         plan:"gold"},
    ]},
    { label:"معلومات وأدوات", items:[
      {id:"stats",       icon:"📊",  label:"إحصائيات السيرفر",  plan:"silver"},
      {id:"ai",          icon:"🤖",  label:"الذكاء الاصطناعي", plan:"gold"},
      {id:"info",        icon:"ℹ️",  label:"المعلومات",         plan:"free"},
      {id:"analytics",   icon:"📈",  label:"إحصائيات متقدمة",  plan:"diamond"},
    ]},
    { label:"التخصيص", items:[
      {id:"admin",       icon:"⚙️",  label:"الإعدادات",         plan:"free"},
      {id:"prefix",      icon:"🔷", label:"البريفكس",           plan:"silver"},
    ]},
    { label:"الاشتراك", items:[
      {id:"subscriptions",icon:"👑",label:"الاشتراكات"},
      ...(isOwner?[{id:"payment-requests",icon:"🔐",label:"طلبات الدفع"}]:[]),
    ]},
  ];

  const renderSection=()=>{
    if(!selectedGuild && activeSection!=="subscriptions" && activeSection!=="payment-requests") return (
      <div className="fade-in" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"65vh",textAlign:"center",gap:18}}>
        <div style={{fontSize:72,opacity:.25}}>🌐</div>
        <h2 style={{fontFamily:"'Tajawal',sans-serif",fontSize:22,fontWeight:900,color:"var(--muted)"}}>اختر سيرفراً</h2>
        <p style={{color:"var(--muted)",maxWidth:320,fontSize:13}}>اختر سيرفراً من القائمة الجانبية لعرض لوحة التحكم</p>
        {guilds.length===0&&<div className="tag tag-gold">⚠ لا توجد سيرفرات بصلاحية مدير</div>}
      </div>
    );

    const p={guild:selectedGuild,guildPlan,onNotif:setNotif};

    switch(activeSection) {
      case "overview":     return <OverviewSection {...p} settings={settings} onSection={setActiveSection}/>;
      case "moderation":   return <ModerationSection {...p}/>;
      case "logs":         return <LogsSection {...p}/>;
      case "protection":   return <ProtectionSection {...p}/>;
      case "welcome":      return <WelcomeSection {...p}/>;
      case "tickets":      return <TicketsSection {...p}/>;
      case "roles":        return <RolesSection {...p}/>;
      case "xp":           return <XPSection {...p}/>;
      case "economy":      return <EconomySection {...p}/>;
      case "events":       return <EventsSection {...p}/>;
      case "stats":        return <StatsSection {...p}/>;
      case "ai":           return <AISection {...p} settings={settings} onSaveSettings={saveSettings}/>;
      case "info":         return <InfoSection {...p}/>;
      case "analytics":    return <AnalyticsSection {...p}/>;
      case "admin":        return <AdminSection {...p} settings={settings} onSaveSettings={saveSettings}/>;
      case "prefix":       return <PrefixSection {...p}/>;
      case "subscriptions":return <SubscriptionsSection userId={user?.id} userSubscription={userSubscription} onNotif={setNotif} onRefresh={fetchSub}/>;
      case "payment-requests": return isOwner?<AdminPaymentRequests onNotif={setNotif}/>:null;
      default:             return null;
    }
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",position:"relative"}}>
      <div className="grid-bg"/><div className="scanlines"/><Particles/>
      <Notif msg={notif} onClose={()=>setNotif("")}/>

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar" style={{zIndex:10,order:2}}>
        {/* Logo */}
        <div style={{padding:"16px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,fontWeight:900,color:"var(--blue)",letterSpacing:3}}>LYN</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",letterSpacing:3}}>CONTROL v5.0</div>
          </div>
          <div className="pulse-dot" style={{width:7,height:7}}/>
        </div>

        {/* User */}
        <div style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:9}}>
          {user?.avatar
            ?<img src={user.avatar} alt="" width={32} height={32} style={{borderRadius:"50%",border:"2px solid var(--blue)",flexShrink:0}}/>
            :<div style={{width:32,height:32,borderRadius:"50%",background:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--blue)",color:"var(--blue)",fontWeight:700,flexShrink:0}}>{user?.username?.[0]?.toUpperCase()}</div>
          }
          <div style={{overflow:"hidden",flex:1}}>
            <div style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.username}</div>
            <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
              <span className="tag tag-green" style={{fontSize:8,padding:"1px 5px"}}><div className="pulse-dot" style={{width:4,height:4}}/> مدير</span>
              {isOwner&&<span className="tag tag-red" style={{fontSize:8,padding:"1px 5px"}}>👑 مالك</span>}
              <span className="tag" style={{fontSize:8,padding:"1px 5px",color:currentPlan.color,background:`${currentPlan.color}18`,border:`1px solid ${currentPlan.color}33`}}>
                {currentPlan.icon} {currentPlan.name}
              </span>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        {selectedGuild && (
          <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
            {navGroups.map(group=>(
              <div key={group.label}>
                <div className="section-lbl">{group.label}</div>
                {group.items.map(n=>{
                  const locked=n.plan&&!canUsePlan(guildPlan,n.plan);
                  return (
                    <div key={n.id} className={`nav-item${activeSection===n.id?" active":""}`}
                      onClick={()=>setActiveSection(n.id)}
                      style={{color:locked?"var(--muted)":undefined,opacity:locked?.6:1}}>
                      <span style={{fontSize:14}}>{n.icon}</span>
                      <span style={{flex:1,fontSize:13}}>{n.label}</span>
                      {locked&&<span className="lock-badge">🔒</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {!selectedGuild && (
          <div style={{flex:1,padding:"6px 8px"}}>
            {[{id:"subscriptions",icon:"👑",label:"الاشتراكات"},...(isOwner?[{id:"payment-requests",icon:"🔐",label:"طلبات الدفع"}]:[])].map(n=>(
              <div key={n.id} className={`nav-item${activeSection===n.id?" active":""}`} onClick={()=>setActiveSection(n.id)}>
                <span style={{fontSize:14}}>{n.icon}</span><span style={{fontSize:13}}>{n.label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{flex:selectedGuild?"0":"1"}}/>

        {/* Guilds */}
        <div style={{padding:"8px 8px 0",borderTop:"1px solid var(--border)"}}>
          <div className="section-lbl">السيرفرات ({guilds.length})</div>
          <div style={{maxHeight:170,overflowY:"auto"}}>
            {guilds.slice(0,12).map(g=>(
              <div key={g.id} className={`guild-item${selectedGuild?.id===g.id?" active":""}`} onClick={()=>selectGuild(g)}>
                {g.icon
                  ?<img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" width={26} height={26} style={{borderRadius:7,flexShrink:0}}/>
                  :<div style={{width:26,height:26,borderRadius:7,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"var(--blue)",fontWeight:700,flexShrink:0}}>{g.name.slice(0,2)}</div>
                }
                <div style={{overflow:"hidden",flex:1}}>
                  <div style={{fontSize:11,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</div>
                </div>
                {selectedGuild?.id===g.id&&<div className="pulse-dot" style={{width:5,height:5}}/>}
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:"8px"}}>
          <div className="nav-item" onClick={logout} style={{color:"var(--red)"}}>
            <span>⎋</span><span style={{fontSize:13}}>تسجيل الخروج</span>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{flex:1,padding:"28px 32px",overflowY:"auto",zIndex:2,minHeight:"100vh",order:1,maxWidth:"calc(100% - 260px)"}}>
        {renderSection()}
      </main>
    </div>
  );
}

// ══════════════════════════════════════
//  APP ROOT
// ══════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <GlobalStyle/>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/callback" element={<Callback/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </BrowserRouter>
  );
}