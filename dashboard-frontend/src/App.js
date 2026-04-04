import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

// ✅ FIX: CRA uses process.env.REACT_APP_* (not import.meta.env.VITE_*)
const API = process.env.REACT_APP_API_URL || "http://localhost:4000";
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || "1480292734353805373";
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || "http://localhost:3000/callback";

const PLANS = [
  {
    id: "free", name: "مجاني", price: 0, color: "var(--muted)", icon: "🆓",
    features: ["الأوامر الأساسية", "الإشراف البسيط", "نظام XP", "سيرفر واحد"],
    guildLimit: 1,
  },
  {
    id: "silver", name: "فضي", price: 29, color: "#94a3b8", icon: "🥈",
    features: ["كل مميزات المجاني", "الاقتصاد الكامل", "الذكاء الاصطناعي", "دعم أولوي", "حتى 3 سيرفرات"],
    guildLimit: 3, popular: false,
  },
  {
    id: "gold", name: "ذهبي", price: 79, color: "var(--gold)", icon: "👑",
    features: ["كل مميزات الفضي", "إحصائيات متقدمة", "أوامر مخصصة", "أولوية قصوى", "حتى 10 سيرفرات"],
    guildLimit: 10, popular: true,
  },
  {
    id: "diamond", name: "ماسي", price: 149, color: "var(--cyan)", icon: "💎",
    features: ["جميع المميزات", "سيرفرات غير محدودة", "API خاص", "دعم 24/7", "بوت مخصص"],
    guildLimit: -1,
  },
];

const BANK_INFO = {
  bank: "بنك الراجحي",
  iban: "SA12 3456 7890 1234 5678 9012",
  name: "اسم الحساب",
  stcPay: "05XXXXXXXX",
};

// ✅ NEW: helper — يرسل requests مع الـ token تلقائياً
function authHeaders() {
  const token = localStorage.getItem("session_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options.headers }
  });
}

// ═══════════════════════════
//  GLOBAL STYLES
// ═══════════════════════════
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Tajawal:wght@300;400;500;700;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #030712; --bg2: #0a0f1e; --bg3: #0d1525;
      --panel: rgba(13,21,37,0.85); --border: rgba(0,200,255,0.15);
      --border2: rgba(0,200,255,0.35); --blue: #00c8ff; --cyan: #00ffe7;
      --purple: #a855f7; --gold: #fbbf24; --red: #f43f5e; --green: #22d3a2;
      --text: #e2e8f0; --muted: #64748b;
      --glow: 0 0 20px rgba(0,200,255,0.4), 0 0 40px rgba(0,200,255,0.15);
      --r: 12px;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg); color: var(--text);
      font-family: 'Tajawal', sans-serif;
      font-size: 16px; min-height: 100vh;
      overflow-x: hidden; direction: rtl;
    }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--blue); border-radius: 2px; }

    .grid-bg {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
    }
    .grid-bg::after {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 80% 80% at 50% -20%, rgba(0,200,255,0.05), transparent);
    }

    @keyframes float-up {
      0% { transform: translateY(0) scale(1); opacity: 0; }
      20% { opacity: 1; } 80% { opacity: 0.5; }
      100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
    }
    .particle {
      position: fixed; width: 2px; height: 2px; border-radius: 50%;
      pointer-events: none; z-index: 0; animation: float-up linear infinite;
    }

    .scanlines {
      position: fixed; inset: 0; z-index: 1; pointer-events: none;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
    }

    .card {
      background: var(--panel); border: 1px solid var(--border);
      border-radius: var(--r); backdrop-filter: blur(16px);
      transition: border-color .3s, box-shadow .3s; position: relative; overflow: hidden;
    }
    .card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, var(--blue), transparent); opacity: 0.5;
    }
    .card:hover { border-color: var(--border2); box-shadow: var(--glow); }

    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 24px; border-radius: 8px; border: none;
      font-family: 'Tajawal', sans-serif; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: all .3s;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-blue { background: linear-gradient(135deg, #0066cc, #0088ff); color: white; box-shadow: 0 0 20px rgba(0,136,255,0.4); }
    .btn-blue:hover:not(:disabled) { box-shadow: 0 0 30px rgba(0,136,255,0.7); transform: translateY(-2px); }
    .btn-green { background: linear-gradient(135deg, #065f46, #059669); color: white; }
    .btn-green:hover:not(:disabled) { box-shadow: 0 0 20px rgba(5,150,105,0.5); transform: translateY(-2px); }
    .btn-red { background: linear-gradient(135deg, #991b1b, #f43f5e); color: white; }
    .btn-red:hover:not(:disabled) { box-shadow: 0 0 20px rgba(244,63,94,0.5); transform: translateY(-2px); }
    .btn-gold { background: linear-gradient(135deg, #92400e, #fbbf24); color: #000; }
    .btn-gold:hover:not(:disabled) { box-shadow: 0 0 20px rgba(251,191,36,0.5); transform: translateY(-2px); }
    .btn-discord {
      background: linear-gradient(135deg, #4752c4, #5865f2); color: white;
      box-shadow: 0 0 20px rgba(88,101,242,0.5); font-size: 16px; padding: 18px 36px;
    }
    .btn-discord:hover { box-shadow: 0 0 40px rgba(88,101,242,0.8); transform: translateY(-3px) scale(1.02); }

    .toggle {
      position: relative; width: 52px; height: 28px;
      background: rgba(0,0,0,0.5); border-radius: 14px;
      border: 1px solid var(--border); cursor: pointer; transition: all .3s;
    }
    .toggle.on { background: rgba(0,200,255,0.2); border-color: var(--blue); box-shadow: var(--glow); }
    .toggle::after {
      content: ''; position: absolute; top: 3px; right: 3px;
      width: 20px; height: 20px; border-radius: 50%;
      background: var(--muted); transition: all .3s;
    }
    .toggle.on::after { right: 27px; background: var(--blue); box-shadow: 0 0 10px var(--blue); }

    .tag {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
    }
    .tag-blue { background: rgba(0,200,255,0.1); color: var(--blue); border: 1px solid rgba(0,200,255,0.3); }
    .tag-purple { background: rgba(168,85,247,0.1); color: var(--purple); border: 1px solid rgba(168,85,247,0.3); }
    .tag-green { background: rgba(34,211,162,0.1); color: var(--green); border: 1px solid rgba(34,211,162,0.3); }
    .tag-gold { background: rgba(251,191,36,0.1); color: var(--gold); border: 1px solid rgba(251,191,36,0.3); }
    .tag-red { background: rgba(244,63,94,0.1); color: var(--red); border: 1px solid rgba(244,63,94,0.3); }
    .tag-cyan { background: rgba(0,255,231,0.1); color: var(--cyan); border: 1px solid rgba(0,255,231,0.3); }

    @keyframes pulse-ring { 0% { transform: scale(1); opacity: .8; } 100% { transform: scale(1.5); opacity: 0; } }
    .pulse-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--green); position: relative; flex-shrink: 0;
    }
    .pulse-dot::before {
      content: ''; position: absolute; inset: 0; border-radius: 50%;
      background: var(--green); animation: pulse-ring 2s infinite;
    }

    .bar-track { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
    .bar-fill {
      height: 100%; border-radius: 2px;
      background: linear-gradient(90deg, var(--blue), var(--cyan));
      transition: width .8s cubic-bezier(.4,0,.2,1); box-shadow: 0 0 8px var(--blue);
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
    .fade-in { animation: fadeIn .6s ease both; }
    .fade-in-1 { animation-delay: .1s; } .fade-in-2 { animation-delay: .2s; }
    .fade-in-3 { animation-delay: .3s; } .fade-in-4 { animation-delay: .4s; }

    .sidebar {
      width: 270px; flex-shrink: 0; height: 100vh; position: sticky; top: 0;
      display: flex; flex-direction: column;
      background: rgba(10,15,30,0.97); border-left: 1px solid var(--border);
      backdrop-filter: blur(20px);
    }

    .guild-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: 10px; cursor: pointer;
      transition: all .25s; border: 1px solid transparent;
    }
    .guild-item:hover { background: rgba(0,200,255,0.05); border-color: var(--border); }
    .guild-item.active { background: rgba(0,200,255,0.1); border-color: rgba(0,200,255,0.3); }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; border-radius: 8px;
      color: var(--muted); cursor: pointer; transition: all .2s; font-size: 15px; font-weight: 500;
    }
    .nav-item:hover { color: var(--text); background: rgba(255,255,255,0.03); }
    .nav-item.active { color: var(--blue); background: rgba(0,200,255,0.08); }

    .plan-card {
      border: 2px solid var(--border); border-radius: 16px; padding: 24px;
      background: var(--panel); transition: all .3s; cursor: pointer;
      position: relative; overflow: hidden;
    }
    .plan-card:hover { transform: translateY(-6px); border-color: var(--border2); }
    .plan-card.popular { border-color: var(--gold); box-shadow: 0 0 30px rgba(251,191,36,0.15); }
    .plan-card.current { border-color: var(--green); box-shadow: 0 0 20px rgba(34,211,162,0.15); }
    .plan-card.diamond-plan { border-color: var(--cyan); box-shadow: 0 0 20px rgba(0,255,231,0.1); }

    .plan-badge {
      position: absolute; top: -1px; right: 20px;
      padding: 4px 14px; border-radius: 0 0 10px 10px;
      font-size: 11px; font-weight: 700; letter-spacing: 1px;
    }

    @keyframes slideIn { from { transform: translateX(-120%); } to { transform: translateX(0); } }
    .notification {
      position: fixed; bottom: 24px; left: 24px; z-index: 999;
      padding: 14px 20px; border-radius: 10px;
      display: flex; align-items: center; gap: 10px;
      background: rgba(13,21,37,0.97); border: 1px solid var(--green);
      box-shadow: 0 0 20px rgba(34,211,162,0.3); font-weight: 600;
      animation: slideIn .4s ease; max-width: 340px;
    }

    input, select, textarea {
      background: rgba(0,0,0,0.3); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text); padding: 10px 14px;
      font-family: 'Tajawal', sans-serif; font-size: 15px;
      outline: none; transition: border-color .2s; width: 100%; direction: rtl;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0,200,255,0.1);
    }

    .section-lbl {
      font-size: 11px; font-weight: 700; color: var(--muted);
      letter-spacing: 2px; text-transform: uppercase;
      padding: 0 16px; margin: 12px 0 6px;
    }
    .divider { height: 1px; background: var(--border); margin: 12px 0; }

    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; background: rgba(0,200,255,0.05);
      border-radius: 8px; border: 1px solid var(--border); margin-bottom: 8px;
    }

    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  `}</style>
);

// Particles
const Particles = () => {
  const ps = Array.from({ length: 18 }, (_, i) => ({
    id: i, left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 10}s`, duration: `${8 + Math.random() * 12}s`,
    color: i % 3 === 0 ? "#a855f7" : i % 3 === 1 ? "#00ffe7" : "#00c8ff",
  }));
  return <>{ps.map(p => <div key={p.id} className="particle" style={{ left: p.left, bottom: "-10px", animationDelay: p.delay, animationDuration: p.duration, background: p.color, boxShadow: `0 0 6px ${p.color}` }} />)}</>;
};

// Notification
function Notif({ msg, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [msg, onClose]);
  if (!msg) return null;
  return (
    <div className="notification">
      <span style={{ color: "var(--green)", fontSize: 20, flexShrink: 0 }}>✓</span>
      <span>{msg}</span>
    </div>
  );
}

// ═══════════════════════════
//  HOME
// ═══════════════════════════
function Home() {
  const login = () => {
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  };

  const features = [
    { icon: "🤖", label: "ذكاء اصطناعي", desc: "ردود ذكية متقدمة", color: "var(--blue)" },
    { icon: "⚡", label: "نظام XP", desc: "مستويات وتطور", color: "var(--purple)" },
    { icon: "💰", label: "الاقتصاد", desc: "عملات وسوق متكامل", color: "var(--gold)" },
    { icon: "🛡", label: "الإشراف", desc: "حماية السيرفر", color: "var(--green)" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: "40px 20px" }}>
      <div className="grid-bg" />
      <div className="scanlines" />
      <Particles />

      <div className="fade-in" style={{ marginBottom: 32, position: "relative", zIndex: 2 }}>
        <div className="tag tag-blue" style={{ fontSize: 11 }}>
          <div className="pulse-dot" style={{ width: 7, height: 7 }} />
          النظام يعمل
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, textAlign: "center", marginBottom: 20 }}>
        <h1 className="fade-in fade-in-1" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(36px,8vw,72px)", fontWeight: 900, letterSpacing: "4px", lineHeight: 1, background: "linear-gradient(135deg, #fff 0%, var(--blue) 50%, var(--cyan) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          CONTROL PANEL
        </h1>
        <p className="fade-in fade-in-2" style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 17, color: "var(--muted)", marginTop: 12 }}>
          لوحة تحكم بوت ديسكورد المتطور
        </p>
      </div>

      <p className="fade-in fade-in-2" style={{ maxWidth: 460, textAlign: "center", color: "var(--muted)", fontSize: 17, lineHeight: 1.8, marginBottom: 48, position: "relative", zIndex: 2 }}>
        أدر بوت الديسكورد الخاص بك من مكان واحد. اضبط الإعدادات، تابع الاقتصاد، واشترك لفتح مميزات إضافية.
      </p>

      <div className="fade-in fade-in-3" style={{ position: "relative", zIndex: 2, marginBottom: 64 }}>
        <button className="btn btn-discord" onClick={login}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.085.12 18.11.144 18.13a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          تسجيل الدخول بـ Discord
        </button>
      </div>

      <div className="fade-in fade-in-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, maxWidth: 840, width: "100%", position: "relative", zIndex: 2 }}>
        {features.map(f => (
          <div key={f.label} className="card" style={{ padding: "22px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: f.color, marginBottom: 6 }}>{f.label}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════
//  CALLBACK — ✅ يخزن session token
// ═══════════════════════════
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
        // ✅ FIX: نخزن الـ token الآمن + بيانات العرض فقط
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
        <p style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 16, color: "var(--blue)" }}>{status}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════
//  SUBSCRIPTIONS SECTION
// ═══════════════════════════
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
    setSelectedPlan(plan);
    setRefNumber("");
    setStep("payment");
  };

  const handleSubmit = async () => {
    if (!refNumber.trim()) { onNotif("⚠ أدخل رقم العملية"); return; }
    if (!userId) { onNotif("⚠ خطأ في بيانات المستخدم"); return; }
    setSubmitting(true);
    try {
      // ✅ FIX: يستخدم authFetch + ما يرسل userId بالـ body (الباك إند ياخذه من الـ session)
      const res = await authFetch(`${API}/api/payment-requests`, {
        method: "POST",
        body: JSON.stringify({ planId: selectedPlan.id, refNumber: refNumber.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("done");
        onRefresh && onRefresh();
      } else {
        onNotif(data.error || "حدث خطأ، حاول مرة أخرى");
      }
    } catch { onNotif("❌ خطأ في الاتصال بالخادم"); }
    setSubmitting(false);
  };

  if (step === "done") return (
    <div className="fade-in" style={{ textAlign: "center", maxWidth: 500, margin: "0 auto", padding: "80px 20px" }}>
      <div style={{ fontSize: 72, marginBottom: 24 }}>✅</div>
      <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 14 }}>تم إرسال الطلب!</h2>
      <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: 32 }}>
        سيتم مراجعة طلبك خلال 24 ساعة وتفعيل الاشتراك. شكراً لدعمك! 🙏
      </p>
      <button className="btn btn-blue" onClick={() => { setStep("plans"); setRefNumber(""); }}>
        ← العودة للخطط
      </button>
    </div>
  );

  if (step === "payment") return (
    <div className="fade-in" style={{ maxWidth: 640, margin: "0 auto" }}>
      <button onClick={() => setStep("plans")} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: 16, marginBottom: 24, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Tajawal', sans-serif" }}>
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

        <div style={{ background: "rgba(0,200,255,0.05)", borderRadius: 12, padding: 20, marginBottom: 28, border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--cyan)" }}>💳 معلومات التحويل البنكي</h3>
          <div className="info-row"><span style={{ color: "var(--muted)" }}>البنك</span><span style={{ fontWeight: 700 }}>{BANK_INFO.bank}</span></div>
          <div className="info-row"><span style={{ color: "var(--muted)" }}>IBAN</span><span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{BANK_INFO.iban}</span></div>
          <div className="info-row"><span style={{ color: "var(--muted)" }}>اسم الحساب</span><span style={{ fontWeight: 700 }}>{BANK_INFO.name}</span></div>
          <div className="info-row" style={{ marginBottom: 0 }}><span style={{ color: "var(--muted)" }}>STC Pay</span><span style={{ fontWeight: 700 }}>{BANK_INFO.stcPay}</span></div>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
          📩 بعد التحويل، أدخل رقم العملية:
        </h3>
        <input type="text" placeholder="مثال: 1234567890" value={refNumber} onChange={e => setRefNumber(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24, padding: "10px 14px", background: "rgba(251,191,36,0.05)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.2)" }}>
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
        <h1 style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 28, fontWeight: 900 }}>خطط الأسعار</h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>اختر الخطة المناسبة لمجتمعك</p>
      </div>

      {isActive && (
        <div className="card" style={{ padding: 20, marginBottom: 28, borderColor: "var(--green)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 32 }}>👑</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                اشتراكك الحالي: <span style={{ color: "var(--gold)" }}>{PLANS.find(p => p.id === activePlanId)?.name || activePlanId}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                ينتهي: {userSubscription?.expires_at ? new Date(userSubscription.expires_at).toLocaleDateString("ar-SA") : "غير محدد"}
              </div>
            </div>
            <div className="tag tag-green" style={{ marginRight: "auto" }}>✓ مفعّل</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 48 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === activePlanId && isActive;
          const isPopular = plan.popular;
          const isDiamond = plan.id === "diamond";
          return (
            <div key={plan.id} className={`plan-card ${isPopular ? "popular" : ""} ${isCurrent ? "current" : ""} ${isDiamond ? "diamond-plan" : ""}`} onClick={() => handleSelectPlan(plan)}>
              {isPopular && <div className="plan-badge" style={{ background: "linear-gradient(135deg, #92400e, #fbbf24)", color: "#000" }}>⭐ الأكثر طلباً</div>}
              {isCurrent && <div className="plan-badge" style={{ background: "linear-gradient(135deg, #065f46, #22d3a2)", color: "#000" }}>✓ خطتك الحالية</div>}
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
                    <span style={{ color: "var(--text)" }}>{f}</span>
                  </div>
                ))}
              </div>
              {plan.id !== "free" && !isCurrent && (
                <button className="btn btn-blue" style={{ width: "100%", justifyContent: "center", background: `linear-gradient(135deg, ${plan.color}88, ${plan.color})`, color: plan.id === "gold" ? "#000" : "white" }} onClick={e => { e.stopPropagation(); handleSelectPlan(plan); }}>
                  اشترك الآن
                </button>
              )}
              {isCurrent && <div style={{ textAlign: "center", color: "var(--green)", fontWeight: 700, fontSize: 15, padding: "10px 0" }}>✓ مفعّل حالياً</div>}
              {plan.id === "free" && !isCurrent && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, padding: "10px 0" }}>خطتك الافتراضية</div>}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 24, borderColor: "rgba(0,200,255,0.2)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "var(--cyan)" }}>ℹ️ كيف يعمل نظام الدفع؟</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
          <div>① اختر خطتك المناسبة</div>
          <div>② حوّل المبلغ عبر IBAN أو STC Pay</div>
          <div>③ أرسل رقم العملية في النموذج</div>
          <div>④ سيتم التحقق وتفعيل اشتراكك خلال 24 ساعة</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════
//  ADMIN PAYMENT REQUESTS — ✅ يستخدم authFetch
// ═══════════════════════════
function AdminPaymentRequests({ onNotif }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/admin/payment-requests`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { setRequests([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id, action) => {
    try {
      const res = await authFetch(`${API}/api/admin/payment-requests/${id}/${action}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        onNotif(action === "approve" ? "✅ تم تفعيل الاشتراك بنجاح" : "❌ تم رفض الطلب");
        load();
      } else { onNotif(data.error || "حدث خطأ"); }
    } catch { onNotif("خطأ في الاتصال"); }
  };

  const filtered = requests.filter(r => filter === "all" || r.status === filter);
  const pending = requests.filter(r => r.status === "pending").length;

  const statusInfo = {
    pending: { label: "قيد المراجعة", color: "var(--gold)", cls: "tag-gold" },
    approved: { label: "مفعّل", color: "var(--green)", cls: "tag-green" },
    rejected: { label: "مرفوض", color: "var(--red)", cls: "tag-red" },
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <div className="tag tag-red" style={{ marginBottom: 12 }}>👑 لوحة الإدارة</div>
        <h1 style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 28, fontWeight: 900 }}>
          طلبات الدفع
          {pending > 0 && <span style={{ marginRight: 12, background: "var(--red)", color: "white", fontSize: 14, padding: "2px 12px", borderRadius: 20, fontWeight: 700 }}>{pending} جديد</span>}
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>راجع وفعّل اشتراكات المستخدمين</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button className="btn btn-blue" style={{ padding: "8px 16px", fontSize: 13 }} onClick={load}>🔄 تحديث</button>
        {["all", "pending", "approved", "rejected"].map(f => (
          <button key={f} className={`btn ${filter === f ? "btn-blue" : ""}`}
            style={{ padding: "8px 16px", fontSize: 13, background: filter === f ? undefined : "rgba(255,255,255,0.05)", color: filter === f ? undefined : "var(--muted)", border: "1px solid var(--border)" }}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "الكل" : statusInfo[f]?.label}
            {f !== "all" && <span style={{ marginRight: 6, opacity: 0.7 }}>({requests.filter(r => r.status === f).length})</span>}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "var(--muted)", padding: 32, textAlign: "center" }}>⏳ جاري التحميل...</div>}

      {!loading && filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.4 }}>📭</div>
          <p style={{ color: "var(--muted)" }}>لا توجد طلبات {filter !== "all" ? statusInfo[filter]?.label : ""} حالياً</p>
        </div>
      )}

      {!loading && filtered.map(req => {
        const plan = PLANS.find(p => p.id === req.plan_id);
        const si = statusInfo[req.status] || { label: req.status, color: "var(--muted)", cls: "tag-blue" };
        return (
          <div key={req.id} className="card" style={{ padding: "20px 24px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ fontSize: 32, flexShrink: 0 }}>{plan?.icon || "💳"}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    معرف المستخدم: <span style={{ color: "var(--cyan)", fontFamily: "monospace" }}>{req.user_id}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 2 }}>
                    الخطة: <span style={{ color: plan?.color }}>{plan?.name || req.plan_id}</span>
                    {plan?.price > 0 && <span> — {plan.price} ريال</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 2 }}>
                    رقم العملية: <span style={{ fontFamily: "monospace", color: "var(--text)", fontWeight: 600 }}>{req.ref_number}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {new Date(req.created_at).toLocaleDateString("ar-SA")} — {new Date(req.created_at).toLocaleTimeString("ar-SA")}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                <span className={`tag ${si.cls}`}>{si.label}</span>
                {req.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-green" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => handleAction(req.id, "approve")}>✅ تفعيل</button>
                    <button className="btn btn-red" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => handleAction(req.id, "reject")}>❌ رفض</button>
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

// ═══════════════════════════
//  DASHBOARD — ✅ يستخدم authFetch
// ═══════════════════════════
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

  let user = null, guilds = [];
  try { user = JSON.parse(localStorage.getItem("user")); } catch {}
  try { guilds = JSON.parse(localStorage.getItem("guilds")) || []; } catch {}

  const token = localStorage.getItem("session_token");

  // ✅ FIX: isOwner يتحقق من الباك إند — هنا بس للعرض
  const isOwner = user?.id === (process.env.REACT_APP_OWNER_ID || "529320108032786433");

  useEffect(() => { if (!user || !token) navigate("/"); }, [user, token, navigate]);

  const fetchSubscription = () => {
    if (!user?.id) return;
    authFetch(`${API}/api/subscription/${user.id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setUserSubscription(d); })
      .catch(() => {});
  };

  useEffect(() => { fetchSubscription(); }, [user?.id]);

  const selectGuild = async (g) => {
    setSelectedGuild(g); setActiveSection("overview"); setLeaderboard([]);
    try {
      await authFetch(`${API}/api/guild/save`, { method: "POST", body: JSON.stringify({ guildId: g.id }) });
      const res = await authFetch(`${API}/api/guild/${g.id}/settings`);
      const data = await res.json();
      if (data && !data.error) setSettings({ ai: data.ai ?? true, xp: data.xp ?? true, economy: data.economy ?? true });
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
    { id: "overview", icon: "⚡", label: "نظرة عامة" },
    { id: "settings", icon: "⚙", label: "الإعدادات" },
    { id: "economy", icon: "💰", label: "الاقتصاد" },
    { id: "moderation", icon: "🛡", label: "الإشراف" },
    { id: "subscriptions", icon: "👑", label: "الاشتراكات" },
    ...(isOwner ? [{ id: "payment-requests", icon: "🔐", label: "طلبات الدفع" }] : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <div className="grid-bg" /><div className="scanlines" /><Particles />
      <Notif msg={notif} onClose={() => setNotif("")} />

      {/* ── SIDEBAR ── */}
      <aside className="sidebar" style={{ zIndex: 10, order: 2 }}>
        <div style={{ padding: "20px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900, color: "var(--blue)", letterSpacing: 3 }}>CONTROL</div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: "var(--muted)", letterSpacing: 4 }}>PANEL v3.0</div>
        </div>

        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          {user?.avatar
            ? <img src={user.avatar} alt="" width={38} height={38} style={{ borderRadius: "50%", border: "2px solid var(--blue)" }} />
            : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--blue)", color: "var(--blue)", fontWeight: 700, fontSize: 16 }}>{user?.username?.[0]?.toUpperCase()}</div>
          }
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              <span className="tag tag-green" style={{ fontSize: 9, padding: "1px 7px" }}>
                <div className="pulse-dot" style={{ width: 5, height: 5 }} /> مدير
              </span>
              {isOwner && <span className="tag tag-red" style={{ fontSize: 9, padding: "1px 7px" }}>👑 مالك</span>}
            </div>
            <div style={{ fontSize: 11, color: currentPlan.color, marginTop: 4 }}>{currentPlan.icon} {currentPlan.name}</div>
          </div>
        </div>

        {selectedGuild && (
          <div style={{ padding: "10px 10px 0" }}>
            <div className="section-lbl">التنقل</div>
            {navItems.map(n => (
              <div key={n.id} className={`nav-item ${activeSection === n.id ? "active" : ""}`} onClick={() => setActiveSection(n.id)}>
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {n.label}
                {n.id === "settings" && (
                  <span style={{ marginRight: "auto", fontSize: 11, color: activeEnabled === 3 ? "var(--green)" : "var(--gold)" }}>
                    {activeEnabled}/3
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          <div className="section-lbl">السيرفرات ({guilds.length})</div>
          <div style={{ maxHeight: 190, overflowY: "auto" }}>
            {guilds.slice(0, 10).map(g => (
              <div key={g.id} className={`guild-item ${selectedGuild?.id === g.id ? "active" : ""}`} onClick={() => selectGuild(g)}>
                {g.icon
                  ? <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" width={30} height={30} style={{ borderRadius: 8 }} />
                  : <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--blue)", fontWeight: 700 }}>{g.name.slice(0, 2)}</div>
                }
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "10px 10px", borderTop: "1px solid var(--border)" }}>
          <div className="nav-item" onClick={logout} style={{ color: "var(--red)" }}>
            <span>⎋</span> تسجيل الخروج
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, padding: "32px", overflowY: "auto", zIndex: 2, minHeight: "100vh", order: 1, maxWidth: "calc(100% - 270px)" }}>

        {!selectedGuild && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", textAlign: "center", gap: 20 }}>
            <div style={{ fontSize: 80, opacity: 0.35 }}>🌐</div>
            <h2 style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 22, fontWeight: 900, color: "var(--muted)" }}>اختر سيرفراً</h2>
            <p style={{ color: "var(--muted)", maxWidth: 340 }}>اختر سيرفراً من القائمة الجانبية لعرض لوحة التحكم وإدارة الإعدادات</p>
            {guilds.length === 0 && <div className="tag tag-gold">⚠ لا توجد سيرفرات بصلاحية مدير</div>}
          </div>
        )}

        {/* OVERVIEW */}
        {selectedGuild && activeSection === "overview" && (
          <div className="fade-in">
            <div style={{ marginBottom: 32 }}>
              <div className="tag tag-blue" style={{ marginBottom: 12 }}>لوحة التحكم</div>
              <h1 style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 28, fontWeight: 900 }}>{selectedGuild.name}</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>نظرة عامة على السيرفر</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "الأنظمة النشطة", value: `${activeEnabled}/3`, color: "var(--blue)", icon: "⚡" },
                { label: "الذكاء الاصطناعي", value: settings.ai ? "مفعّل" : "متوقف", color: settings.ai ? "var(--green)" : "var(--red)", icon: "🤖" },
                { label: "نظام XP", value: settings.xp ? "مفعّل" : "متوقف", color: settings.xp ? "var(--green)" : "var(--red)", icon: "📈" },
                { label: "الاقتصاد", value: settings.economy ? "مفعّل" : "متوقف", color: settings.economy ? "var(--green)" : "var(--red)", icon: "💰" },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: "22px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>الإجراءات السريعة</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-blue" onClick={() => setActiveSection("settings")}>⚙ الإعدادات</button>
                <button className="btn btn-blue" style={{ background: "linear-gradient(135deg, #312e81, #7c3aed)" }} onClick={() => setActiveSection("economy")}>💰 الاقتصاد</button>
                <button className="btn btn-blue" style={{ background: "linear-gradient(135deg, #064e3b, #059669)" }} onClick={() => setActiveSection("moderation")}>🛡 الإشراف</button>
                <button className="btn btn-gold" onClick={() => setActiveSection("subscriptions")}>👑 الاشتراكات</button>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>حالة الأنظمة</h3>
              {[
                { name: "الذكاء الاصطناعي", active: settings.ai, desc: "ردود ذكية عبر GPT-4o-mini" },
                { name: "نظام XP والمستويات", active: settings.xp, desc: "تتبع نشاط الأعضاء" },
                { name: "الاقتصاد", active: settings.economy, desc: "عملات وسوق ومعاملات" },
              ].map((s, i) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="pulse-dot" style={{ background: s.active ? "var(--green)" : "var(--red)", boxShadow: s.active ? "0 0 10px var(--green)" : "none" }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.desc}</div>
                    </div>
                  </div>
                  <span className={`tag ${s.active ? "tag-green" : "tag-blue"}`} style={{ fontSize: 10 }}>{s.active ? "نشط" : "متوقف"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {selectedGuild && activeSection === "settings" && (
          <div className="fade-in">
            <div style={{ marginBottom: 32 }}>
              <div className="tag tag-purple" style={{ marginBottom: 12 }}>الإعدادات</div>
              <h1 style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 28, fontWeight: 900 }}>إعدادات البوت</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>تفعيل أو إيقاف أنظمة البوت في {selectedGuild.name}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
              {[
                { key: "ai", icon: "🤖", label: "نظام الذكاء الاصطناعي", desc: "يسمح للبوت بالرد على الرسائل تلقائياً. الأعضاء يتحدثون معه بالمنشن.", color: "var(--blue)" },
                { key: "xp", icon: "📈", label: "نظام XP والمستويات", desc: "تتبع نشاط الأعضاء ومنح XP مقابل الرسائل. الصعود التلقائي للمستويات.", color: "var(--purple)" },
                { key: "economy", icon: "💰", label: "نظام الاقتصاد", desc: "تفعيل اقتصاد العملات مع المكافآت اليومية والعمل والمتجر والتحويلات.", color: "var(--gold)" },
              ].map(s => (
                <div key={s.key} className="card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ display: "flex", gap: 16, flex: 1 }}>
                      <div style={{ fontSize: 32, flexShrink: 0 }}>{s.icon}</div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.label}</div>
                        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{s.desc}</p>
                        <div style={{ marginTop: 12 }}>
                          <div className="bar-track" style={{ width: 220 }}>
                            <div className="bar-fill" style={{ width: settings[s.key] ? "100%" : "0%", background: settings[s.key] ? `linear-gradient(90deg, ${s.color}, var(--cyan))` : "transparent" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                      <div className={`toggle ${settings[s.key] ? "on" : ""}`} onClick={() => saveSettings({ ...settings, [s.key]: !settings[s.key] })} />
                      <span style={{ fontSize: 11, color: settings[s.key] ? "var(--green)" : "var(--muted)" }}>
                        {settings[s.key] ? "مفعّل" : "متوقف"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {saving && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>⏳ جاري الحفظ...</div>}
            </div>
          </div>
        )}

        {/* ECONOMY */}
        {selectedGuild && activeSection === "economy" && (
          <div className="fade-in">
            <div style={{ marginBottom: 32 }}>
              <div className="tag tag-gold" style={{ marginBottom: 12 }}>الاقتصاد</div>
              <h1 style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 28, fontWeight: 900 }}>المتصدرون</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>أغنى حاملي العملات في {selectedGuild.name}</p>
            </div>

            {!settings.economy && (
              <div className="card" style={{ padding: 40, textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 52, marginBottom: 16, opacity: 0.4 }}>💰</div>
                <p style={{ color: "var(--muted)", marginBottom: 20 }}>نظام الاقتصاد متوقف. فعّله من الإعدادات أولاً.</p>
                <button className="btn btn-blue" onClick={() => setActiveSection("settings")}>تفعيل الاقتصاد</button>
              </div>
            )}

            {settings.economy && (
              <>
                <button className="btn btn-blue" style={{ marginBottom: 20 }} onClick={loadLeaderboard}>🔄 تحديث</button>
                {loadingLB && <div style={{ color: "var(--muted)", padding: 32, textAlign: "center" }}>⏳ جاري التحميل...</div>}
                {!loadingLB && leaderboard.length === 0 && (
                  <div className="card" style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 52, marginBottom: 16, opacity: 0.4 }}>📊</div>
                    <p style={{ color: "var(--muted)" }}>لا توجد بيانات بعد. يحتاج الأعضاء لاستخدام البوت أولاً.</p>
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
                      {u.avatar ? <img src={u.avatar} alt="" width={40} height={40} style={{ borderRadius: "50%", border: "2px solid var(--border)", flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{u.username?.[0]?.toUpperCase()}</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.username}</div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${(u.coins / max) * 100}%`, background: i === 0 ? "linear-gradient(90deg, var(--gold), #fde68a)" : i === 1 ? "linear-gradient(90deg, #94a3b8, #cbd5e1)" : i === 2 ? "linear-gradient(90deg, #c47c2b, #fbbf24)" : "linear-gradient(90deg, var(--blue), var(--cyan))" }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: i === 0 ? "var(--gold)" : i === 1 ? "#94a3b8" : i === 2 ? "#c47c2b" : "var(--blue)", flexShrink: 0 }}>
                        {u.coins?.toLocaleString()} <span style={{ fontSize: 11, opacity: 0.7 }}>كوين</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* MODERATION */}
        {selectedGuild && activeSection === "moderation" && (
          <div className="fade-in">
            <div style={{ marginBottom: 32 }}>
              <div className="tag tag-green" style={{ marginBottom: 12 }}>الإشراف</div>
              <h1 style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 28, fontWeight: 900 }}>أدوات الإشراف</h1>
              <p style={{ color: "var(--muted)", marginTop: 6 }}>الأوامر المتاحة في {selectedGuild.name}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {[
                { cmd: "/حظر", desc: "حظر عضو من السيرفر", icon: "🚫", color: "var(--red)" },
                { cmd: "/طرد", desc: "طرد عضو من السيرفر", icon: "👢", color: "var(--gold)" },
                { cmd: "/تحذير", desc: "إصدار تحذير لعضو", icon: "⚠", color: "var(--gold)" },
                { cmd: "/التحذيرات", desc: "عرض تحذيرات عضو", icon: "📋", color: "var(--blue)" },
                { cmd: "/مسح_التحذيرات", desc: "مسح تحذيرات عضو", icon: "🧹", color: "var(--green)" },
                { cmd: "/معلومات", desc: "معلومات تفصيلية عن عضو", icon: "👤", color: "var(--blue)" },
                { cmd: "/السيرفر", desc: "معلومات السيرفر", icon: "🏠", color: "var(--purple)" },
                { cmd: "/config", desc: "إعدادات أنظمة البوت", icon: "⚙", color: "var(--muted)" },
              ].map(c => (
                <div key={c.cmd} className="card" style={{ padding: 20, display: "flex", gap: 14 }}>
                  <div style={{ fontSize: 26, flexShrink: 0 }}>{c.icon}</div>
                  <div>
                    <code style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: c.color, fontWeight: 700 }}>{c.cmd}</code>
                    <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 22, marginTop: 24, borderColor: "rgba(244,63,94,0.3)" }}>
              <h3 style={{ color: "var(--red)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>⚠ مهم</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                جميع أوامر الإشراف تتطلب الصلاحيات المناسبة. التحذيرات مخزنة حتى يتم مسحها.
                يحتاج البوت لـ <strong style={{ color: "var(--text)" }}>BanMembers</strong> و<strong style={{ color: "var(--text)" }}>KickMembers</strong>.
              </p>
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS */}
        {activeSection === "subscriptions" && (
          <SubscriptionsSection userId={user?.id} userSubscription={userSubscription} onNotif={setNotif} onRefresh={fetchSubscription} />
        )}

        {/* ADMIN PANEL */}
        {activeSection === "payment-requests" && isOwner && (
          <AdminPaymentRequests onNotif={setNotif} />
        )}

      </main>
    </div>
  );
}

// ═══════════════════════════
//  APP ROOT
// ═══════════════════════════
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