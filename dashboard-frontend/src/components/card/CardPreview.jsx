/**
 * ═══════════════════════════════════════════════════════════
 *  Card Preview — معاينة لحظية للبطاقة
 *  المسار: dashboard-frontend/src/components/card/CardPreview.jsx
 *
 *  يحاكي تصميم بطاقة Discord باستخدام SVG
 *  - يعكس الإعدادات اللحظية بدون انتظار حفظ
 *  - يدعم: theme, background, badges, effects, tier
 * ═══════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  getThemeById,
  getBackgroundById,
  getBadgeById,
} from '@/lib/cardAssets';

// ════════════════════════════════════════════════════════════
//  TIER ICONS
// ════════════════════════════════════════════════════════════

const TIER_BADGE_DATA = {
  basic: { icon: '🥉', color: '#cd7f32' },
  advanced: { icon: '🥈', color: '#c0c0c0' },
  legendary: { icon: '👑', color: '#ffd700' },
};

// ════════════════════════════════════════════════════════════
//  DEFAULT PREVIEW DATA
// ════════════════════════════════════════════════════════════

const DEFAULT_PREVIEW = {
  username: 'RcIf',
  avatarUrl: null,
  level: 12,
  rank: 1,
  currentXP: 1240,
  requiredXP: 3000,
  totalXP: 4240,
  progressPercent: 41,
};

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function resolveTheme(settings) {
  if (!settings) return getThemeById('amber').colors;

  // ─── ألوان مخصصة ───
  if (settings.custom_colors && typeof settings.custom_colors === 'object') {
    const cc = settings.custom_colors;
    if (cc.accent || cc.bg || cc.bgCard) {
      const base = getThemeById('amber').colors;
      return {
        accent: cc.accent || base.accent,
        secondary: cc.secondary || cc.accent || base.secondary,
        bg: cc.bg || base.bg,
        bgCard: cc.bgCard || base.bgCard,
      };
    }
  }

  return getThemeById(settings.theme_id || 'amber').colors;
}

function resolveBackground(settings) {
  if (!settings) return null;
  if (settings.custom_background_url) return settings.custom_background_url;
  if (settings.background_id && settings.background_id !== 'default') {
    const bg = getBackgroundById(settings.background_id);
    return bg?.url || null;
  }
  return null;
}

// ════════════════════════════════════════════════════════════
//  COMPONENT
// ════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {object} props.settings - إعدادات البطاقة
 * @param {string} props.tier - فئة المستخدم
 * @param {object} props.previewData - بيانات المعاينة (username, level, ...)
 * @param {string} props.userAvatarUrl - رابط الصورة الشخصية
 */
export function CardPreview({
  settings = {},
  tier = 'free',
  previewData = DEFAULT_PREVIEW,
  userAvatarUrl = null,
  className,
}) {
  const data = { ...DEFAULT_PREVIEW, ...previewData };
  const theme = useMemo(() => resolveTheme(settings), [settings]);
  const bgImage = useMemo(() => resolveBackground(settings), [settings]);

  const effects = settings.effects || {};
  const hasGlow = !!effects.glow;
  const hasGradient = !!effects.gradient;
  const hasPulse = !!effects.pulse;
  const hasShine = !!effects.shine;
  const hasAnimatedBorder = !!effects.animated_border;

  const badges = Array.isArray(settings.badges) ? settings.badges : [];

  const isPremium = tier !== 'free';
  const isLegendary = tier === 'legendary';
  const tierBadge = TIER_BADGE_DATA[tier];

  const fillW = Math.max(40, (data.progressPercent / 100) * 580);

  const avatar = userAvatarUrl || data.avatarUrl;

  return (
    <div
      className={cn(
        'relative w-full max-w-[900px] aspect-[900/250] rounded-2xl overflow-hidden shadow-2xl',
        hasAnimatedBorder && 'ring-2 ring-offset-2 ring-amber-500/50 animate-pulse',
        className,
      )}
      dir="ltr"
    >
      <svg
        viewBox="0 0 900 250"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* ─── Gradient للـ XP bar ─── */}
          <linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset={hasGradient ? '50%' : '100%'} stopColor={theme.secondary} />
            {hasGradient && <stop offset="100%" stopColor={theme.accent} />}
          </linearGradient>

          {/* ─── Gradient للاسم (لو effect gradient مفعّل) ─── */}
          <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset="100%" stopColor={theme.secondary} />
          </linearGradient>

          {/* ─── Glow filter ─── */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ─── Clip path للصورة دائرية ─── */}
          <clipPath id="avatarClip">
            <circle cx="115" cy="125" r="65" />
          </clipPath>

          {/* ─── Clip path للبطاقة كاملة (rounded) ─── */}
          <clipPath id="cardClip">
            <rect x="0" y="0" width="900" height="250" rx="20" ry="20" />
          </clipPath>
        </defs>

        {/* ─── الخلفية الرئيسية ─── */}
        <rect width="900" height="250" rx="20" fill={theme.bg} />

        {/* ─── خلفية مخصصة (لو موجودة) ─── */}
        {bgImage && (
          <g clipPath="url(#cardClip)">
            <image
              href={bgImage}
              x="0"
              y="0"
              width="900"
              height="250"
              preserveAspectRatio="xMidYMid slice"
            />
            <rect width="900" height="250" fill="rgba(0,0,0,0.55)" />
          </g>
        )}

        {/* ─── البطاقة الداخلية (لو ما في خلفية) ─── */}
        {!bgImage && (
          <rect x="10" y="10" width="880" height="230" rx="16" fill={theme.bgCard} />
        )}

        {/* ─── شريط لوني علوي ─── */}
        <rect
          x="10"
          y="10"
          width="880"
          height="4"
          rx="2"
          fill={theme.accent}
          opacity="0.7"
        />

        {/* ─── Pulse حول الصورة ─── */}
        {hasPulse && isPremium && (
          <circle
            cx="115"
            cy="125"
            r="75"
            fill="none"
            stroke={theme.accent}
            strokeWidth="3"
            opacity="0.4"
          >
            <animate
              attributeName="r"
              from="65"
              to="80"
              dur="1.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              from="0.6"
              to="0"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* ─── دائرة خلفية للصورة ─── */}
        <circle cx="115" cy="125" r="69" fill="#30363d" />

        {/* ─── الصورة الشخصية ─── */}
        {avatar ? (
          <image
            href={avatar}
            x="50"
            y="60"
            width="130"
            height="130"
            clipPath="url(#avatarClip)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <>
            <circle cx="115" cy="125" r="65" fill={theme.accent} opacity="0.3" />
            <text
              x="115"
              y="135"
              textAnchor="middle"
              fontSize="48"
              fontWeight="bold"
              fill={theme.accent}
            >
              {data.username[0]?.toUpperCase() || 'U'}
            </text>
          </>
        )}

        {/* ─── حلقة الـ rank حول الصورة ─── */}
        <circle
          cx="115"
          cy="125"
          r="69"
          fill="none"
          stroke={
            data.rank === 1
              ? '#fbbf24'
              : data.rank === 2
              ? '#94a3b8'
              : data.rank === 3
              ? '#c47c2b'
              : theme.accent
          }
          strokeWidth="3"
        />

        {/* ─── شارة الفئة على الصورة ─── */}
        {isPremium && tierBadge && (
          <g>
            <circle
              cx="172"
              cy="180"
              r="16"
              fill={tierBadge.color}
              stroke="#000"
              strokeWidth="2"
              filter={isLegendary ? 'url(#glow)' : undefined}
            />
            <text x="172" y="187" textAnchor="middle" fontSize="18">
              {tierBadge.icon}
            </text>
          </g>
        )}

        {/* ─── اسم المستخدم ─── */}
        <text
          x="210"
          y="92"
          fontSize="32"
          fontWeight="bold"
          fill={hasGradient && isPremium ? 'url(#nameGrad)' : '#e6edf3'}
          filter={hasGlow && isPremium ? 'url(#glow)' : undefined}
          style={{ fontFamily: 'sans-serif' }}
        >
          {data.username.slice(0, 18)}
        </text>

        {/* ─── شارات المستخدم ─── */}
        {badges.slice(0, 8).map((badgeId, idx) => {
          const badge = getBadgeById(badgeId);
          if (!badge) return null;
          const x = 210 + idx * 26;
          const y = 115;
          return (
            <g key={badgeId}>
              <circle cx={x + 11} cy={y + 11} r="11" fill={badge.color} />
              <circle
                cx={x + 11}
                cy={y + 11}
                r="11"
                fill="none"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="1.5"
              />
              <text x={x + 11} y={y + 16} textAnchor="middle" fontSize="13">
                {badge.emoji}
              </text>
            </g>
          );
        })}

        {/* ─── الترتيب (يمين) ─── */}
        <text x="860" y="78" textAnchor="end" fontSize="16" fill="#8b949e">
          الترتيب
        </text>
        <text
          x="860"
          y="108"
          textAnchor="end"
          fontSize="32"
          fontWeight="bold"
          fill={
            data.rank === 1
              ? '#fbbf24'
              : data.rank === 2
              ? '#94a3b8'
              : data.rank === 3
              ? '#c47c2b'
              : theme.accent
          }
        >
          #{data.rank}
        </text>

        {/* ─── المستوى (يمين، قبل الترتيب) ─── */}
        <text x="750" y="78" textAnchor="end" fontSize="16" fill="#8b949e">
          المستوى
        </text>
        <text
          x="750"
          y="108"
          textAnchor="end"
          fontSize="32"
          fontWeight="bold"
          fill={theme.accent}
          filter={hasGlow && isPremium ? 'url(#glow)' : undefined}
        >
          {data.level}
        </text>

        {/* ─── XP label ─── */}
        <text x="210" y="170" fontSize="14" fill="#8b949e">
          XP
        </text>
        <text x="860" y="170" textAnchor="end" fontSize="14" fontWeight="bold" fill="#e6edf3">
          {formatNum(data.currentXP)} / {formatNum(data.requiredXP)}
        </text>

        {/* ─── شريط التقدم (الخلفية) ─── */}
        <rect x="210" y="180" width="650" height="22" rx="11" fill="#21262d" />

        {/* ─── شريط التقدم (المعبأ) ─── */}
        <rect
          x="210"
          y="180"
          width={(data.progressPercent / 100) * 650}
          height="22"
          rx="11"
          fill="url(#xpGrad)"
        />

        {/* ─── Shine effect على الشريط ─── */}
        {hasShine && isPremium && data.progressPercent > 10 && (
          <rect
            x={210 + (data.progressPercent / 100) * 650 - 30}
            y="180"
            width="30"
            height="22"
            rx="11"
            fill="rgba(255,255,255,0.3)"
          >
            <animate
              attributeName="x"
              from="210"
              to={210 + (data.progressPercent / 100) * 650 - 30}
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* ─── نسبة التقدم داخل الشريط ─── */}
        {data.progressPercent > 15 && (
          <text
            x={210 + (data.progressPercent / 100) * 650 / 2}
            y="195"
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill="#000"
            opacity="0.7"
          >
            {data.progressPercent}%
          </text>
        )}

        {/* ─── إجمالي XP ─── */}
        <text x="860" y="225" textAnchor="end" fontSize="12" fill="#8b949e">
          إجمالي: {formatNum(data.totalXP)} XP
        </text>
      </svg>
    </div>
  );
}