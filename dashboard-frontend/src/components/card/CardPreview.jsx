/**
 * ═══════════════════════════════════════════════════════════
 *  Card Preview v2 — معاينة لحظية بشارات محسّنة
 *  المسار: dashboard-frontend/src/components/card/CardPreview.jsx
 * ═══════════════════════════════════════════════════════════
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  getThemeById,
  getBackgroundById,
  getBadgeById,
} from '@/lib/cardAssets';

const TIER_BADGE_DATA = {
  basic: { icon: '🥉', color: '#cd7f32', glow: '#cd7f3260' },
  advanced: { icon: '🥈', color: '#c0c0c0', glow: '#c0c0c060' },
  legendary: { icon: '👑', color: '#ffd700', glow: '#ffd70080' },
};

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

function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function resolveTheme(settings) {
  if (!settings) return getThemeById('amber').colors;

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
  const hasParticles = !!effects.particles;

  const badges = Array.isArray(settings.badges) ? settings.badges : [];

  const isPremium = tier !== 'free';
  const isLegendary = tier === 'legendary';
  const tierBadge = TIER_BADGE_DATA[tier];

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
          {/* ─── Gradients ─── */}
          <linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset={hasGradient ? '50%' : '100%'} stopColor={theme.secondary} />
            {hasGradient && <stop offset="100%" stopColor={theme.accent} />}
          </linearGradient>

          <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.accent} />
            <stop offset="100%" stopColor={theme.secondary} />
          </linearGradient>

          {/* ─── Badge Gradient (لكل شارة بلون مختلف عبر gradient) ─── */}
          <radialGradient id="badgeShine" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* ─── Glow filters ─── */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="badgeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="avatarClip">
            <circle cx="115" cy="125" r="65" />
          </clipPath>

          <clipPath id="cardClip">
            <rect x="0" y="0" width="900" height="250" rx="20" ry="20" />
          </clipPath>
        </defs>

        {/* ─── الخلفية الرئيسية ─── */}
        <rect width="900" height="250" rx="20" fill={theme.bg} />

        {/* ─── خلفية مخصصة ─── */}
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

        {/* ─── Particles effect (نقاط متحركة) ─── */}
        {hasParticles && isPremium && (
          <g opacity="0.6">
            {[...Array(8)].map((_, i) => (
              <circle
                key={i}
                cx={50 + i * 100}
                cy={30 + (i % 3) * 70}
                r="2"
                fill={theme.accent}
              >
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  dur={`${2 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`${30 + (i % 3) * 70};${20 + (i % 3) * 70};${30 + (i % 3) * 70}`}
                  dur={`${3 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

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

        {/* ─── حلقة الـ rank ─── */}
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

        {/* ─── شارة الفئة على الصورة (محسّنة) ─── */}
        {isPremium && tierBadge && (
          <g>
            {/* glow حول الشارة */}
            {isLegendary && (
              <circle cx="172" cy="180" r="22" fill={tierBadge.glow}>
                <animate
                  attributeName="r"
                  values="18;22;18"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0.8;0.4"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx="172"
              cy="180"
              r="17"
              fill={tierBadge.color}
              stroke="#000"
              strokeWidth="2.5"
              filter="url(#dropShadow)"
            />
            <circle cx="170" cy="178" r="15" fill="url(#badgeShine)" />
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

        {/* ═══════════════════════════════════════
           ✨ الشارات المحسّنة (Premium Look)
        ═══════════════════════════════════════ */}
        {badges.slice(0, 8).map((badgeId, idx) => {
          const badge = getBadgeById(badgeId);
          if (!badge) return null;

          const x = 210 + idx * 32;
          const y = 110;
          const size = 13;

          return (
            <g key={badgeId} filter="url(#badgeGlow)">
              {/* ─── Glow halo خفيف ─── */}
              <circle
                cx={x + size}
                cy={y + size}
                r={size + 3}
                fill={badge.color}
                opacity="0.25"
              />

              {/* ─── الشارة الأساسية (gradient) ─── */}
              <defs>
                <radialGradient id={`badge-grad-${badgeId}`} cx="0.3" cy="0.3" r="0.9">
                  <stop offset="0%" stopColor={badge.color} stopOpacity="1" />
                  <stop offset="60%" stopColor={badge.color} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={badge.color} stopOpacity="0.7" />
                </radialGradient>
              </defs>

              <circle
                cx={x + size}
                cy={y + size}
                r={size}
                fill={`url(#badge-grad-${badgeId})`}
                filter="url(#dropShadow)"
              />

              {/* ─── Inner shine ─── */}
              <circle
                cx={x + size - 3}
                cy={y + size - 3}
                r={size - 2}
                fill="url(#badgeShine)"
              />

              {/* ─── Border ─── */}
              <circle
                cx={x + size}
                cy={y + size}
                r={size}
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1.5"
              />

              {/* ─── الأيقونة ─── */}
              <text
                x={x + size}
                y={y + size + 4.5}
                textAnchor="middle"
                fontSize="14"
              >
                {badge.emoji}
              </text>
            </g>
          );
        })}

        {/* ─── الترتيب ─── */}
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

        {/* ─── المستوى ─── */}
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

        {/* ─── XP labels ─── */}
        <text x="210" y="170" fontSize="14" fill="#8b949e">
          XP
        </text>
        <text x="860" y="170" textAnchor="end" fontSize="14" fontWeight="bold" fill="#e6edf3">
          {formatNum(data.currentXP)} / {formatNum(data.requiredXP)}
        </text>

        {/* ─── شريط التقدم ─── */}
        <rect x="210" y="180" width="650" height="22" rx="11" fill="#21262d" />

        <rect
          x="210"
          y="180"
          width={(data.progressPercent / 100) * 650}
          height="22"
          rx="11"
          fill="url(#xpGrad)"
        />

        {/* ─── Shine effect ─── */}
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

        {/* ─── نسبة التقدم ─── */}
        {data.progressPercent > 15 && (
          <text
            x={210 + ((data.progressPercent / 100) * 650) / 2}
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