---
phase: 06-routing-infrastructure-design-system
plan: 01
subsystem: routing, design-system
tags: [middleware, fonts, design-tokens, landing-page]
dependency_graph:
  requires: []
  provides: [hostname-routing, landing-route, design-tokens, font-definitions]
  affects: [src/middleware.ts, src/app/layout.tsx, src/app/globals.css]
tech_stack:
  added: [next/font/google]
  patterns: [hostname-based-routing, css-variable-fonts]
key_files:
  created:
    - src/lib/fonts.ts
    - src/app/landing/layout.tsx
    - src/app/landing/page.tsx
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/components/layout/AppShell.tsx
    - src/middleware.ts
decisions:
  - Use next/font/google for self-hosted font loading (no CDN requests)
  - LANDING_HOSTNAMES configurable via env var with sensible defaults
  - Landing hostname non-root paths redirect to portal subdomain
  - Direct /landing access blocked on portal hostname to prevent route leakage
metrics:
  duration: 2m
  completed: 2026-04-12
---

# Phase 06 Plan 01: Hostname Routing & Design System Summary

Hostname-based middleware routing separates apex domain (landing page) from portal subdomain (dashboard), with Montserrat/Open Sans/Inter fonts via next/font and extended Tailwind design tokens for the landing page.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create font definitions and extend design tokens | b60d02f | src/lib/fonts.ts, src/app/globals.css |
| 2 | Restructure layouts for route separation | 8307329 | src/app/layout.tsx, src/app/landing/layout.tsx, src/app/landing/page.tsx, src/components/layout/AppShell.tsx |
| 3 | Add hostname detection to middleware | da857d6 | src/middleware.ts |

## What Was Built

1. **Font definitions** (`src/lib/fonts.ts`): Three font exports via `next/font/google` -- Montserrat (heading), Open Sans (body), Inter (portal/sans). Each sets a CSS variable (`--font-heading`, `--font-body`, `--font-sans`).

2. **Extended design tokens** (`src/app/globals.css`): Added `--color-navy-950`, `--color-gold-50`, `--color-gold-100`, `--color-gradient-start`, `--color-gradient-end`, `--font-heading`, `--font-body` to the `@theme inline` block. All existing tokens unchanged.

3. **Root layout cleanup** (`src/app/layout.tsx`): Removed three Google Fonts CDN `<link>` tags. Font loading now handled by `next/font` via `inter.variable` class on `<body>`.

4. **Landing layout** (`src/app/landing/layout.tsx`): Applies `montserrat.variable` and `openSans.variable` CSS classes. Sets `font-body` as default font family.

5. **Landing page placeholder** (`src/app/landing/page.tsx`): Minimal page using `bg-navy-950`, `font-heading`, `text-gold-50` tokens. Phase 7 will build full content.

6. **AppShell update** (`src/components/layout/AppShell.tsx`): Added `isLandingPage` check to hide sidebar for `/landing` paths.

7. **Middleware hostname routing** (`src/middleware.ts`): 
   - `LANDING_HOSTNAMES` set from env var (default: `peak360.com.au,www.peak360.com.au`)
   - Apex domain root rewrites to `/landing`
   - Apex domain `/api/*` passes through
   - Apex domain other paths redirect to `portal.peak360.com.au`
   - Portal hostname `/landing` redirects to `/` (prevents route leakage)
   - All existing auth logic preserved unchanged below routing block

## Verification Results

- `npm run build` passes with zero errors
- Landing route visible in build output as static page
- No Google Fonts CDN references in root layout
- All hostname routing patterns present in middleware
- Auth logic (validateSessionToken, peak360_session cookie) preserved

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| src/app/landing/page.tsx | 7 | "Landing page coming soon" placeholder text | Intentional -- Phase 7 will build full landing page content |
