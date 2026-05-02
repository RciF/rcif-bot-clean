# Dashboard Frontend V2 — Day 1 Setup

## Stack
- Vite 6.0+
- React 19
- Tailwind CSS v4 (with @tailwindcss/vite plugin)
- shadcn/ui (new-york style, violet base)
- IBM Plex Sans Arabic (primary font)
- Path alias: `@/*` → `./src/*`

## Color System (Lyn Brand)
- Primary: Violet (lyn-50 → lyn-950, base 500 = oklch(0.606 0.25 292.717))
- Accent: Pink (lyn-pink-50 → lyn-pink-950, base 500 = oklch(0.656 0.241 354.308))
- Signature gradient: 135deg from lyn-500 to lyn-pink-500
- All shadcn tokens available: background, foreground, primary, card, etc.

## Files Created (Day 1)
- `package.json` — all dependencies pinned to latest stable
- `vite.config.js` — Tailwind v4 plugin, @ alias, dev proxy to :3000, manual chunks
- `jsconfig.json` — IDE path resolution
- `components.json` — shadcn/ui config (style: new-york, baseColor: violet)
- `index.html` — RTL, Arabic locale, OG tags, font preconnect
- `src/index.css` — full theme system (light/dark), RTL, animations, utilities
- `src/lib/utils.js` — cn(), formatNumber(), formatCompact(), sleep(), truncate()
- `src/main.jsx` — React 19 entry point
- `src/App.jsx` — landing page demonstrating theme system
- `public/lyn-icon.svg` — gradient favicon
- `.gitignore`, `.env.example`

## RTL Strategy
- Default `<html dir="rtl" lang="ar">`
- Numbers wrapped in `.num` class for LTR override
- Code blocks (`code`, `pre`, `.ltr`) forced LTR
- Tailwind v4 logical properties handle most spacing automatically

## Theme System
- CSS variables for all tokens (light + dark)
- `.dark` class on `<html>` toggles theme
- `@theme inline` block maps CSS vars to Tailwind utilities
- shadcn-compatible (background, foreground, primary, etc.)

## Custom Utilities (Tailwind classes)
- `.lyn-gradient` — violet→pink gradient bg
- `.lyn-gradient-soft` — light tinted gradient
- `.lyn-text-gradient` — gradient text
- `.lyn-glass` — frosted glass with backdrop-blur
- `.lyn-glow` / `.lyn-glow-violet` / `.lyn-glow-pink` — colored shadows
- `.lyn-border-animated` — animated gradient border
- `.animate-lyn-pulse` / `.animate-lyn-float` / `.animate-lyn-fade-up` / `.animate-lyn-shimmer`

## Dev Proxy
- `/api/*` → `http://localhost:3000` (dashboard-backend)

## Build Output
- Manual chunks: react-vendor, ui-vendor, data-vendor, chart-vendor
- Output: `dist/`

## Verification Checklist (Day 1)
- [ ] `npm run dev` starts without errors
- [ ] Arabic text renders with IBM Plex Sans Arabic
- [ ] Page is RTL by default
- [ ] Light/dark toggle works
- [ ] Gradient text and glass effects render correctly
- [ ] No console errors

## Next (Day 2)
React Router v7 setup, layouts, routing structure.
