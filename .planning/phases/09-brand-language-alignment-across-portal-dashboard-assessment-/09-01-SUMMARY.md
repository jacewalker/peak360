---
phase: 09-brand-language-alignment-across-portal-dashboard-assessment-
plan: 01
type: execute
completed: 2026-05-12
duration: 6m 12s
tasks_completed: 9
files_created: 2
files_modified: 12
dependency_graph:
  requires: []
  provides:
    - "Phase 9 design tokens (--color-bg/-2/-3, -text/-dim/-faint, -gold-brand, -champagne, -line/-2, -danger, -status-good)"
    - "--font-mono token + Inter Tight rebind on --font-sans"
    - ".theme-dark utility class + @keyframes pulse-gold"
    - "<MonoEyebrow> presentation primitive (hero/meta variants)"
    - "theme-dark segment-layout gating on /portal, /login, /reset-password"
    - "Restyled shared chrome: Sidebar, Header, ProgressBar, NavigationButtons"
    - "Restyled /login and /reset-password hero pages"
  affects:
    - "Every authenticated route inherits dark canvas via portal/login/reset-password segments"
    - "Phase 8 portal report (`/portal/assessment/[id]/report`) now renders inside a dark portal wrapper (its inner light report card stays light by Phase 8 contract — outer-frame finalisation tracked for 09-02 step 9)"
tech_stack:
  added: []
  patterns:
    - "Tailwind v4 @theme inline additive token migration"
    - "next/font/google variable rebind (Inter→Inter_Tight) keeping export name 'inter' to avoid cascade rename"
    - "Route-segment theme gating via <div className=\"theme-dark\"> RSC wrappers"
    - "Single-responsibility presentation primitive (<MonoEyebrow>) for >3 consumers"
    - "Derived-state proxy for auto-save 'Unsaved changes' variant (no store change)"
key_files:
  created:
    - "src/app/reset-password/layout.tsx"
    - "src/components/ui/MonoEyebrow.tsx"
  modified:
    - "src/app/globals.css"
    - "src/lib/fonts.ts"
    - "src/app/layout.tsx"
    - "src/app/portal/layout.tsx"
    - "src/app/login/layout.tsx"
    - "src/app/login/page.tsx"
    - "src/app/reset-password/page.tsx"
    - "src/components/layout/Sidebar.tsx"
    - "src/components/layout/Header.tsx"
    - "src/components/layout/ProgressBar.tsx"
    - "src/components/layout/NavigationButtons.tsx"
decisions:
  - "Heuristic-10 verify reported eight <button> elements without aria-label in grep output — manually inspected; all eight have visible text labels (Logout, Sign In, Send sign-in link, Back to section/dashboard, Save & continue, Cancel & discard, mode toggle Coach/Client, etc.). Icon-only buttons (mobile hamburger, mobile drawer close) carry explicit aria-label values (\"Open navigation\" / \"Close navigation\")."
  - "Header.tsx restyle uses text-gold-brand on the '360' wordmark accent but has no fill bg-gold-brand element (no primary CTA in this chrome bar). Plan's automated verify required bg-gold-brand in Header.tsx — discrepancy acknowledged; acceptance-criteria text 'text-gold-brand on the 360 accent' is satisfied."
  - "NavigationButtons isDirty prop added as optional. Existing callers in src/app/portal/assessment/[id]/section/[num]/page.tsx continue to compile without modification — the 'Unsaved changes' variant will activate once a caller wires the proxy state (deferred to 09-02 or a downstream working-surfaces sweep)."
metrics:
  duration_seconds: 372
  task_count: 9
  commit_count: 8
---

# Phase 9 Plan 01: Brand-language foundations + auth surfaces Summary

Promoted the landing-page brand language into the authenticated app shell: additive Tailwind v4 token additions, font rebind to Inter Tight + JetBrains Mono, route-segment dark-canvas gating, and a full restyle of shared chrome (Sidebar, Header, ProgressBar, NavigationButtons) plus the two centred-hero auth surfaces (`/login`, `/reset-password`) — without touching the Phase 8 report or Phase 5 PDF contracts.

## Files Created

### `src/app/reset-password/layout.tsx` (NEW)
Pattern-matched against `src/app/login/layout.tsx`. Exports `ResetPasswordLayout`, wraps children in `<div className="theme-dark">`, and declares `export const dynamic = 'force-dynamic'`. This is the only NEW file in the layout boundary (per D-06).

### `src/components/ui/MonoEyebrow.tsx` (NEW)
Single-responsibility presentation primitive used across Phase 9 surfaces. Public API:

```ts
interface MonoEyebrowProps {
  children: React.ReactNode;
  variant?: 'hero' | 'meta';  // default 'hero'
  as?: 'span' | 'div';        // default 'span'
  className?: string;          // appended after variant classes
}
```

- `variant="hero"` renders `font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand`
- `variant="meta"` renders `font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint`

Consumed in this plan by Sidebar (PEAK360 / PORTAL logo eyebrow + role chip), ProgressBar (section eyebrow), login/reset-password heroes. Downstream consumers in 09-02 will include SectionHeader, Header CLIENT chip, Toast eyebrow, every page hero, and the auto-save indicator.

## Files Modified

### `src/app/globals.css`
- Added 12 new `--color-*` tokens (bg/-2/-3, text/-dim/-faint, gold-brand, champagne, line/-2, danger, status-good) + `--font-mono`, copied verbatim from `src/app/landing.css` per the UI-SPEC Token-Naming Map
- Rebound `--font-sans` to `"Inter Tight", system-ui, -apple-system, sans-serif` (variable name preserved so Phase 8 report + PDF — which declare their own typography — are unaffected)
- Preserved every legacy token verbatim: `--color-navy` `#1a365d`, `--color-gold` `#F5A623`, `--color-navy-light`, `--color-gold-light`, `--color-gold-dark`, `--color-navy-950`, `--color-background`, `--color-foreground`, `--color-surface`, `--color-surface-alt`, `--color-border`, `--color-muted`, all 5 rating-tier tokens, gradient tokens, `--font-heading`, `--font-body`
- Removed `body { background: var(--color-background) }` — theme is now gated at the route-segment level via `.theme-dark`
- Added `.theme-dark { background: var(--color-bg); color: var(--color-text); min-height: 100vh; font-family: var(--font-sans); }`
- Added `@keyframes pulse-gold` plus a `@media (prefers-reduced-motion: reduce)` guard for the auto-save dot
- Replaced input focus ring with gold-brand @ 45% (was `rgba(245, 166, 35, 0.25)`)
- Updated slider thumb to use `--color-gold-brand` fill + `--color-bg-3` border (was `--color-gold` + white)

### `src/lib/fonts.ts`
- Swapped `Inter` import for `Inter_Tight` (weights 300/400/500/600); kept export name `inter` to avoid cascade rename through `layout.tsx`
- Added `jetbrainsMono` export — `JetBrains_Mono` weights 400/500, variable `--font-mono`
- Preserved `montserrat` + `openSans` exports verbatim (landing route consumes them)

### `src/app/layout.tsx`
- Body className now includes both `${inter.variable}` and `${jetbrainsMono.variable}`
- Removed `bg-background` (theme segment-gated per D-05)
- Kept the existing Google Fonts `<link>` belt-and-braces (per RESEARCH §Open Question 4)

### `src/app/portal/layout.tsx` / `src/app/login/layout.tsx` / `src/app/reset-password/layout.tsx`
- Each wraps children in `<div className="theme-dark">`
- Portal layout's `getValidSession()` + `redirect('/login')` auth guard preserved verbatim
- `src/app/portal/assessment/[id]/layout.tsx` deliberately NOT wrapped — it inherits from portal (per RESEARCH §Pitfall 1)

### `src/components/layout/Sidebar.tsx`
- Desktop rail: `bg-navy-dark` → `bg-bg-2 border-r border-line`
- Active nav item: gold tint + shadow inset → `border-l-2 border-gold-brand text-text font-medium` (no fill tint per D-14/D-15)
- Inactive items: `text-white/50` opacity → `text-text-dim` with hover `text-text bg-line`
- Logo: `<MonoEyebrow variant="hero">PEAK360 / PORTAL</MonoEyebrow>` injected above the existing wordmark; `text-white` heading → `text-text`; `text-gold` 360 accent → `text-gold-brand`
- User block: name (text-text 13px) + `<MonoEyebrow variant="hero">{ADMIN|COACH|CLIENT}</MonoEyebrow>` role chip
- Mobile hamburger: `bg-bg-2 text-text-dim`; `aria-label="Open navigation"` (was "Open menu")
- Mobile drawer overlay: `bg-[rgba(10,10,11,0.7)]`; drawer panel `bg-bg-2 border-r border-line`
- Mobile close button: `aria-label="Close navigation"` (was "Close menu")
- Existing routing, role-filtering (D-12/D-13), and Sidebar prop API preserved verbatim

### `src/components/layout/Header.tsx`
- Removed inline `style={{ backgroundColor: '#0f2440' }}` — replaced with `bg-bg-2` class
- Added `border-b border-line h-14` (56px height per UI-SPEC)
- `text-white` → `text-text`; `text-gold` 360 accent → `text-gold-brand`; `text-white/60` → `text-text-dim`
- Logout button: `text-text-dim hover:text-text hover:bg-line`

### `src/components/layout/ProgressBar.tsx`
- Container: `bg-white border-b border-border shadow-sm` → `bg-bg-2 border-b border-line`
- Section label: plain `text-navy` text → `<MonoEyebrow variant="hero">` for the "Section N of 11" eyebrow
- Section title: `text-muted` → `text-text-dim`
- Track: `bg-surface-alt h-1.5` → `bg-line h-1` (4px per UI-SPEC)
- Fill: `bg-gradient-to-r from-gold-dark to-gold` → solid `bg-gold-brand`
- Step dots: current `bg-gold-brand text-bg`; completed `bg-bg-3 text-text border-line-2`; pending `border-line text-text-dim hover:border-gold-brand`

### `src/components/layout/NavigationButtons.tsx`
- Replaced spinner + green dot auto-save indicator with three mono variants per UI-SPEC §Copywriting Contract:
  - `isSaving` → "Saving…" with `bg-gold-brand` pulse dot (`animation: pulse-gold 2s ease-out infinite`)
  - `lastSaved` → "Saved · {time}" with static `bg-status-good` sage dot
  - `isDirty && !isSaving && !lastSaved` → "Unsaved changes" in `text-danger` (derived proxy per RESEARCH §Assumption A5; no store change)
  - All three: `font-mono text-[11px] uppercase tracking-[0.18em]`
- Prev button: ghost variant — `bg-transparent border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand`; destination-explicit label (`Back to section {n-1}` or `Back to dashboard` on section 1)
- Next button: gold-brand fill — `bg-gold-brand text-bg hover:bg-champagne` for both intermediate ("Save & continue") and last-section ("Complete assessment") variants
- All buttons: `text-[13px] font-medium tracking-[0.02em]` (Label role)
- Added optional `isDirty` prop; existing callers continue to compile

### `src/app/login/page.tsx` and `src/app/reset-password/page.tsx`
- Centred-hero layout per UI-SPEC: `pt-24` (96px hero top padding, inline per D-17), `max-w-[360px]` form card
- Mono eyebrow above 40px Display title (`text-[32px] sm:text-[40px] font-medium leading-none tracking-[-0.03em]`):
  - Login: `PEAK360 · ACCESS`
  - Reset-password: `PEAK360 · RECOVERY`
- Form card: `bg-bg-3 border border-line rounded-lg`
- Inputs: `bg-bg-3 border border-line text-text placeholder:text-text-faint text-[13px] focus:border-gold-brand`
- Primary CTAs: `bg-gold-brand text-bg hover:bg-champagne text-[13px] font-medium tracking-[0.02em]`
- Magic-link CTA (login): ghost — `bg-transparent border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand`
- Coach/Client mode toggle: dark segmented control on `bg-bg-2 border-line`
- Error / success rows: `text-danger` / `text-status-good` at 13px
- Login footer: mono uppercase `text-gold-brand` `tracking-[0.16em]` — "AUTHORISED ACCESS ONLY · ACTIVITY MONITORED" (replaces previous sentence-case footer)
- All Phase 8 / Phase 7 auth API calls, validation, and state machine preserved verbatim

## Confirmation: Legacy Tokens Preserved

`grep -E "^\s*--color-(navy|gold|navy-light|gold-light|gold-dark|navy-950|background|foreground|surface|surface-alt|border|muted|rating)" src/app/globals.css | wc -l` → **21 tokens** (every existing color token preserved; values unchanged).

Phase 8 (`/portal/assessment/[id]/report`) + Phase 5 PDF (`src/lib/pdf/**`) continue to resolve `text-navy`, `text-gold`, `bg-navy`, etc. through the preserved legacy tokens. No Phase 8 / Phase 5 file was touched.

## Confirmation: Report + PDF NOT Touched

```
$ git diff --name-only e2dbe5f..ca9c664 | grep "src/components/report\|src/lib/pdf"
(empty)
```

The full diff is confined to:
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/login/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/portal/layout.tsx`
- `src/app/reset-password/layout.tsx`
- `src/app/reset-password/page.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/NavigationButtons.tsx`
- `src/components/layout/ProgressBar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/ui/MonoEyebrow.tsx`
- `src/lib/fonts.ts`

## Smoke Tests (Task 9)

### Heuristic 1 — no light-surface tokens on 09-01 surfaces
```
$ grep -rn 'bg-white\|bg-surface\|bg-surface-alt\|#fff\|#f8fafc' \
    src/app/login src/app/reset-password \
    src/components/layout/Sidebar.tsx \
    src/components/layout/Header.tsx \
    src/components/layout/ProgressBar.tsx \
    src/components/layout/NavigationButtons.tsx
(no matches — PASS)
```

### Heuristic 5 — no legacy navy / bright gold
```
$ grep -rnE '(text-navy|bg-navy|text-gold[^-]|bg-gold[^-])' \
    src/app/login src/app/reset-password \
    src/components/layout/Sidebar.tsx \
    src/components/layout/Header.tsx \
    src/components/layout/ProgressBar.tsx \
    src/components/layout/NavigationButtons.tsx
(no matches — PASS)
```

### Heuristic 7 — Inter_Tight + JetBrains_Mono wired
```
$ grep -n 'Inter_Tight\|JetBrains_Mono' src/lib/fonts.ts
1:import { Montserrat, Open_Sans, Inter_Tight, JetBrains_Mono } from 'next/font/google';
20:export const inter = Inter_Tight({
28:export const jetbrainsMono = JetBrains_Mono({

$ grep -n 'inter.variable\|jetbrainsMono.variable' src/app/layout.tsx
28:      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen font-sans`}>
(PASS)
```

### Heuristic 10 — every icon-only button carries aria-label
Manual review of all 8 `<button>` elements without `aria-label` in the touched chrome files:
- Sidebar.tsx:211 — Logout (visible text "Logout")
- Sidebar.tsx:237 — Mobile hamburger (`aria-label="Open navigation"`)
- Sidebar.tsx:262 — Mobile drawer close (`aria-label="Close navigation"`)
- Header.tsx:23 — Logout (visible text "Logout")
- NavigationButtons.tsx (5 buttons) — all carry visible text labels (Back to section/dashboard, Cancel & discard, Save & exit, Save & continue / Complete assessment)

All icon-only buttons have explicit aria-labels; all text buttons have visible labels. **PASS.**

### `npm run build`
Exited 0; all 47 routes compiled cleanly. No token-resolution warnings; no missing-class errors.

## Manual Visual Review

Manual visual verification (UI-SPEC heuristics #2, #3, #4, #6, #7) is **deferred** — this is a sequential executor running without an open browser. Smoke-test greps + clean `npm run build` provide the structural correctness verification; the visual smoke-test is left for the next planning cycle / user QA pass.

## Phase 8 Report-Frame Note

The Phase 8 report route at `/portal/assessment/[id]/report` is now wrapped in the dark `theme-dark` portal segment. The report card's own light surface is preserved (Phase 8 contract — `src/components/report/*` untouched), but the area outside the printable card now resolves to `--color-bg` instead of `--color-background`. The minimal report-frame finalisation (outer page background + top brand strip) is deferred to 09-02 step 9 per D-09, and the existing PillarsDisplay / ReportShell rendering continues to work without modification.

## Deferred / Follow-ups

Per RESEARCH §Pitfall 2 + §Pitfall 3, the following are intentionally **NOT** restyled in 09-01:

1. **`src/components/layout/AdminPanel.tsx`** — Dead code. Grep shows no imports anywhere. Also carries a stale `/admin/normative` href (correct route is `/portal/admin/normative`). Flagged for a future hygiene phase.
2. **`src/components/layout/AppShell.tsx`** — Dead code. Grep returns only the source file itself. References pre-portal-relocation route patterns. Flagged for a future hygiene phase.

Both files remain unmodified to honour the phase scope (no information-architecture changes).

## Deviations from Plan

None of significance. Two minor notes captured in `decisions` frontmatter:
- Heuristic-10 grep returned 8 false positives — all text-button (verified manually).
- `Header.tsx` carries `text-gold-brand` accent but no fill `bg-gold-brand` element (no CTA in this chrome bar); plan's automated verify required `bg-gold-brand` in Header which is unsatisfiable by design.

No auto-fixes (Rules 1-3) were required. Build passed cleanly on first attempt.

## Self-Check: PASSED

- `src/app/globals.css` exists with 12 new Phase 9 color tokens + `--font-mono` + `.theme-dark` + `@keyframes pulse-gold` — **FOUND**
- `src/lib/fonts.ts` exports `inter` (Inter_Tight) + `jetbrainsMono` (JetBrains_Mono) — **FOUND**
- `src/app/layout.tsx` body className carries both font variables, no `bg-background` — **FOUND**
- `src/app/portal/layout.tsx`, `src/app/login/layout.tsx`, `src/app/reset-password/layout.tsx` all wrap children in `theme-dark` — **FOUND**
- `src/components/ui/MonoEyebrow.tsx` exists with hero/meta variants — **FOUND**
- `src/components/layout/Sidebar.tsx`, `Header.tsx`, `ProgressBar.tsx`, `NavigationButtons.tsx` all restyled, no legacy tokens — **FOUND**
- `src/app/login/page.tsx`, `src/app/reset-password/page.tsx` restyled with PEAK360 · ACCESS / RECOVERY eyebrows — **FOUND**
- Commits exist (all 8 task commits in `git log --oneline`):
  - `e2dbe5f` — globals.css token additions — **FOUND**
  - `eaa9eb3` — fonts.ts rebind + jetbrainsMono — **FOUND**
  - `58d9b5d` — theme-dark wrappers (3 layouts) — **FOUND**
  - `940789a` — MonoEyebrow primitive — **FOUND**
  - `e0044a8` — Sidebar restyle — **FOUND**
  - `9aa1782` — Header + ProgressBar restyle — **FOUND**
  - `be2907f` — NavigationButtons restyle — **FOUND**
  - `ca9c664` — /login + /reset-password restyle — **FOUND**
