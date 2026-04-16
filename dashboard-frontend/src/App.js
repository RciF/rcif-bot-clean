import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:4000";
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || "1480292734353805373";
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || "http://localhost:3000/callback";

const PLANS = [
  { id: "free",    name: "مجاني", price: 0,   color: "var(--muted)", icon: "🆓", guildLimit: 1,
    features: ["الأوامر الأساسية", "الإشراف الكامل", "سيرفر واحد"] },
  { id: "silver",  name: "فضي",   price: 29,  color: "#94a3b8",      icon: "🥈", guildLimit: 1, popular: false,
    features: ["كل مميزات المجاني", "تغيير أسماء الأوامر", "بريفكس مخصص", "دعم أولوي"] },
  { id: "gold",    name: "ذهبي",  price: 79,  color: "var(--gold)",  icon: "👑", guildLimit: 1, popular: true,
    features: ["كل مميزات الفضي", "الاقتصاد الكامل", "الذكاء الاصطناعي", "إحصائيات متقدمة"] },
  { id: "diamond", name: "ماسي",  price: 149, color: "var(--cyan)",  icon: "💎", guildLimit: 1,
    features: ["جميع المميزات", "API خاص", "دعم 24/7", "بوت مخصص"] },
];

const PLAN_HIERARCHY = { free: 0, silver: 1, gold: 2, diamond: 3 };
const canUsePlan = (guildPlan, required) =>
  (PLAN_HIERARCHY[guildPlan] ?? 0) >= (PLAN_HIERARCHY[required] ?? 0);

const BANK_INFO = {
  bank: "بنك الراجحي", accountName: "ALI TAWI A",
  accountNumber: "107000010006086076681",
  iban: "SA55 8000 0107 6080 1607 6681", applePay: "+966509992372",
};

const CATEGORY_META = {
  moderation: { label: "الإشراف",           icon: "🛡", color: "var(--green)"  },
  economy:    { label: "الاقتصاد",           icon: "💰", color: "var(--gold)"   },
  ai:         { label: "الذكاء الاصطناعي",  icon: "🤖", color: "var(--blue)"   },
  info:       { label: "المعلومات",          icon: "📊", color: "var(--purple)" },
};

function authHeaders() {
  const token = localStorage.getItem("session_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function authFetch(url, options = {}) {
  return fetch(url, { ...options, headers: { ...authHeaders(), ...options.headers } });
}

// ═══════════════════════════════════════════
//  GLOBAL STYLES
// ═══════════════════════════════════════════
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:#030712; --bg2:#0a0f1e; --bg3:#0d1525;
      --panel:rgba(13,21,37,0.92); --border:rgba(0,200,255,0.15); --border2:rgba(0,200,255,0.4);
      --blue:#00c8ff; --cyan:#00ffe7; --purple:#a855f7; --gold:#fbbf24;
      --red:#f43f5e; --green:#22d3a2; --text:#e2e8f0; --muted:#64748b;
      --glow:0 0 24px rgba(0,200,255,0.45),0 0 48px rgba(0,200,255,0.15);
      --glow-gold:0 0 24px rgba(251,191,36,0.4); --glow-green:0 0 20px rgba(34,211,162,0.4);
      --glow-red:0 0 20px rgba(244,63,94,0.4); --r:12px;
    }

    html { scroll-behavior:smooth; }
    body { background:var(--bg); color:var(--text); font-family:'Tajawal',sans-serif;
      font-size:16px; min-height:100vh; overflow-x:hidden; direction:rtl; }

    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:var(--bg2); }
    ::-webkit-scrollbar-thumb { background:linear-gradient(var(--blue),var(--cyan)); border-radius:2px; }

    .grid-bg {
      position:fixed; inset:0; z-index:0; pointer-events:none;
      background-image:linear-gradient(rgba(0,200,255,0.03) 1px,transparent 1px),
        linear-gradient(90deg,rgba(0,200,255,0.03) 1px,transparent 1px);
      background-size:60px 60px;
    }
    .grid-bg::after { content:''; position:absolute; inset:0;
      background:radial-gradient(ellipse 80% 80% at 50% -20%,rgba(0,200,255,0.06),transparent); }

    .scanlines { position:fixed; inset:0; z-index:1; pointer-events:none;
      background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px); }

    @keyframes float-up {
      0%{transform:translateY(0) scale(1);opacity:0} 20%{opacity:1} 80%{opacity:.5}
      100%{transform:translateY(-100vh) scale(.3);opacity:0}
    }
    .particle { position:fixed; width:2px; height:2px; border-radius:50%; pointer-events:none; z-index:0; animation:float-up linear infinite; }

    /* Cards */
    .card {
      background:var(--panel); border:1px solid var(--border); border-radius:var(--r);
      backdrop-filter:blur(20px); transition:border-color .3s,box-shadow .3s; position:relative; overflow:hidden;
    }
    .card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px;
      background:linear-gradient(90deg,transparent,var(--blue),transparent); opacity:.4; }
    .card:hover { border-color:var(--border2); }
    .card.glow:hover { box-shadow:var(--glow); }

    /* Buttons */
    .btn { display:inline-flex; align-items:center; gap:8px; padding:11px 22px;
      border-radius:8px; border:none; font-family:'Tajawal',sans-serif; font-size:14px;
      font-weight:700; cursor:pointer; transition:all .25s; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .btn-blue { background:linear-gradient(135deg,#0066cc,#0088ff); color:#fff; box-shadow:0 0 16px rgba(0,136,255,.35); }
    .btn-blue:hover:not(:disabled) { box-shadow:0 0 28px rgba(0,136,255,.65); transform:translateY(-2px); }
    .btn-green { background:linear-gradient(135deg,#065f46,#059669); color:#fff; }
    .btn-green:hover:not(:disabled) { box-shadow:var(--glow-green); transform:translateY(-2px); }
    .btn-red { background:linear-gradient(135deg,#991b1b,#f43f5e); color:#fff; }
    .btn-red:hover:not(:disabled) { box-shadow:var(--glow-red); transform:translateY(-2px); }
    .btn-gold { background:linear-gradient(135deg,#92400e,#fbbf24); color:#000; }
    .btn-gold:hover:not(:disabled) { box-shadow:var(--glow-gold); transform:translateY(-2px); }
    .btn-ghost { background:rgba(255,255,255,.04); color:var(--muted); border:1px solid var(--border); }
    .btn-ghost:hover:not(:disabled) { background:rgba(255,255,255,.08); color:var(--text); }
    .btn-discord { background:linear-gradient(135deg,#4752c4,#5865f2); color:#fff;
      box-shadow:0 0 24px rgba(88,101,242,.5); font-size:16px; padding:18px 36px; }
    .btn-discord:hover { box-shadow:0 0 42px rgba(88,101,242,.8); transform:translateY(-3px) scale(1.02); }

    /* Toggle */
    .toggle { position:relative; width:52px; height:28px; background:rgba(0,0,0,.5);
      border-radius:14px; border:1px solid var(--border); cursor:pointer; transition:all .3s; }
    .toggle.on { background:rgba(0,200,255,.2); border-color:var(--blue); box-shadow:var(--glow); }
    .toggle::after { content:''; position:absolute; top:3px; right:3px; width:20px; height:20px;
      border-radius:50%; background:var(--muted); transition:all .3s; }
    .toggle.on::after { right:27px; background:var(--blue); box-shadow:0 0 10px var(--blue); }

    /* Tags */
    .tag { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
    .tag-blue   { background:rgba(0,200,255,.1);   color:var(--blue);   border:1px solid rgba(0,200,255,.3); }
    .tag-purple { background:rgba(168,85,247,.1);  color:var(--purple); border:1px solid rgba(168,85,247,.3); }
    .tag-green  { background:rgba(34,211,162,.1);  color:var(--green);  border:1px solid rgba(34,211,162,.3); }
    .tag-gold   { background:rgba(251,191,36,.1);  color:var(--gold);   border:1px solid rgba(251,191,36,.3); }
    .tag-red    { background:rgba(244,63,94,.1);   color:var(--red);    border:1px solid rgba(244,63,94,.3); }
    .tag-cyan   { background:rgba(0,255,231,.1);   color:var(--cyan);   border:1px solid rgba(0,255,231,.3); }
    .tag-lock   { background:rgba(100,116,139,.1); color:var(--muted);  border:1px solid rgba(100,116,139,.3); }

    @keyframes pulse-ring { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(1.6);opacity:0} }
    .pulse-dot { width:10px; height:10px; border-radius:50%; background:var(--green); position:relative; flex-shrink:0; }
    .pulse-dot::before { content:''; position:absolute; inset:0; border-radius:50%;
      background:var(--green); animation:pulse-ring 2s infinite; }

    .bar-track { height:4px; background:rgba(255,255,255,.05); border-radius:2px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,var(--blue),var(--cyan));
      transition:width .8s cubic-bezier(.4,0,.2,1); box-shadow:0 0 8px var(--blue); }

    @keyframes fadeIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
    .fade-in { animation:fadeIn .5s ease both; }
    .fade-in-1{animation-delay:.08s} .fade-in-2{animation-delay:.16s}
    .fade-in-3{animation-delay:.24s} .fade-in-4{animation-delay:.32s}

    @keyframes slideIn { from{transform:translateX(-120%)} to{transform:translateX(0)} }
    .notification { position:fixed; bottom:24px; left:24px; z-index:9999; padding:14px 20px; border-radius:10px;
      display:flex; align-items:center; gap:10px; background:rgba(13,21,37,.97); border:1px solid var(--green);
      box-shadow:0 0 24px rgba(34,211,162,.35); font-weight:600; animation:slideIn .4s ease; max-width:360px; }
    .notification.error { border-color:var(--red); box-shadow:0 0 24px rgba(244,63,94,.35); }

    /* Sidebar */
    .sidebar { width:270px; flex-shrink:0; height:100vh; position:sticky; top:0;
      display:flex; flex-direction:column; background:rgba(8,13,26,.98);
      border-left:1px solid var(--border); backdrop-filter:blur(24px); }

    .guild-item { display:flex; align-items:center; gap:12px; padding:9px 12px;
      border-radius:10px; cursor:pointer; transition:all .2s; border:1px solid transparent; }
    .guild-item:hover { background:rgba(0,200,255,.05); border-color:var(--border); }
    .guild-item.active { background:rgba(0,200,255,.1); border-color:rgba(0,200,255,.3); }

    .nav-item { display:flex; align-items:center; gap:10px; padding:10px 14px;
      border-radius:8px; color:var(--muted); cursor:pointer; transition:all .2s; font-size:14px; font-weight:500; }
    .nav-item:hover { color:var(--text); background:rgba(255,255,255,.03); }
    .nav-item.active { color:var(--blue); background:rgba(0,200,255,.09); border-right:2px solid var(--blue); }

    /* Plan cards */
    .plan-card { border:2px solid var(--border); border-radius:16px; padding:24px;
      background:var(--panel); transition:all .3s; cursor:pointer; position:relative; overflow:hidden; }
    .plan-card:hover { transform:translateY(-6px); border-color:var(--border2); }
    .plan-card.popular { border-color:var(--gold); box-shadow:0 0 32px rgba(251,191,36,.15); }
    .plan-card.current { border-color:var(--green); box-shadow:0 0 20px rgba(34,211,162,.15); }
    .plan-card.diamond-plan { border-color:var(--cyan); box-shadow:0 0 24px rgba(0,255,231,.12); }
    .plan-badge { position:absolute; top:-1px; right:20px; padding:4px 14px;
      border-radius:0 0 10px 10px; font-size:11px; font-weight:700; letter-spacing:1px; }

    /* Command cards */
    .cmd-card { background:var(--panel); border:1px solid var(--border); border-radius:10px;
      padding:16px; transition:all .25s; position:relative; overflow:hidden; }
    .cmd-card:hover { border-color:var(--border2); box-shadow:var(--glow); }
    .cmd-card.locked { opacity:.65; }
    .cmd-card.locked::after { content:'🔒'; position:absolute; top:8px; left:8px; font-size:13px; }
    .cmd-card.disabled-cmd { opacity:.5; }

    input, select, textarea {
      background:rgba(0,0,0,.35); border:1px solid var(--border); border-radius:8px;
      color:var(--text); padding:10px 14px; font-family:'Tajawal',sans-serif;
      font-size:15px; outline:none; transition:border-color .2s; width:100%; direction:rtl;
    }
    input:focus, select:focus, textarea:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(0,200,255,.1); }
    input:disabled { opacity:.5; cursor:not-allowed; }

    .section-lbl { font-size:10px; font-weight:700; color:var(--muted); letter-spacing:2px;
      text-transform:uppercase; padding:0 14px; margin:10px 0 4px; }
    .divider { height:1px; background:var(--border); margin:10px 0; }
    .info-row { display:flex; justify-content:space-between; align-items:center;
      padding:9px 13px; background:rgba(0,200,255,.04); border-radius:8px; border:1px solid var(--border); margin-bottom:8px; }

    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    .shimmer { background:linear-gradient(90deg,var(--bg3) 25%,rgba(0,200,255,.08) 50%,var(--bg3) 75%);
      background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:6px; }

    /* Search */
    .search-box { position:relative; }
    .search-box input { padding-right:40px; }
    .search-box::before { content:'🔍'; position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:14px; z-index:1; }

    /* Stats grid */
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:14px; }
    .stat-card { background:var(--panel); border:1px solid var(--border); border-radius:10px;
      padding:18px 14px; text-align:center; transition:all .25s; }
    .stat-card:hover { border-color:var(--border2); transform:translateY(-3px); }

    /* Prefix box */
    .prefix-preview { display:inline-flex; align-items:center; gap:4px;
      background:rgba(0,200,255,.08); border:1px solid rgba(0,200,255,.25);
      border-radius:6px; padding:4px 10px; font-family:'Orbitron',sans-serif; font-size:12px; color:var(--cyan); }
  `}</style>
);

// ═══════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════
const Particles = () => {
  const ps = Array.from({ length: 18 }, (_, i) => ({
    id: i, left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 10}s`, duration: `${8 + Math.random() * 12}s`,
    color: i % 3 === 0 ? "#a855f7" : i % 3 === 1 ? "#00ffe7" : "#00c8ff",
  }));
  return <>{ps.map(p => <div key={p.id} className="particle" style={{ left: p.left, bottom: "-10px", animationDelay: p.delay, animationDuration: p.duration, background: p.color, boxShadow: `0 0 6px ${p.color}` }} />)}</>;
};

function Notif({ msg, onClose }) {
  const isError = msg?.startsWith("❌");
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div className={`notification${isError ? " error" : ""}`}>
      <span style={{ color: isError ? "var(--red)" : "var(--green)", fontSize: 20, flexShrink: 0 }}>
        {isError ? "✕" : "✓"}
      </span>
      <span>{msg}</span>
    </div>
  );
}

function PlanBadge({ plan }) {
  const p = PLANS.find(x => x.id === plan);
  if (!p || plan === "free") return null;
  return <span className="tag tag-gold" style={{ fontSize: 10, padding: "2px 7px" }}>{p.icon} {p.name}+</span>;
}

// ═══════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════
function Home() {
  const login = () => {
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  };
  const features = [
    { icon: "🤖", label: "ذكاء اصطناعي",      desc: "ردود ذكية متقدمة",      color: "var(--blue)" },
    { icon: "⚡",  label: "نظام XP",           desc: "مستويات وتطور",          color: "var(--purple)" },
    { icon: "💰", label: "الاقتصاد",           desc: "عملات وسوق متكامل",     color: "var(--gold)" },
    { icon: "🛡", label: "الإشراف",            desc: "حماية السيرفر",          color: "var(--green)" },
    { icon: "⚙",  label: "داشبورد أسطوري",    desc: "تحكم كامل من الويب",    color: "var(--cyan)" },
    { icon: "🔒", label: "خطط مميزة",          desc: "ميزات حصرية للمشتركين", color: "var(--red)" },
  ];
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: "40px 20px" }}>
      <div className="grid-bg" /><div className="scanlines" /><Particles />
      <div className="fade-in" style={{ marginBottom: 28, position: "relative", zIndex: 2 }}>
        <div className="tag tag-blue" style={{ fontSize: 11 }}>
          <div className="pulse-dot" style={{ width: 7, height: 7 }} /> النظام يعمل
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", marginBottom: 16 }}>
        <h1 className="fade-in fade-in-1" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(36px,8vw,72px)", fontWeight: 900, letterSpacing: "4px", lineHeight: 1, background: "linear-gradient(135deg,#fff 0%,var(--blue) 50%,var(--cyan) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          CONTROL PANEL
        </h1>
        <p className="fade-in fade-in-2" style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 17, color: "var(--muted)", marginTop: 12 }}>
          لوحة تحكم بوت Lyn المتطور
        </p>
      </div>
      <p className="fade-in fade-in-2" style={{ maxWidth: 460, textAlign: "center", color: "var(--muted)", fontSize: 16, lineHeight: 1.8, marginBottom: 44, position: "relative", zIndex: 2 }}>
        أدر بوت الديسكورد من مكان واحد. تحكم في الأوامر، غير الأسماء، اضبط البريفكس، وتابع كل شيء.
      </p>
      <div className="fade-in fade-in-3" style={{ position: "relative", zIndex: 2, marginBottom: 60 }}>
        <button className="btn btn-discord" onClick={login}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.085.12 18.11.144 18.13a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          تسجيل الدخول بـ Discord
        </button>
      </div>
      <div className="fade-in fade-in-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14, maxWidth: 900, width: "100%", position: "relative", zIndex: 2 }}>
        {features.map(f => (
          <div key={f.label} className="card glow" style={{ padding: "20px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: f.color, marginBottom: 5 }}>{f.label}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  CALLBACK
// ═══════════════════════════════════════════
function Callback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("جاري التحقق...");
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) { navigate("/"); return; }
    (async () => {
      try {
        setStatus("جاري الاتصال بـ Discord...");
        const res = await fetch(`${API}/api/auth/callback?code=${code}`);
        const data = await res.json();
        if (!data?.user || !data?.token) throw new Error("فشل");
        setStatus("جاري تحميل البيانات...");
        localStorage.setItem("session_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("guilds", JSON.stringify(data.guilds || []));
        setTimeout(() => navigate("/dashboard"), 600);
      } catch {
        setStatus("فشل تسجيل الدخول، جاري الإعادة...");
        setTimeout(() => navigate("/"), 2000);
      }
    })();
  }, [navigate]);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div className="grid-bg" /><Particles />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, margin: "0 auto 32px" }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(0,200,255,0.1)" strokeWidth="4" />
            <circle cx="40" cy="40" r="36" fill="none" stroke="var(--blue)" strokeWidth="4"
              strokeDasharray="226" strokeDashoffset="170" strokeLinecap="round"
              style={{ animation: "spin 1.5s linear infinite", transformOrigin: "center" }} />
          </svg>
        </div>
        <p style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 16, color: "var(--blue)" }}>{status}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  SUBSCRIPTIONS SECTION
// ═══════════════════════════════════════════
function SubscriptionsSection({ userId, userSubscription, onNotif, onRefresh }) {
  const [step, setStep] = useState("plans");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [refNumber, setRefNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const activePlanId = userSubscription?.status === "active" ? userSubscription.plan_id : "free";
  const isActive = userSubscription?.status === "active";

  const handleSelectPlan = (plan) => {
    if (plan.id === "free") return;
    if (plan.id === activePlanId && isActive) { onNotif("هذه خطتك الحالية"); return; }
    setSelectedPlan(plan); setRefNumber(""); setStep("payment");
  };

  const handleSubmit = async () => {
    if (!refNumber.trim()) { onNotif("⚠ أدخل رقم العملية"); return; }
    if (!userId) { onNotif("⚠ خطأ في بيانات المستخدم"); return; }
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/api/payment-requests`, {
        method: "POST", body: JSON.stringify({ planId: selectedPlan.id, refNumber: refNumber.trim() }),
      });
      const data = await res.json();
      if (data.success) { setStep("done"); onRefresh && onRefresh(); }
      else onNotif(data.error || "حدث خطأ، حاول مرة أخرى");
    } catch { onNotif("❌ خطأ في الاتصال بالخادم"); }
    setSubmitting(false);
  };

  if (step === "done") return (
    <div className="fade-in" style={{ textAlign: "center", maxWidth: 500, margin: "0 auto", padding: "80px 20px" }}>
      <div style={{ fontSize: 72, marginBottom: 24 }}>✅</div>
      <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 14 }}>تم إرسال الطلب!</h2>
      <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: 32 }}>سيتم مراجعة طلبك خلال 24 ساعة وتفعيل الاشتراك. شكراً لدعمك! 🙏</p>
      <button className="btn btn-blue" onClick={() => { setStep("plans"); setRefNumber(""); }}>← العودة للخطط</button>
    </div>
  );

  if (step === "payment") return (
    <div className="fade-in" style={{ maxWidth: 640, margin: "0 auto" }}>
      <button onClick={() => setStep("plans")} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: 15, marginBottom: 24, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Tajawal',sans-serif" }}>
        ← رجوع للخطط
      </button>
      <div className="card" style={{ padding: 32, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <span style={{ fontSize: 44 }}>{selectedPlan?.icon}</span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900 }}>خطة {selectedPlan?.name}</h2>
            <div style={{ fontSize: 28, fontWeight: 900, color: selectedPlan?.color }}>
              {selectedPlan?.price} <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 400 }}>ريال / شهر</span>
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(0,200,255,.05)", borderRadius: 12, padding: 20, marginBottom: 28, border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--cyan)" }}>💳 معلومات التحويل البنكي</h3>
          {[
            ["البنك", BANK_INFO.bank], ["اسم الحساب", BANK_INFO.accountName],
            ["رقم الحساب", BANK_INFO.accountNumber], ["IBAN", BANK_INFO.iban],
            ["Apple Pay", BANK_INFO.applePay],
          ].map(([k, v]) => (
            <div key={k} className="info-row">
              <span style={{ color: "var(--muted)" }}>{k}</span>
              <span style={{ fontWeight: 700, fontFamily: k === "IBAN" || k === "رقم الحساب" ? "monospace" : "inherit", fontSize: 13 }}>{v}</span>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📩 بعد التحويل، أدخل رقم العملية:</h3>
        <input type="text" placeholder="مثال: 1234567890" value={refNumber} onChange={e => setRefNumber(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24, padding: "10px 14px", background: "rgba(251,191,36,.05)", borderRadius: 8, border: "1px solid rgba(251,191,36,.2)" }}>
          ⚠️ تأكد من إرسال المبلغ الصحيح ({selectedPlan?.price} ريال). سيتم التحقق يدوياً وتفعيل الاشتراك خلال 24 ساعة.
        </div>
        <button className="btn btn-gold" onClick={handleSubmit} disabled={submitting || !refNumber.trim()} style={{ width: "100%", justifyContent: "center", fontSize: 16, padding: "14px 24px" }}>
          {submitting ? "⏳ جاري الإرسال..." : "✅ تأكيد وإرسال الطلب"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <div className="tag tag-gold" style={{ marginBottom: 12 }}>الاشتراكات</div>
        <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>خطط الأسعار</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>اختر الخطة المناسبة لمجتمعك</p>
      </div>
      {isActive && (
        <div className="card" style={{ padding: 20, marginBottom: 28, borderColor: "var(--green)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>👑</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                اشتراكك الحالي: <span style={{ color: "var(--gold)" }}>{PLANS.find(p => p.id === activePlanId)?.name}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                ينتهي: {userSubscription?.expires_at ? new Date(userSubscription.expires_at).toLocaleDateString("ar-SA") : "غير محدد"}
              </div>
            </div>
            <div className="tag tag-green" style={{ marginRight: "auto" }}>✓ مفعّل</div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20, marginBottom: 48 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === activePlanId && isActive;
          return (
            <div key={plan.id} className={`plan-card ${plan.popular ? "popular" : ""} ${isCurrent ? "current" : ""} ${plan.id === "diamond" ? "diamond-plan" : ""}`} onClick={() => handleSelectPlan(plan)}>
              {plan.popular && <div className="plan-badge" style={{ background: "linear-gradient(135deg,#92400e,#fbbf24)", color: "#000" }}>⭐ الأكثر طلباً</div>}
              {isCurrent && <div className="plan-badge" style={{ background: "linear-gradient(135deg,#065f46,#22d3a2)", color: "#000" }}>✓ خطتك الحالية</div>}
              <div style={{ fontSize: 42, marginBottom: 14, textAlign: "center" }}>{plan.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: plan.color, marginBottom: 10, textAlign: "center" }}>{plan.name}</div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                {plan.price === 0
                  ? <span style={{ fontSize: 28, fontWeight: 900 }}>مجاني</span>
                  : <><span style={{ fontSize: 34, fontWeight: 900, color: plan.color }}>{plan.price}</span><span style={{ fontSize: 14, color: "var(--muted)" }}> ريال/شهر</span></>
                }
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <span style={{ color: "var(--green)", flexShrink: 0, fontSize: 12 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              {plan.id !== "free" && !isCurrent && (
                <button className="btn btn-blue" style={{ width: "100%", justifyContent: "center", background: `linear-gradient(135deg,${plan.color}99,${plan.color})`, color: plan.id === "gold" ? "#000" : "#fff" }}>
                  اشترك الآن
                </button>
              )}
              {isCurrent && <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, padding: "10px 0" }}>✓ مفعّل حالياً</div>}
              {plan.id === "free" && !isCurrent && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, padding: "10px 0" }}>خطتك الافتراضية</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  ADMIN PAYMENT REQUESTS
// ═══════════════════════════════════════════
function AdminPaymentRequests({ onNotif }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const statusInfo = {
    pending:  { label: "قيد المراجعة", cls: "tag-gold" },
    approved: { label: "مفعّل",        cls: "tag-green" },
    rejected: { label: "مرفوض",        cls: "tag-red" },
  };
  const load = async () => {
    setLoading(true);
    try { const res = await authFetch(`${API}/api/admin/payment-requests`); setRequests(await res.json()); }
    catch { setRequests([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const handleAction = async (id, action) => {
    try {
      const res = await authFetch(`${API}/api/admin/payment-requests/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (data.success) { onNotif(action === "approve" ? "✅ تم تفعيل الاشتراك" : "❌ تم رفض الطلب"); load(); }
      else onNotif(data.error || "حدث خطأ");
    } catch { onNotif("خطأ في الاتصال"); }
  };
  const filtered = requests.filter(r => filter === "all" || r.status === filter);
  const pending = requests.filter(r => r.status === "pending").length;
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <div className="tag tag-red" style={{ marginBottom: 12 }}>👑 لوحة الإدارة</div>
        <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>
          طلبات الدفع {pending > 0 && <span style={{ marginRight: 12, background: "var(--red)", color: "#fff", fontSize: 14, padding: "2px 12px", borderRadius: 20 }}>{pending} جديد</span>}
        </h1>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <button className="btn btn-blue" style={{ padding: "8px 16px", fontSize: 13 }} onClick={load}>🔄 تحديث</button>
        {["all", "pending", "approved", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn ${filter === f ? "btn-blue" : "btn-ghost"}`} style={{ padding: "8px 16px", fontSize: 13 }}>
            {f === "all" ? "الكل" : statusInfo[f]?.label}
            {f !== "all" && <span style={{ opacity: .7 }}> ({requests.filter(r => r.status === f).length})</span>}
          </button>
        ))}
      </div>
      {loading && <div style={{ color: "var(--muted)", padding: 32, textAlign: "center" }}>⏳ جاري التحميل...</div>}
      {!loading && filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: .4 }}>📭</div>
          <p style={{ color: "var(--muted)" }}>لا توجد طلبات</p>
        </div>
      )}
      {!loading && filtered.map(req => {
        const plan = PLANS.find(p => p.id === req.plan_id);
        const si = statusInfo[req.status] || { label: req.status, cls: "tag-blue" };
        return (
          <div key={req.id} className="card" style={{ padding: "20px 24px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 32 }}>{plan?.icon || "💳"}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    <span style={{ color: "var(--cyan)", fontFamily: "monospace" }}>{req.user_id}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 2 }}>
                    الخطة: <span style={{ color: plan?.color }}>{plan?.name}</span> — {plan?.price} ريال
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    رقم العملية: <span style={{ fontFamily: "monospace", color: "var(--text)", fontWeight: 600 }}>{req.ref_number}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    {new Date(req.created_at).toLocaleDateString("ar-SA")} — {new Date(req.created_at).toLocaleTimeString("ar-SA")}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                <span className={`tag ${si.cls}`}>{si.label}</span>
                {req.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-green" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => handleAction(req.id, "approve")}>✅ تفعيل</button>
                    <button className="btn btn-red"   style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => handleAction(req.id, "reject")}>❌ رفض</button>
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

// ═══════════════════════════════════════════
//  COMMANDS SECTION — القلب الجديد
// ═══════════════════════════════════════════
function CommandsSection({ guild, guildPlan, onNotif }) {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [editingName, setEditingName] = useState(null);
  const [tempName, setTempName] = useState("");
  const [unsaved, setUnsaved] = useState({});

  const canCustomize = canUsePlan(guildPlan, "silver");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/guild/${guild.id}/commands`);
      const data = await res.json();
      if (data.commands) setCommands(data.commands);
    } catch { onNotif("❌ فشل تحميل الأوامر"); }
    setLoading(false);
  }, [guild.id]);

  useEffect(() => { load(); }, [load]);

  const toggleCommand = async (cmd) => {
    if (cmd.plan_locked) {
      onNotif(`🔒 هذا الأمر يحتاج خطة ${cmd.plan} أو أعلى`); return;
    }
    const newEnabled = !cmd.enabled;
    setSaving(s => ({ ...s, [cmd.name]: true }));
    setCommands(prev => prev.map(c => c.name === cmd.name ? { ...c, enabled: newEnabled } : c));
    try {
      const res = await authFetch(`${API}/api/guild/${guild.id}/commands/${encodeURIComponent(cmd.name)}`, {
        method: "PATCH", body: JSON.stringify({ enabled: newEnabled }),
      });
      const data = await res.json();
      if (!data.success) { onNotif(data.error || "❌ فشل التحديث"); load(); }
      else onNotif(newEnabled ? `✅ تم تفعيل /${cmd.name}` : `⏹ تم تعطيل /${cmd.name}`);
    } catch { onNotif("❌ خطأ في الاتصال"); load(); }
    setSaving(s => ({ ...s, [cmd.name]: false }));
  };

  const startEditName = (cmd) => {
    if (!canCustomize) { onNotif("🔒 تغيير أسماء الأوامر يحتاج خطة فضي أو أعلى"); return; }
    setEditingName(cmd.name);
    setTempName(cmd.custom_name || "");
  };

  const saveCustomName = async (cmd) => {
    setSaving(s => ({ ...s, [cmd.name]: true }));
    setEditingName(null);
    setCommands(prev => prev.map(c => c.name === cmd.name ? { ...c, custom_name: tempName || null } : c));
    try {
      const res = await authFetch(`${API}/api/guild/${guild.id}/commands/${encodeURIComponent(cmd.name)}`, {
        method: "PATCH", body: JSON.stringify({ custom_name: tempName || null }),
      });
      const data = await res.json();
      if (!data.success) { onNotif(data.error || "❌ فشل حفظ الاسم"); load(); }
      else onNotif("✅ تم حفظ الاسم المخصص");
    } catch { onNotif("❌ خطأ في الاتصال"); load(); }
    setSaving(s => ({ ...s, [cmd.name]: false }));
  };

  const resetAll = async () => {
    if (!window.confirm("تأكيد: إعادة كل الأوامر للإعدادات الافتراضية؟")) return;
    try {
      await authFetch(`${API}/api/guild/${guild.id}/commands/reset`, { method: "DELETE" });
      onNotif("✅ تم إعادة كل الأوامر للافتراضي");
      load();
    } catch { onNotif("❌ فشل الإعادة"); }
  };

  const categories = ["all", ...Object.keys(CATEGORY_META)];
  const filtered = commands.filter(cmd => {
    const matchCat = filterCat === "all" || cmd.category === filterCat;
    const matchSearch = !search || cmd.name.includes(search) || (cmd.custom_name || "").includes(search) || cmd.description.includes(search);
    return matchCat && matchSearch;
  });

  const enabledCount = commands.filter(c => c.enabled && !c.plan_locked).length;
  const lockedCount  = commands.filter(c => c.plan_locked).length;

  if (loading) return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <div className="tag tag-blue" style={{ marginBottom: 12 }}>إدارة الأوامر</div>
        <div className="shimmer" style={{ height: 36, width: 260, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 18, width: 180 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {Array(6).fill(0).map((_, i) => <div key={i} className="shimmer" style={{ height: 110, borderRadius: 10 }} />)}
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="tag tag-blue" style={{ marginBottom: 12 }}>إدارة الأوامر</div>
        <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>الأوامر</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>تحكم في كل أمر بشكل مستقل في {guild.name}</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: "مجموع الأوامر",  value: commands.length,       color: "var(--blue)",   icon: "⚡" },
          { label: "مفعّل",          value: enabledCount,           color: "var(--green)",  icon: "✅" },
          { label: "معطّل",          value: commands.length - enabledCount - lockedCount, color: "var(--muted)", icon: "⏹" },
          { label: "مقفول بالخطة",  value: lockedCount,            color: "var(--gold)",   icon: "🔒" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Plan lock notice */}
      {!canCustomize && (
        <div className="card" style={{ padding: "14px 20px", marginBottom: 20, borderColor: "rgba(251,191,36,.3)", background: "rgba(251,191,36,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: 14 }}>تغيير الأسماء يحتاج خطة فضي أو أعلى</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>يمكنك تفعيل/تعطيل الأوامر مجاناً. لتغيير الأسماء اشترك بخطة فضي.</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters + Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
          <input placeholder="ابحث عن أمر..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {categories.map(cat => {
            const meta = CATEGORY_META[cat];
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`btn ${filterCat === cat ? "btn-blue" : "btn-ghost"}`}
                style={{ padding: "8px 14px", fontSize: 12 }}>
                {cat === "all" ? "🔷 الكل" : `${meta.icon} ${meta.label}`}
              </button>
            );
          })}
        </div>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }} onClick={resetAll}>🔄 إعادة ضبط</button>
      </div>

      {/* Commands Grid */}
      {filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: .4 }}>🔍</div>
          <p style={{ color: "var(--muted)" }}>لا توجد أوامر تطابق البحث</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {filtered.map(cmd => {
          const catMeta = CATEGORY_META[cmd.category] || {};
          const isEditing = editingName === cmd.name;
          const isSaving  = saving[cmd.name];
          const displayName = cmd.custom_name || cmd.name;
          return (
            <div key={cmd.name} className={`cmd-card ${cmd.plan_locked ? "locked" : ""} ${!cmd.enabled && !cmd.plan_locked ? "disabled-cmd" : ""}`}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Command name */}
                  {isEditing ? (
                    <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                      <input
                        value={tempName}
                        onChange={e => setTempName(e.target.value)}
                        placeholder={cmd.name}
                        style={{ fontSize: 13, padding: "5px 10px", height: 32 }}
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") saveCustomName(cmd); if (e.key === "Escape") setEditingName(null); }}
                      />
                      <button className="btn btn-green" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => saveCustomName(cmd)}>✓</button>
                      <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setEditingName(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <code style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: catMeta.color || "var(--blue)", fontWeight: 700 }}>
                        /{displayName}
                      </code>
                      {cmd.custom_name && (
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>← /{cmd.name}</span>
                      )}
                      {cmd.plan_locked && <PlanBadge plan={cmd.plan} />}
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{cmd.description}</p>
                </div>
                {/* Toggle */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {isSaving
                    ? <div style={{ width: 52, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--blue)" strokeWidth="2" strokeDasharray="22" strokeDashoffset="8" style={{ animation: "spin .8s linear infinite", transformOrigin: "center" }}/></svg>
                      </div>
                    : <div className={`toggle ${cmd.enabled ? "on" : ""}`} onClick={() => toggleCommand(cmd)} style={cmd.plan_locked ? { opacity: .4, cursor: "not-allowed" } : {}} />
                  }
                  <span style={{ fontSize: 10, color: cmd.enabled ? "var(--green)" : "var(--muted)" }}>
                    {cmd.enabled ? "مفعّل" : "متوقف"}
                  </span>
                </div>
              </div>
              {/* Bottom row: category + edit btn */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                <span className="tag" style={{ background: `${catMeta.color}18`, color: catMeta.color, border: `1px solid ${catMeta.color}33`, fontSize: 10, padding: "2px 8px" }}>
                  {catMeta.icon} {catMeta.label}
                </span>
                {!cmd.plan_locked && !isEditing && (
                  <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }}
                    onClick={() => startEditName(cmd)}
                    title={canCustomize ? "تغيير الاسم" : "يحتاج فضي+"}>
                    ✏ {cmd.custom_name ? "تعديل الاسم" : "اسم مخصص"}
                    {!canCustomize && " 🔒"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  PREFIX SECTION
// ═══════════════════════════════════════════
function PrefixSection({ guild, guildPlan, onNotif }) {
  const [prefix, setPrefix] = useState("!");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canChange = canUsePlan(guildPlan, "silver");

  useEffect(() => {
    authFetch(`${API}/api/guild/${guild.id}/prefix`)
      .then(r => r.json())
      .then(d => { setPrefix(d.prefix || "!"); setInput(d.prefix || "!"); setLoading(false); })
      .catch(() => setLoading(false));
  }, [guild.id]);

  const save = async () => {
    if (!canChange) { onNotif("🔒 البريفكس المخصص يحتاج خطة فضي أو أعلى"); return; }
    if (!input.trim()) { onNotif("⚠ أدخل بريفكس صالح"); return; }
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/guild/${guild.id}/prefix`, {
        method: "POST", body: JSON.stringify({ prefix: input.trim() }),
      });
      const data = await res.json();
      if (data.success) { setPrefix(data.prefix); onNotif(`✅ تم تغيير البريفكس إلى: ${data.prefix}`); }
      else onNotif(data.error || "❌ فشل التحديث");
    } catch { onNotif("❌ خطأ في الاتصال"); }
    setSaving(false);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <div className="tag tag-cyan" style={{ marginBottom: 12 }}>البريفكس</div>
        <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>البريفكس المخصص</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>غيّر رمز أوامر النص في {guild.name}</p>
      </div>

      {!canChange && (
        <div className="card" style={{ padding: "14px 20px", marginBottom: 24, borderColor: "rgba(251,191,36,.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: 14 }}>البريفكس المخصص — خطة فضي أو أعلى</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>الخطة المجانية تستخدم البريفكس الافتراضي (!) فقط.</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 560 }}>
        <div className="card" style={{ padding: 32, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "var(--cyan)" }}>⚙ إعدادات البريفكس</h3>

          {/* Preview */}
          <div style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(0,200,255,.04)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>معاينة الأوامر:</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["حظر", "طرد", "مسح", "رصيد"].map(cmd => (
                <span key={cmd} className="prefix-preview">{input || prefix}{cmd}</span>
              ))}
            </div>
          </div>

          <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
            البريفكس الحالي
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={5}
              placeholder="!"
              disabled={!canChange || loading}
              style={{ flex: 1, fontSize: 22, fontFamily: "'Orbitron',sans-serif", textAlign: "center", letterSpacing: 4 }}
            />
            <button className="btn btn-blue" onClick={save} disabled={saving || !canChange || input === prefix} style={{ flexShrink: 0 }}>
              {saving ? "⏳" : "💾 حفظ"}
            </button>
          </div>

          {input !== prefix && canChange && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--gold)", display: "flex", alignItems: "center", gap: 6 }}>
              ⚠ البريفكس الحالي: <span className="prefix-preview" style={{ fontSize: 11 }}>{prefix}</span>
              ← سيتغير إلى: <span className="prefix-preview" style={{ fontSize: 11, borderColor: "var(--gold)", color: "var(--gold)" }}>{input}</span>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20, borderColor: "rgba(0,200,255,.2)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--cyan)", marginBottom: 14 }}>ℹ معلومات</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <div>• البريفكس يُستخدم مع أوامر النص فقط (وليس Slash Commands)</div>
            <div>• يمكن استخدام أي رمز مثل: <code style={{ color: "var(--cyan)" }}>!</code> <code style={{ color: "var(--cyan)" }}>?</code> <code style={{ color: "var(--cyan)" }}>/</code> <code style={{ color: "var(--cyan)" }}>.</code></div>
            <div>• الحد الأقصى 5 أحرف</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════
function Dashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [settings, setSettings] = useState({ ai: true, xp: true, economy: true });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLB, setLoadingLB] = useState(false);
  const [notif, setNotif] = useState("");
  const [saving, setSaving] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const [guildPlan, setGuildPlan] = useState("free");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  let user = null, guilds = [];
  try { user = JSON.parse(localStorage.getItem("user")); } catch {}
  try { guilds = JSON.parse(localStorage.getItem("guilds")) || []; } catch {}
  const token = localStorage.getItem("session_token");
  const isOwner = user?.id === (process.env.REACT_APP_OWNER_ID || "529320108032786433");

  useEffect(() => { if (!user || !token) navigate("/"); }, [user, token, navigate]);

  const fetchSubscription = () => {
    if (!user?.id) return;
    authFetch(`${API}/api/subscription/${user.id}`)
      .then(r => r.json()).then(d => { if (!d.error) setUserSubscription(d); }).catch(() => {});
  };
  useEffect(() => { fetchSubscription(); }, [user?.id]);

  const selectGuild = async (g) => {
    setSelectedGuild(g); setActiveSection("overview"); setLeaderboard([]);
    try {
      await authFetch(`${API}/api/guild/save`, { method: "POST", body: JSON.stringify({ guildId: g.id }) });
      const [settRes, planRes] = await Promise.all([
        authFetch(`${API}/api/guild/${g.id}/settings`),
        authFetch(`${API}/api/guild/${g.id}/plan`),
      ]);
      const settData = await settRes.json();
      const planData = await planRes.json();
      if (settData && !settData.error) setSettings({ ai: settData.ai ?? true, xp: settData.xp ?? true, economy: settData.economy ?? true });
      setGuildPlan(planData.plan_id || "free");
    } catch {}
  };

  const loadLeaderboard = async () => {
    if (!selectedGuild) return;
    setLoadingLB(true);
    try {
      const res = await authFetch(`${API}/api/economy/top/${selectedGuild.id}`);
      const data = await res.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch { setLeaderboard([]); }
    setLoadingLB(false);
  };

  useEffect(() => {
    if (activeSection === "economy" && selectedGuild) loadLeaderboard();
  }, [activeSection, selectedGuild]);

  const saveSettings = async (newS) => {
    setSettings(newS); setSaving(true);
    try {
      await authFetch(`${API}/api/guild/${selectedGuild.id}/settings`, { method: "POST", body: JSON.stringify(newS) });
      setNotif("✅ تم حفظ الإعدادات بنجاح");
    } catch { setNotif("❌ خطأ في حفظ الإعدادات"); }
    setSaving(false);
  };

  const logout = () => { localStorage.clear(); navigate("/"); };

  const currentPlan = PLANS.find(p => p.id === (userSubscription?.status === "active" ? userSubscription.plan_id : "free")) || PLANS[0];
  const activeEnabled = [settings.ai, settings.xp, settings.economy].filter(Boolean).length;

  const navItems = [
    { id: "overview",  icon: "⚡",  label: "نظرة عامة",       badge: null },
    { id: "commands",  icon: "⚙",  label: "الأوامر",           badge: null },
    { id: "prefix",    icon: "🔷", label: "البريفكس",          badge: canUsePlan(guildPlan, "silver") ? null : "🔒" },
    { id: "settings",  icon: "🎛", label: "الإعدادات",         badge: `${activeEnabled}/3` },
    { id: "economy",   icon: "💰", label: "الاقتصاد",          badge: null },
    { id: "moderation",icon: "🛡", label: "الإشراف",           badge: null },
    { id: "subscriptions", icon: "👑", label: "الاشتراكات",    badge: null },
    ...(isOwner ? [{ id: "payment-requests", icon: "🔐", label: "طلبات الدفع" }] : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <div className="grid-bg" /><div className="scanlines" /><Particles />
      <Notif msg={notif} onClose={() => setNotif("")} />

      {/* ══ SIDEBAR ══ */}
      <aside className="sidebar" style={{ zIndex: 10, order: 2, transform: sidebarOpen ? "none" : "translateX(270px)", transition: "transform .3s" }}>
        {/* Logo */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900, color: "var(--blue)", letterSpacing: 3 }}>LYN</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "var(--muted)", letterSpacing: 4 }}>CONTROL v4.0</div>
          </div>
          <div className="pulse-dot" style={{ width: 8, height: 8 }} />
        </div>

        {/* User */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          {user?.avatar
            ? <img src={user.avatar} alt="" width={36} height={36} style={{ borderRadius: "50%", border: "2px solid var(--blue)", flexShrink: 0 }} />
            : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--blue)", color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>{user?.username?.[0]?.toUpperCase()}</div>
          }
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
              <span className="tag tag-green" style={{ fontSize: 9, padding: "1px 6px" }}>
                <div className="pulse-dot" style={{ width: 5, height: 5 }} /> مدير
              </span>
              {isOwner && <span className="tag tag-red" style={{ fontSize: 9, padding: "1px 6px" }}>👑 مالك</span>}
              <span className="tag" style={{ fontSize: 9, padding: "1px 6px", color: currentPlan.color, background: `${currentPlan.color}18`, border: `1px solid ${currentPlan.color}33` }}>
                {currentPlan.icon} {currentPlan.name}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        {selectedGuild && (
          <div style={{ padding: "8px 10px 0" }}>
            <div className="section-lbl">التنقل</div>
            {navItems.map(n => (
              <div key={n.id} className={`nav-item ${activeSection === n.id ? "active" : ""}`} onClick={() => setActiveSection(n.id)}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge && <span style={{ fontSize: 10, color: activeSection === n.id ? "var(--blue)" : "var(--muted)" }}>{n.badge}</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Guilds */}
        <div style={{ padding: "10px 10px 0", borderTop: "1px solid var(--border)" }}>
          <div className="section-lbl">السيرفرات ({guilds.length})</div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {guilds.slice(0, 12).map(g => (
              <div key={g.id} className={`guild-item ${selectedGuild?.id === g.id ? "active" : ""}`} onClick={() => selectGuild(g)}>
                {g.icon
                  ? <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" width={28} height={28} style={{ borderRadius: 8, flexShrink: 0 }} />
                  : <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>{g.name.slice(0, 2)}</div>
                }
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                </div>
                {selectedGuild?.id === g.id && <div className="pulse-dot" style={{ width: 6, height: 6 }} />}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "10px", borderTop: "1px solid var(--border)" }}>
          <div className="nav-item" onClick={logout} style={{ color: "var(--red)" }}>
            <span>⎋</span> تسجيل الخروج
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto", zIndex: 2, minHeight: "100vh", order: 1, maxWidth: "calc(100% - 270px)" }}>

        {/* No guild selected */}
        {!selectedGuild && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center", gap: 20 }}>
            <div style={{ fontSize: 80, opacity: .3 }}>🌐</div>
            <h2 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 24, fontWeight: 900, color: "var(--muted)" }}>اختر سيرفراً</h2>
            <p style={{ color: "var(--muted)", maxWidth: 340 }}>اختر سيرفراً من القائمة الجانبية لعرض لوحة التحكم وإدارة كل الإعدادات</p>
            {guilds.length === 0 && <div className="tag tag-gold">⚠ لا توجد سيرفرات بصلاحية مدير</div>}
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {selectedGuild && activeSection === "overview" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <div className="tag tag-blue" style={{ marginBottom: 12 }}>لوحة التحكم</div>
              <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>{selectedGuild.name}</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>نظرة عامة — خطة <span style={{ color: PLANS.find(p=>p.id===guildPlan)?.color }}>{PLANS.find(p=>p.id===guildPlan)?.name}</span></p>
            </div>

            {/* Stat cards */}
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              {[
                { label: "الأنظمة النشطة",    value: `${activeEnabled}/3`,                   color: "var(--blue)",   icon: "⚡" },
                { label: "الذكاء الاصطناعي",  value: settings.ai ? "مفعّل" : "متوقف",       color: settings.ai ? "var(--green)" : "var(--red)", icon: "🤖" },
                { label: "نظام XP",           value: settings.xp ? "مفعّل" : "متوقف",       color: settings.xp ? "var(--green)" : "var(--red)", icon: "📈" },
                { label: "الاقتصاد",          value: settings.economy ? "مفعّل" : "متوقف",  color: settings.economy ? "var(--green)" : "var(--red)", icon: "💰" },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>الإجراءات السريعة</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-blue" onClick={() => setActiveSection("commands")}>⚙ إدارة الأوامر</button>
                <button className="btn btn-blue" style={{ background: "linear-gradient(135deg,#0f766e,#22d3a2)" }} onClick={() => setActiveSection("prefix")}>🔷 البريفكس</button>
                <button className="btn btn-blue" style={{ background: "linear-gradient(135deg,#312e81,#7c3aed)" }} onClick={() => setActiveSection("economy")}>💰 الاقتصاد</button>
                <button className="btn btn-blue" style={{ background: "linear-gradient(135deg,#064e3b,#059669)" }} onClick={() => setActiveSection("moderation")}>🛡 الإشراف</button>
                <button className="btn btn-gold" onClick={() => setActiveSection("subscriptions")}>👑 الاشتراكات</button>
              </div>
            </div>

            {/* Systems status */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>حالة الأنظمة</h3>
              {[
                { name: "الذكاء الاصطناعي",    active: settings.ai,      desc: "ردود ذكية عبر GPT-4o-mini",       planNeeded: "gold" },
                { name: "نظام XP والمستويات",  active: settings.xp,      desc: "تتبع نشاط الأعضاء",              planNeeded: "gold" },
                { name: "الاقتصاد",            active: settings.economy, desc: "عملات وسوق ومعاملات",             planNeeded: "gold" },
              ].map((s, i) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="pulse-dot" style={{ background: s.active ? "var(--green)" : "var(--red)", boxShadow: s.active ? "0 0 10px var(--green)" : "none" }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!canUsePlan(guildPlan, s.planNeeded) && <span className="tag tag-lock" style={{ fontSize: 10 }}>🔒 {PLANS.find(p=>p.id===s.planNeeded)?.name}+</span>}
                    <span className={`tag ${s.active ? "tag-green" : "tag-blue"}`} style={{ fontSize: 10 }}>{s.active ? "نشط" : "متوقف"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMMANDS ── */}
        {selectedGuild && activeSection === "commands" && (
          <CommandsSection guild={selectedGuild} guildPlan={guildPlan} onNotif={setNotif} />
        )}

        {/* ── PREFIX ── */}
        {selectedGuild && activeSection === "prefix" && (
          <PrefixSection guild={selectedGuild} guildPlan={guildPlan} onNotif={setNotif} />
        )}

        {/* ── SETTINGS ── */}
        {selectedGuild && activeSection === "settings" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <div className="tag tag-purple" style={{ marginBottom: 12 }}>الإعدادات</div>
              <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>إعدادات البوت</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>تفعيل أو إيقاف أنظمة البوت في {selectedGuild.name}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
              {[
                { key: "ai",      icon: "🤖", label: "نظام الذكاء الاصطناعي",   desc: "يسمح للبوت بالرد على الرسائل تلقائياً بالمنشن.",  color: "var(--blue)",   plan: "gold" },
                { key: "xp",      icon: "📈", label: "نظام XP والمستويات",      desc: "تتبع نشاط الأعضاء ومنح XP مقابل الرسائل.",        color: "var(--purple)", plan: "gold" },
                { key: "economy", icon: "💰", label: "نظام الاقتصاد",           desc: "تفعيل عملات مع المكافآت اليومية والمتجر.",        color: "var(--gold)",   plan: "gold" },
              ].map(s => {
                const locked = !canUsePlan(guildPlan, s.plan);
                return (
                  <div key={s.key} className="card" style={{ padding: 24, borderColor: settings[s.key] && !locked ? `${s.color}44` : undefined }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ display: "flex", gap: 16, flex: 1 }}>
                        <div style={{ fontSize: 32, flexShrink: 0 }}>{s.icon}</div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: s.color, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                            {s.label}
                            {locked && <span className="tag tag-lock" style={{ fontSize: 10 }}>🔒 {PLANS.find(p=>p.id===s.plan)?.name}+</span>}
                          </div>
                          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{s.desc}</p>
                          <div style={{ marginTop: 12 }}>
                            <div className="bar-track" style={{ width: 220 }}>
                              <div className="bar-fill" style={{ width: settings[s.key] && !locked ? "100%" : "0%", background: settings[s.key] ? `linear-gradient(90deg,${s.color},var(--cyan))` : "transparent" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div className={`toggle ${settings[s.key] ? "on" : ""}`}
                          onClick={() => !locked && saveSettings({ ...settings, [s.key]: !settings[s.key] })}
                          style={locked ? { opacity: .4, cursor: "not-allowed" } : {}} />
                        <span style={{ fontSize: 10, color: settings[s.key] && !locked ? "var(--green)" : "var(--muted)" }}>
                          {locked ? "مقفول" : settings[s.key] ? "مفعّل" : "متوقف"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {saving && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>⏳ جاري الحفظ...</div>}
            </div>
          </div>
        )}

        {/* ── ECONOMY ── */}
        {selectedGuild && activeSection === "economy" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <div className="tag tag-gold" style={{ marginBottom: 12 }}>الاقتصاد</div>
              <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>المتصدرون</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>أغنى الأعضاء في {selectedGuild.name}</p>
            </div>
            {!canUsePlan(guildPlan, "gold") ? (
              <div className="card" style={{ padding: 48, textAlign: "center", borderColor: "rgba(251,191,36,.3)" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
                <h3 style={{ fontWeight: 900, marginBottom: 8, color: "var(--gold)" }}>الاقتصاد — خطة ذهبي أو أعلى</h3>
                <p style={{ color: "var(--muted)", marginBottom: 24 }}>اشترك بخطة ذهبي لتفعيل نظام الاقتصاد الكامل.</p>
                <button className="btn btn-gold" onClick={() => setActiveSection("subscriptions")}>👑 اشترك الآن</button>
              </div>
            ) : (
              <>
                <button className="btn btn-blue" style={{ marginBottom: 20 }} onClick={loadLeaderboard}>🔄 تحديث</button>
                {loadingLB && <div style={{ color: "var(--muted)", padding: 32, textAlign: "center" }}>⏳ جاري التحميل...</div>}
                {!loadingLB && leaderboard.length === 0 && (
                  <div className="card" style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 52, marginBottom: 16, opacity: .4 }}>📊</div>
                    <p style={{ color: "var(--muted)" }}>لا توجد بيانات بعد.</p>
                  </div>
                )}
                {!loadingLB && leaderboard.map((u, i) => {
                  const max = leaderboard[0]?.coins || 1;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={u.id || i} className="card" style={{ padding: "14px 20px", marginBottom: 10, display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ width: 36, textAlign: "center", flexShrink: 0 }}>
                        {i < 3 ? <span style={{ fontSize: 22 }}>{medals[i]}</span> : <span style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 13 }}>#{i + 1}</span>}
                      </div>
                      {u.avatar
                        ? <img src={u.avatar} alt="" width={40} height={40} style={{ borderRadius: "50%", border: "2px solid var(--border)", flexShrink: 0 }} />
                        : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{u.username?.[0]?.toUpperCase()}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{u.username}</div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${(u.coins / max) * 100}%`,
                            background: i === 0 ? "linear-gradient(90deg,var(--gold),#fde68a)" : i === 1 ? "linear-gradient(90deg,#94a3b8,#cbd5e1)" : i === 2 ? "linear-gradient(90deg,#c47c2b,#fbbf24)" : "linear-gradient(90deg,var(--blue),var(--cyan))" }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: i === 0 ? "var(--gold)" : i === 1 ? "#94a3b8" : i === 2 ? "#c47c2b" : "var(--blue)", flexShrink: 0 }}>
                        {u.coins?.toLocaleString()} <span style={{ fontSize: 11, opacity: .7 }}>كوين</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── MODERATION ── */}
        {selectedGuild && activeSection === "moderation" && (
          <div className="fade-in">
            <div style={{ marginBottom: 28 }}>
              <div className="tag tag-green" style={{ marginBottom: 12 }}>الإشراف</div>
              <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 28, fontWeight: 900 }}>أدوات الإشراف</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>الأوامر المتاحة في {selectedGuild.name} — لتفعيل/تعطيل اذهب لـ <button onClick={() => setActiveSection("commands")} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>الأوامر</button></p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {[
                { cmd: "/حظر",           desc: "حظر عضو من السيرفر مع خيار حذف الرسائل",  icon: "🚫", color: "var(--red)" },
                { cmd: "/طرد",           desc: "طرد عضو من السيرفر",                        icon: "👢", color: "var(--gold)" },
                { cmd: "/تحذير",         desc: "إصدار تحذير مع مستوى خطورة تلقائي",         icon: "⚠",  color: "var(--gold)" },
                { cmd: "/التحذيرات",     desc: "عرض تحذيرات عضو بالتفاصيل الكاملة",         icon: "📋", color: "var(--blue)" },
                { cmd: "/مسح_التحذيرات",desc: "مسح تحذيرات عضو مع إشعار",                 icon: "🧹", color: "var(--green)" },
                { cmd: "/اسكت",          desc: "كتم عضو لمدة محددة بوحدات متعددة",          icon: "🔇", color: "var(--purple)" },
                { cmd: "/فك_الكتم",     desc: "فك كتم عضو مكتوم",                           icon: "🔊", color: "var(--green)" },
                { cmd: "/مسح",           desc: "مسح رسائل مع 6 فلاتر متقدمة",              icon: "🗑",  color: "var(--red)" },
                { cmd: "/لقب",           desc: "تغيير أو إزالة لقب عضو",                    icon: "✏",  color: "var(--blue)" },
                { cmd: "/بطيء",          desc: "تفعيل/إيقاف السلو مود (14 خيار)",           icon: "🐌", color: "var(--muted)" },
                { cmd: "/قفل",           desc: "قفل قناة",                                   icon: "🔒", color: "var(--red)" },
                { cmd: "/فتح",           desc: "فتح قناة مقفلة",                             icon: "🔓", color: "var(--green)" },
                { cmd: "/رتبة",          desc: "إعطاء/سحب رتبة فردي أو جماعي",              icon: "🏷",  color: "var(--purple)" },
              ].map(c => (
                <div key={c.cmd} className="card glow" style={{ padding: 18, display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{c.icon}</div>
                  <div>
                    <code style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: c.color, fontWeight: 700 }}>{c.cmd}</code>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 20, marginTop: 20, borderColor: "rgba(244,63,94,.25)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20 }}>⚠</span>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>
                  جميع أوامر الإشراف تتطلب الصلاحيات المناسبة. يحتاج البوت لـ
                  <strong style={{ color: "var(--text)" }}> BanMembers</strong> و<strong style={{ color: "var(--text)" }}>KickMembers</strong>.
                  يمكنك تفعيل/تعطيل أي أمر من صفحة <button onClick={() => setActiveSection("commands")} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>الأوامر</button>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {activeSection === "subscriptions" && (
          <SubscriptionsSection userId={user?.id} userSubscription={userSubscription} onNotif={setNotif} onRefresh={fetchSubscription} />
        )}

        {/* ── ADMIN ── */}
        {activeSection === "payment-requests" && isOwner && (
          <AdminPaymentRequests onNotif={setNotif} />
        )}

      </main>
    </div>
  );
}

// ═══════════════════════════════════════════
//  APP ROOT
// ═══════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <GlobalStyle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}