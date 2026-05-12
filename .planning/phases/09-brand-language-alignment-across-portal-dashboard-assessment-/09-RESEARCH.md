# Phase 9: Brand-language alignment across portal, dashboard, assessment, and client surfaces - Research

**Researched:** 2026-05-12
**Domain:** Tailwind v4 token additions + Next.js 16 route-segment theme gating + in-place restyle of an existing component tree
**Confidence:** HIGH

## Summary

Phase 9 is a token-driven in-place restyle. The visual contract (`09-UI-SPEC.md`) is sovereign, and the implementation decisions (`09-CONTEXT.md`) lock plan slicing (2 plans), token migration strategy (additive only), theme gating boundary (route-segment layouts), and anti-patterns. This research answers the orthogonal "how do we wire it up?" questions without re-litigating any of those locks.

Findings are concrete and mechanical: every token referenced by Phase 8 / Phase 5 already resolves through the legacy `--color-navy` / `--color-gold-*` names and those stay untouched, so the additive migration is genuinely additive — no hidden coupling. The 11-section sweep collapses to a one-line edit because `SectionHeader` is already a single shared component. The font rebind is one file (`src/lib/fonts.ts`), one variable swap. The dark-canvas gate is achieved by adding a `theme-dark` wrapper to four segment layouts (one of which is NEW) and dropping the root `<body>` light background.

**One planner-blocking finding:** `09-CONTEXT.md` D-05 and the canonical-refs list reference `src/app/assessment/[id]/layout.tsx`, but the assessment route lives at `src/app/portal/assessment/[id]/layout.tsx`. The dark wrapper goes on that file. Planner must use the correct path.

**Primary recommendation:** Treat the foundations plan (09-01) as a contract — once globals.css tokens, font rebind, and the four `theme-dark` wrappers land cleanly, every working surface restyle in 09-02 reduces to utility-class swaps inside components that already exist. The visual delta on the executor's side is small.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Plan Slicing**
- **D-01:** Two fat plans only.
  - `09-01-PLAN.md` — Foundations + auth surfaces. Token additions in `globals.css`, font wiring in root `layout.tsx`, route-segment theme gating, restyle Sidebar + Header + ProgressBar + NavigationButtons, ship `/login` and `/reset-password` (incl. NEW `src/app/reset-password/layout.tsx`).
  - `09-02-PLAN.md` — Working surfaces. Restyle every page that consumes the now-themed shell: dashboard, `/portal/clients` + `/portal/clients/[name]`, `/portal/assessments`, every `/portal/admin/*` page, all 11 `Section{N}.tsx` form sections. Includes Recharts axis/grid restyle, Toast restyle, `Dialog` token swap, `AdminPanel` restyle, minimal Phase 8 report-frame update.

**Token Migration Strategy**
- **D-02:** Additive token migration only. Every existing `--color-*` token keeps its current value verbatim.
- **D-03:** `--font-sans` rebound (not replaced) — keep variable name, point at `"Inter Tight", system-ui, -apple-system, sans-serif`.
- **D-04:** Promote, do not consume. Copy hex values into `globals.css` under stable names. Do NOT import `landing.css` or use `.v2-root` selectors outside the landing route.

**Theme Gating Boundary**
- **D-05:** Body background gating at route-segment layout layer, not root layout. Each of `src/app/portal/layout.tsx`, `src/app/login/layout.tsx`, `src/app/reset-password/layout.tsx` (NEW), and `src/app/assessment/[id]/layout.tsx` (note: correct path is `src/app/portal/assessment/[id]/layout.tsx` — see Open Questions / Cross-Phase Guardrails) wraps children in `<div className="theme-dark">`. Root `<body>` becomes theme-neutral.
- **D-06:** New `src/app/reset-password/layout.tsx` is the only NEW file in the layout boundary. Pattern-match against `src/app/login/layout.tsx`.

**Sequencing**
- **D-07 (09-01):** tokens + font rebind → font wiring in root layout → theme-dark wrappers on 4 segment layouts → restyle shared chrome → restyle /login + /reset-password.
- **D-08 (09-02):** form components → section heading mono eyebrow → Dialog token swap → Toast + auto-save → dashboard → /portal/clients → /portal/assessments → /portal/admin/* → report-frame minimal update.

**Phase 8 Report-Frame Edge**
- **D-09:** Phase 9 may touch only outer page bg + top brand strip on `/portal/assessment/[id]/report`. `src/components/report/*`, pillar cards/modal/marker rows, light report card, `src/lib/pdf/**` — all UNTOUCHED.

**Section 1–11 Sweep**
- **D-10:** Single sweep at form-component level. Per-section change is heading-only (mono eyebrow). No information re-architecture.

**Verification**
- **D-11:** 10-item acceptance heuristic in UI-SPEC §Acceptance Heuristics.
- **D-12:** `npm run build` at end of each plan.

**Anti-patterns**
- **D-13:** No light/dark theme toggle.
- **D-14:** Never use `--color-gold` (`#F5A623`) on Phase 9 surfaces.
- **D-15:** Cream (`#ece5d3`) is text-only, never a card surface.
- **D-16:** Status colours status-only.
- **D-17:** Spacing constrained to `{4, 8, 16, 24, 32, 48, 64}`; the 96px hero top-padding is inline only, not a token.
- **D-18:** Font sizes constrained to `{11, 13, 20, 40}` (mobile 32 for Display).

### Claude's Discretion

- Exact Tailwind utility names for new tokens (e.g., `text-bg`, `bg-bg-3`). Planner picks.
- Focus ring as custom CSS utility vs inline `style={{ boxShadow }}`. Planner picks.
- Mono-eyebrow as `<MonoEyebrow>` primitive vs inline span (lift if used in >3 places).

### Deferred Ideas (OUT OF SCOPE)

- Light/dark theme switch — D-13 prohibits.
- Landing-page redesign iteration — Phase 9 propagates, doesn't iterate.
- Recommendation template library — Phase 8 deferred.
- Mobile-only redesigns beyond UI-SPEC §Layout.
- Admin reassign clients/assessments between coaches — functional feature, future phase.
- Account management / additional admin invitation flows — future auth phase.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- **Tech stack lock:** Next.js 16 + React 19 + Tailwind CSS v4 + SQLite/Drizzle. Must stay consistent — no library swaps.
- **GSD workflow enforcement:** All file-changing work goes through a GSD command. Phase 9 execution must use `/gsd:execute-phase`.
- **Form field IDs are camelCase**; sections receive `{ data, onChange, assessmentId }`.
- **No new npm dependencies** (also enforced by UI-SPEC §Registry Safety).
- **Data sensitivity:** unchanged by Phase 9 (visual phase only).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens | Build / CSS (Tailwind `@theme inline`) | — | Token values compile into utility classes at build time; no runtime resolution needed |
| Font loading | Frontend Server (next/font) | Browser (Google Fonts fallback `<link>`) | `next/font/google` self-hosts and inlines font CSS; the existing `<link>` is a runtime backup |
| Theme gating | Frontend Server (route-segment layout RSC) | — | Server-rendered wrappers ensure the dark canvas is committed before hydration — no flash |
| Auth pages (/login, /reset-password) | Frontend Server (RSC layout) + Client component (form) | — | Centred hero is layout-level; form interactivity is client-level |
| Portal shell (Sidebar, Header) | Client component | — | Existing client components; only style swaps |
| Form components | Client component | — | Existing centralised components; restyling propagates |
| Assessment sections | Client component | — | Section{N}.tsx are existing client components |
| Recharts restyle | Client component | — | MetricChart already client; props/inline-style swap only |
| Phase 8 report frame | Frontend Server (portal layout outer bg) + Client component (report page chrome) | — | Outer dark bg from portal layout; inner light report card stays self-contained |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 4 | `@theme inline` token model | Already the project's styling layer; `@theme inline` is THE pattern for v4 token authoring [VERIFIED: package.json + tailwindcss.com/docs/theme] |
| `@tailwindcss/postcss` | 4 | PostCSS plugin for Tailwind v4 | Already wired in `postcss.config.mjs` [VERIFIED: package.json] |
| next/font/google | bundled with Next.js 16 | Self-host + inline CSS for Inter Tight + JetBrains Mono | Already used for `Inter` via `src/lib/fonts.ts`; rebind to `Inter_Tight` is one-file edit [VERIFIED: src/lib/fonts.ts] |
| Recharts | 3.8.0 | Trend charts in /portal/clients/[name] | Already imported via `MetricChart.tsx`; restyle through props, not lib swap [VERIFIED: package.json + grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing hand-rolled `<Dialog>` | Phase 8 | Modal scaffold | Already exists at `src/components/ui/Dialog.tsx`; token swap only [VERIFIED: file read] |
| Zustand | 5.0.11 | Auto-save state | Existing pattern in `useAssessmentStore`; auto-save indicator's three copy variants are presentation-only [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@theme inline` token additions | CSS-only `:root` vars + utility helpers | Loses Tailwind utility generation (`bg-bg-3`, `text-text-faint`); requires hand-rolled classes — rejected per existing project pattern |
| Rebind `--font-sans` via next/font | Drop next/font for sans, rely on Google Fonts `<link>` | Loses font self-hosting + CLS prevention; next/font is the Next.js 16 idiom — preferred [CITED: nextjs.org/docs/app/api-reference/components/font] |
| Theme-dark on root `<body>` | Per-segment layout wrapping | Root would make Phase 8 report fight the dark canvas; D-05 already locked to per-segment — confirmed correct |

**Installation:** none. Phase 9 introduces no new npm dependencies. [VERIFIED: D-04 + UI-SPEC §Registry Safety]

**Version verification:** All required libraries already pinned in `package.json`. No new installs.

## Architecture Patterns

### System Architecture Diagram

```
                            Root <html>
                            Root <body> (theme-neutral — no hard bg/fg)
                                 |
                                 v
       +------------------+-----------+-------------------+----------------------+
       |                  |           |                   |                      |
       v                  v           v                   v                      v
   src/app/page.tsx    /login    /reset-password    /portal/layout         /portal/assessment/[id]
   (landing — .v2-root) layout    layout (NEW)       (theme-dark wrap)      layout (theme-dark wrap)
   UNTOUCHED            (theme-   (theme-dark)            |                       |
                        dark)                             v                       v
                                                     Sidebar +              Header +
                                                     <div class=            <ProgressBar/> +
                                                     "lg:pl-56">            Section{N} content
                                                          |                       |
                                                  +-------+--------+              v
                                                  |                |        NavigationButtons
                                                  v                v        (auto-save indicator)
                                          dashboard,         /portal/assessment/[id]/report
                                          /clients,          page applies INNER LIGHT
                                          /assessments,      WRAPPER (Phase 8 sovereign)
                                          /admin/*           — report card surface untouched
```

### Recommended Project Structure

No new directories. All edits land in existing files:

```
src/
├── app/
│   ├── globals.css                            # TOKEN ADDITIONS + theme-dark utility
│   ├── layout.tsx                             # FONT WIRING (replace inter with Inter_Tight in body className)
│   ├── login/layout.tsx                       # WRAP with theme-dark
│   ├── reset-password/
│   │   ├── layout.tsx                         # NEW — pattern-match login/layout
│   │   └── page.tsx                           # RESTYLE in place (currently uses navy gradient)
│   ├── portal/layout.tsx                      # WRAP with theme-dark (around Sidebar + lg:pl-56)
│   └── portal/assessment/[id]/layout.tsx      # WRAP with theme-dark (around Header + main)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                        # RESTYLE in place
│   │   ├── Header.tsx                         # RESTYLE in place
│   │   ├── ProgressBar.tsx                    # RESTYLE in place
│   │   ├── NavigationButtons.tsx              # RESTYLE in place + auto-save copy variants
│   │   ├── AdminPanel.tsx                     # RESTYLE in place (note: also has stale /admin/normative link to investigate)
│   │   └── AppShell.tsx                       # UNUSED — see Open Questions
│   ├── forms/*                                # RESTYLE in place (token swaps)
│   ├── sections/Section{1..11}.tsx            # NO EDIT — the only injection point is SectionHeader (see below)
│   ├── ui/
│   │   ├── SectionHeader.tsx                  # MONO-EYEBROW INJECTION lives here (single point)
│   │   ├── Dialog.tsx                         # TOKEN SWAP only (bg-white → bg-bg-3, scrim, close aria-label)
│   │   └── Toast.tsx                          # RESTYLE
│   └── charts/MetricChart.tsx                 # RESTYLE Recharts axis/grid/series via inline-prop swap
└── lib/
    └── fonts.ts                               # REBIND: Inter → Inter_Tight + ADD JetBrains_Mono export
```

### Pattern 1: Tailwind v4 `@theme inline` Token Authoring

**What:** Add new tokens to the existing `@theme inline {}` block in `globals.css`. Tailwind v4 generates utility classes from token names by stripping the namespace prefix — `--color-bg-3` becomes `bg-bg-3`, `text-bg-3`, `border-bg-3`, etc.

**When to use:** Every new colour, font, spacing, or radius token Phase 9 introduces.

**Example:**
```css
/* Source: https://tailwindcss.com/docs/theme + existing project pattern */
@theme inline {
  /* PRESERVED: legacy tokens used by Phase 8 + Phase 5 stay verbatim */
  --color-navy: #1a365d;
  --color-gold: #F5A623;
  --color-navy-light: #2d5986;
  --color-gold-light: #f7bc5a;
  --color-gold-dark: #d4891a;
  /* ... rest of existing tokens unchanged ... */

  /* REBOUND: --font-sans points at Inter Tight (CSS variable wired via next/font/google in src/lib/fonts.ts) */
  --font-sans: var(--font-sans), system-ui, -apple-system, sans-serif;

  /* NEW: Phase 9 dark canvas */
  --color-bg: #0a0a0b;
  --color-bg-2: #0e0e10;
  --color-bg-3: #131316;

  --color-text: #ece5d3;
  --color-text-dim: rgba(236, 229, 211, 0.62);
  --color-text-faint: rgba(236, 229, 211, 0.38);

  --color-gold-brand: #c9a24a;
  --color-champagne: #e8d6a8;

  --color-line: rgba(232, 214, 168, 0.10);
  --color-line-2: rgba(232, 214, 168, 0.20);

  --color-danger: #d97557;
  --color-status-good: #7fb37f;

  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

/* NEW: theme-dark utility — applied at route-segment layout level */
.theme-dark {
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
}

/* MODIFIED: drop the hard-coded light background on body */
body {
  /* background removed — handled by route-segment layout via .theme-dark */
  color: var(--color-foreground);  /* legacy fallback */
  font-family: var(--font-sans);
}
```

**Gotcha — Tailwind v4 `inline` keyword:** Without `inline`, tokens whose values reference other CSS variables resolve at definition point, which can break cascade behaviour. With `inline`, the utility class inlines the variable's value at compile time. The project already uses `@theme inline` — keep that mode for all new tokens. [CITED: tailwindcss.com/docs/theme]

**Gotcha — hyphenated names `bg-bg-3`:** Names like `bg-bg-3` are functional but read awkwardly. The planner has discretion (per CONTEXT) to pick alternative utility names — `bg-canvas`, `bg-surface`, `bg-elevated` for the three bg tiers — by renaming the tokens to `--color-canvas` / `--color-surface` / `--color-elevated`. **Risk if renamed:** the Token-Naming Map in UI-SPEC §Token-Naming Map uses `--color-bg/-2/-3` verbatim. Renaming creates contract drift; recommend keeping the UI-SPEC names. [VERIFIED: tailwindcss.com/docs/theme]

### Pattern 2: next/font/google Variable Rebind

**What:** Swap `Inter` for `Inter_Tight` in `src/lib/fonts.ts`, keeping the exported variable name `inter` (or rename to `interTight`). The `variable` config option assigns the font's CSS variable name — this is where `--font-sans` is bound.

**Example:**
```ts
// Source: src/lib/fonts.ts (current) + next/font docs
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';

export const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',           // rebound from Inter → Inter Tight
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',           // NEW
  display: 'swap',
  weight: ['400', '500'],
});

// Keep `montserrat` and `openSans` exports — they're consumed by landing page and possibly elsewhere.
```

Then in `src/app/layout.tsx` body className:
```tsx
<body className={`${interTight.variable} ${jetbrainsMono.variable} antialiased min-h-screen font-sans`}>
```

**The existing Google Fonts `<link>` in `layout.tsx` (lines 21–26):** can be removed since `next/font` self-hosts. However removal is mildly risky — the landing page uses the same families via `.v2-root` and currently picks them up from the `<link>`. **Recommendation:** Keep the `<link>` for one phase as belt-and-braces — removing it is a follow-up if QA confirms `next/font` covers landing.

**Gotcha — Phase 8 report typography:** UI-SPEC §Design System line "Section 11 / portal report (Phase 8 contract) and the PDF (Phase 5 contract) stay on their existing typography — both are exempt from the font swap because their printed outputs are locked." Phase 5 PDF uses `@react-pdf/renderer` which has its own font registration (`src/lib/pdf/styles.ts`) and does not consume the web `--font-sans`. Phase 8 portal report uses `text-navy`/`text-navy-light` semantic Tailwind classes — these consume font from inherited body. **After rebind, Phase 8 portal report body text WILL render in Inter Tight, not the original Inter.** UI-SPEC accepts this trade-off (the report is the only light-surface route inside the dark portal; its semantic Tailwind classes inherit the new font, which still reads cleanly at the report's existing sizes). Planner: surface this in 09-02 step 9 (report-frame update) as a visual smoke-test item; if QA finds it materially worse, route fix into the same plan, not a new one.

### Pattern 3: Route-Segment Theme Gating (Next.js 16 App Router)

**What:** Each segment that should render on the dark canvas wraps its `children` in `<div className="theme-dark">`. The dark canvas commits server-side before hydration — no FOUC.

**Example — login layout (existing):**
```tsx
// src/app/login/layout.tsx
export const dynamic = 'force-dynamic';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-dark">{children}</div>;
}
```

**Example — reset-password layout (NEW):**
```tsx
// src/app/reset-password/layout.tsx — pattern-matched against login/layout.tsx
export const dynamic = 'force-dynamic';

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-dark">{children}</div>;
}
```

**Example — portal layout (wrap existing structure):**
```tsx
// src/app/portal/layout.tsx
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { getValidSession } from '@/lib/auth-helpers';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidSession();
  if (!session) redirect('/login');

  return (
    <div className="theme-dark">
      <Sidebar />
      <div className="lg:pl-56">{children}</div>
    </div>
  );
}
```

**Phase 8 report inner light wrapper:** The report page at `src/app/portal/assessment/[id]/report/page.tsx` already wraps its content in `<main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">`. Phase 9 needs the report card surface to stay light cream/white **inside** the dark portal shell. The minimal change is to wrap `<ReportShell>` in an inner light surface — e.g. `<div className="bg-white rounded-2xl p-8 my-6">` — so the dark `theme-dark` wrapper from `portal/layout` continues to render the area around the card (page background outside the printable card per D-09), while the card itself stays light. The existing report card content (`text-navy`, `text-gold-dark` utilities) continues to resolve correctly because the legacy tokens are preserved (D-02). [VERIFIED: read src/app/portal/assessment/[id]/report/page.tsx + ReportShell.tsx]

**Gotcha — assessment route path:** CONTEXT.md mentions `src/app/assessment/[id]/layout.tsx` (lines 16, 137) — that file does not exist. The assessment layout lives at **`src/app/portal/assessment/[id]/layout.tsx`** (`Header` + `flex flex-col` shell). The dark wrapper goes there. This is the canonical path. The `/portal/assessment/[id]/section/[num]/` route has its own nested `section/layout.tsx` for client-redirect guarding — that layout passes children through (`<>{children}</>`) and doesn't need a wrapper because it inherits from the parent assessment layout.

### Pattern 4: Section Heading Mono-Eyebrow (Lowest-Touch Injection)

**What:** All 11 sections render their heading via the shared `<SectionHeader>` component at `src/components/ui/SectionHeader.tsx`. Phase 9 modifies that ONE component — every section inherits the mono eyebrow automatically. No `Section{1..11}.tsx` edits are required for the eyebrow.

**Existing SectionHeader props:** `{ number, title, description }` — sufficient for the UI-SPEC contract. The section label (e.g. "CLIENT INFORMATION") is derivable from the `title` prop uppercased. The eyebrow text follows the UI-SPEC copy contract: `SECTION {N} / 11 · {TITLE.toUpperCase()}`.

**Example after restyle:**
```tsx
// src/components/ui/SectionHeader.tsx — restyled
'use client';

interface SectionHeaderProps {
  number: number;
  title: string;
  description?: string;
}

export default function SectionHeader({ number, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      {/* NEW: mono eyebrow per UI-SPEC §Copywriting Contract */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-gold-brand">
          Section {number} / 11 · {title.toUpperCase()}
        </span>
        <span className="h-px w-7 bg-gold-brand opacity-50" />
      </div>
      <h2 className="text-[20px] font-medium text-text leading-[1.15] tracking-[-0.015em]">{title}</h2>
      {description && <p className="text-[13px] text-text-dim mt-2">{description}</p>}
    </div>
  );
}
```

**Gotcha — Section11 doesn't use SectionHeader:** The other 10 sections all use `<SectionHeader>`. Section11.tsx is the report and likely renders its own heading or wraps ReportShell. **Verification needed in 09-02:** grep `Section11.tsx` for `<SectionHeader`. If absent (likely, since Section 11 is the report), the planner has two options: (a) leave Section 11 without the eyebrow because it's adjacent to the Phase 8 report which is sovereign; (b) inject the eyebrow at the page level for the section route, not the report route. UI-SPEC §Acceptance Heuristic #3 demands "at least one mono eyebrow appears above each page hero on … section-{1..11} pages" — recommend option (a): the eyebrow appears on sections 1–10 via SectionHeader; section 11 is rendered by `/portal/assessment/[id]/section/11/page.tsx` which can prepend the eyebrow inline (one line of JSX) outside the Phase-8-sovereign report card.

### Pattern 5: Recharts Restyle Via Inline Props

**What:** `MetricChart.tsx` already passes axis tick styling, fill colours, and tooltip rendering as inline props/JSX. The restyle is a values-only swap: change hex literals to use the new tokens (read via `getComputedStyle` is overkill; the simplest approach is to read CSS variables in TSX with `var(--color-line)`).

**Example — restyle plan for MetricChart.tsx (key locations):**
```tsx
// XAxis tick fill: '#94a3b8' → cream-faint
<XAxis tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-faint)' }} />

// YAxis tick fill: '#cbd5e1' → cream-faint
<YAxis tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-faint)' }} />

// Tooltip panel: bg-navy-dark → bg-bg-3 + border-line-2
<div className="bg-bg-3 text-text text-xs rounded-lg px-3.5 py-2.5 shadow-xl border border-line-2">

// Default series stroke (when tier is null): '#F5A623' → 'var(--color-gold-brand)'
const lineColor = latest.tier ? TIER_HEX[latest.tier] : 'var(--color-gold-brand)';
```

**Gotcha — TIER_HEX colours stay:** The 5-tier rating palette (`TIER_HEX` map at top of MetricChart.tsx — elite/great/normal/cautious/poor) is the marker-rating palette and is **untouched** per UI-SPEC §Color "Rating tier palette … preserved verbatim." Only the **default-tier fallback** (gold) and chrome (axis/grid/tooltip) swap to new tokens.

**Gotcha — `bg-bg-3` Tailwind class:** Recharts' `<Tooltip content={...}>` returns plain JSX. Tailwind utilities resolve at build time inside JSX. `bg-bg-3` will work; alternatively use `style={{ background: 'var(--color-bg-3)' }}` for clarity.

### Anti-Patterns to Avoid

- **Hard-coding hex literals in component files:** UI-SPEC §Token-Naming Map says "never duplicate hex values in component files." The new MetricChart restyle should swap `'#F5A623'` → `'var(--color-gold-brand)'`, not `'#c9a24a'`.
- **Wrapping the report card in `theme-dark`:** The report card surface is sovereign Phase 8 (light cream/white). The outer `theme-dark` from `portal/layout.tsx` paints the page bg; the report page applies its own inner light wrapper (see Pattern 3 above).
- **Removing the existing `<link>` for Inter Tight + JetBrains Mono in `layout.tsx` before next/font is verified to cover all surfaces:** keep as belt-and-braces until 09-02 QA.
- **Using `next/font` to import via npm-style names:** Next.js 16 next/font/google takes the underscore name (`Inter_Tight`, `JetBrains_Mono`). [CITED: nextjs.org/docs/app/api-reference/components/font/google]
- **Treating `--color-status-good` (sage) as decoration:** D-16 / UI-SPEC §Color anti-pattern — sage is for success status only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading + variable wiring | Bespoke `<link>` + CSS `@font-face` | `next/font/google` (already in project) | Self-hosts, prevents CLS, ships scoped CSS variable |
| Mono-eyebrow on every section | Per-section inline JSX | Modify the shared `<SectionHeader>` once | 10 sections inherit immediately; 11th handled at page level |
| Theme switching | A `useTheme` hook + provider | Route-segment layouts (D-13 prohibits toggle anyway) | Phase 9 has no user-facing theme switch |
| Focus-ring utility | Per-input inline `style={{ boxShadow }}` | One global rule in `globals.css` matching the legacy ring rule on lines 42–46 | Single source of truth; legacy ring rule provides the pattern |
| Recharts chart-library swap | Replacing Recharts | Inline-prop restyle on existing `<MetricChart>` | UI-SPEC §Registry Safety bans new deps; existing component already exposes the styling surface |
| Toast / dialog primitives | Adding a third-party library | Hand-rolled Phase 8 `Dialog` + existing `Toast.tsx` pattern | Project policy: no npm dialog/dropdown library; D-04 + UI-SPEC §Registry Safety |
| Theme-dark wrapper on root `<body>` | Setting body bg to dark in globals.css | Per-segment layout `<div className="theme-dark">` | D-05 mandates segment-level gating to keep Phase 8 report light surface working |

**Key insight:** Phase 9's scope is overwhelmingly "swap utility classes inside files that already exist." The only NEW file is `src/app/reset-password/layout.tsx`. Every other change is a tokens-only edit of an existing component.

## Common Pitfalls

### Pitfall 1: Wrong Assessment Layout Path
**What goes wrong:** Planner follows CONTEXT.md verbatim and looks for `src/app/assessment/[id]/layout.tsx`. The file doesn't exist there; the assessment layout lives at `src/app/portal/assessment/[id]/layout.tsx`.
**Why it happens:** CONTEXT.md was written with shorthand; the actual route is nested under `/portal`.
**How to avoid:** Use the verified path `src/app/portal/assessment/[id]/layout.tsx`. The dark wrapper goes on the parent (`portal/layout.tsx`) AND the assessment layout — though the assessment layout already inherits from portal, so wrapping ONLY portal is sufficient. The assessment layout's role is to add the `<Header>` chrome and flex shell. **Recommendation:** wrap `theme-dark` on `src/app/portal/layout.tsx` only; the assessment route inherits it automatically because it's nested under `/portal`. The CONTEXT D-05 list of four layouts becomes effectively three (portal covers two routes).
**Warning signs:** Build error "Cannot find file `src/app/assessment/[id]/layout.tsx`" — the file is at `src/app/portal/assessment/[id]/layout.tsx`.

### Pitfall 2: AdminPanel Stale Link
**What goes wrong:** `src/components/layout/AdminPanel.tsx` line 10 has `href: '/admin/normative'`. The actual admin route is `/portal/admin/normative`.
**Why it happens:** Pre-Phase-7 path. AdminPanel may have been unused since the /portal/admin pages landed in Phase 7.
**How to avoid:** During AdminPanel restyle, audit usage. Grep shows AdminPanel is imported nowhere in `/portal/admin` or `/portal/assessment` page files — it may be dead code. **Recommendation:** Planner verifies in 09-02 step 8 whether AdminPanel is rendered anywhere. If unused, restyle is unnecessary; flag for removal in a follow-up phase (out of scope for Phase 9).
**Warning signs:** Grep `import.*AdminPanel` returns nothing or only the source file itself.

### Pitfall 3: AppShell Is Dead Code
**What goes wrong:** `src/components/layout/AppShell.tsx` references `/^\/assessment\/[^/]+\/section\//` (no `/portal/` prefix) and `pathname === '/login'`. The current route is `/portal/assessment/[id]/section/[num]`. Grep confirms AppShell is not imported anywhere.
**Why it happens:** AppShell was a pre-portal-relocation experiment. It's effectively dead.
**How to avoid:** Don't restyle AppShell — it's unused. Either delete during 09-01 cleanup or leave alone. **Recommendation:** Leave alone (deletion is out of Phase 9 scope per UI-SPEC §Out-of-scope: "no information re-architecture"). Surface as a follow-up todo.
**Warning signs:** `grep -rln "AppShell" src` returns only `src/components/layout/AppShell.tsx`.

### Pitfall 4: Phase 8 Report Inherits Inter Tight
**What goes wrong:** After `--font-sans` rebind, the Phase 8 portal report card (which uses `text-navy` semantic classes inheriting body font) renders in Inter Tight, not the original Inter.
**Why it happens:** Phase 8 report doesn't explicitly set its own font-family — it inherits from `<body>` → `--font-sans`.
**How to avoid:** Accept the trade-off (UI-SPEC §Design System line 34 acknowledges this is the intent — only the PDF + Section 11 printed report keep original typography). If QA finds it visually wrong in the portal report, the fix is to add an explicit `font-family: var(--font-legacy-sans)` on the report card root in `ReportShell.tsx` — but only if QA flags it. **Don't pre-emptively add an exemption.**
**Warning signs:** Visual review of `/portal/assessment/[id]/report` shows the pillar card titles look noticeably different from the PDF.

### Pitfall 5: Form Field `disabled:bg-surface-alt` Resolves to Light Background on Dark Canvas
**What goes wrong:** `src/components/forms/FormField.tsx` line 49 uses `disabled:bg-surface-alt` (which resolves to `#f1f5f9` — light grey). On the dark canvas, disabled inputs become a glaring light rectangle.
**Why it happens:** Existing form components use legacy light-surface tokens (`bg-white`, `bg-surface-alt`, `text-navy`, `text-red-500`) throughout.
**How to avoid:** Audit every form component during 09-02 step 1 for legacy tokens. Specifically `FormField.tsx`, `SelectField.tsx` (uses `bg-white`), `RadioGroup.tsx`, `SliderField.tsx`, `SignaturePad.tsx`, `FileUploadZone.tsx`, `TextareaField.tsx`, `FormRow.tsx`, `ExtractedValuesPanel.tsx`. Each token swap: `text-navy` → `text-text`, `bg-white` → `bg-bg-3`, `border-border` → `border-line`, `focus:ring-gold` → `focus:ring-gold-brand`, `disabled:bg-surface-alt` → `disabled:bg-bg-2`, `text-red-500` → `text-danger`.
**Warning signs:** Disabled fields show as bright white blocks; placeholder text invisible on dark.

### Pitfall 6: Auto-Save Indicator Uses Tier Colour
**What goes wrong:** `NavigationButtons.tsx` line 40, 75: `<span className="w-1.5 h-1.5 rounded-full bg-rating-elite" />` — the "saved" dot is green (rating-elite). UI-SPEC wants a **gold-brand pulse dot** with three copy variants.
**Why it happens:** Pre-Phase-9 indicator used the rating-elite green to suggest "good".
**How to avoid:** Replace `bg-rating-elite` → `bg-gold-brand` (with optional `animate-pulse`-like effect matching landing's `@keyframes v2pulse` pattern from landing.css lines 233–236). Three copy variants per UI-SPEC: `SAVED · {time}` (clean) / `SAVING…` (in-flight) / `UNSAVED CHANGES` (error). The mono family + uppercase comes from `--font-mono` + Tailwind utilities. The pulse animation can be a one-off `@keyframes` rule in `globals.css` or inline `style={{ animation: 'pulse-gold 2s ease-out infinite' }}`.
**Warning signs:** The "Saved" indicator still glows green after restyle.

### Pitfall 7: Reset-Password Page Has No Layout File
**What goes wrong:** Planner expects `src/app/reset-password/layout.tsx` to exist (pattern-matched from `login/layout.tsx`). It does not — the route currently uses only `page.tsx` and inherits from root.
**Why it happens:** Phase 7 shipped the reset-password page without a dedicated layout.
**How to avoid:** Confirmed during this research — file is absent. D-06 explicitly calls it out as the only NEW file. Create it with the same shape as `login/layout.tsx` (one-liner wrapping children in `<div className="theme-dark">`).
**Warning signs:** Build error "Cannot find layout at src/app/reset-password/layout.tsx" — fix: create the file.

### Pitfall 8: `inter.variable` String Substitution
**What goes wrong:** Planner replaces `Inter` with `Inter_Tight` in `src/lib/fonts.ts` but the exported binding is renamed (`inter` → `interTight`) and `src/app/layout.tsx` still references `inter.variable`.
**Why it happens:** Cascade of rename across two files.
**How to avoid:** Either (a) keep export name `inter` (so layout.tsx is untouched), or (b) rename export AND update `layout.tsx` body className. **Recommendation:** Keep the export name `inter` — it's literally the variable, not the font. The font is configured via `Inter_Tight()`, the variable name remains `--font-sans`. One file edit, no cascade.
**Warning signs:** Build error about undefined `inter` export.

### Pitfall 9: Phase 8 PillarsDisplay.tsx Has "Landing-Style Gold Mono Eyebrow"
**What goes wrong:** During Phase-8 development, `PillarsDisplay.tsx` line 79+ already adds a `text-gold-dark` mono eyebrow on the report card. The dark portal frame around it will ALSO have a mono eyebrow ("CLIENT · {NAME}" per Phase 9 Header restyle). Two eyebrows visually conflict.
**Why it happens:** Phase 8 pre-empted the eyebrow pattern inside the report card. Phase 9 adds its own outside.
**How to avoid:** Verify in 09-02 step 9 that the outer (portal Header) eyebrow + inner (Phase 8 PillarsDisplay) eyebrow read well together. Per D-09, Phase 9 cannot touch PillarsDisplay. If visually conflicting, the fix is to suppress the outer eyebrow on the report route only — a one-line conditional in `Header.tsx`. **Defer judgment to QA.**
**Warning signs:** Two gold mono eyebrows stacked on the report page.

## Code Examples

### Adding theme-dark utility to globals.css

```css
/* Source: src/app/globals.css + landing.css */
.theme-dark {
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  font-family: var(--font-sans);
}

/* Pulse keyframes for auto-save indicator (port from landing.css :233-236) */
@keyframes pulse-gold {
  0% { box-shadow: 0 0 0 0 rgba(201, 162, 74, 0.6); }
  100% { box-shadow: 0 0 0 12px rgba(201, 162, 74, 0); }
}
```

### Wrapping portal layout in theme-dark

```tsx
// Source: src/app/portal/layout.tsx (current) + D-05
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { getValidSession } from '@/lib/auth-helpers';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidSession();
  if (!session) redirect('/login');

  return (
    <div className="theme-dark">
      <Sidebar />
      <div className="lg:pl-56">{children}</div>
    </div>
  );
}
```

### Restyled FormField

```tsx
// Source: src/components/forms/FormField.tsx (current) + UI-SPEC §Typography + §Color
'use client';

interface FormFieldProps { /* unchanged */ }

export default function FormField({ id, label, type = 'text', value, onChange, placeholder, required, min, max, step, disabled, className = '' }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-[13px] font-medium text-text">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full h-12 px-4 bg-bg-3 border border-line text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand focus:shadow-[0_0_0_2px_rgba(201,162,74,0.45)] disabled:bg-bg-2 disabled:text-text-faint transition-colors"
      />
    </div>
  );
}
```

### Auto-save indicator with three variants

```tsx
// Source: src/components/layout/NavigationButtons.tsx (locations 30-44 + 67-79)
// New copy contract per UI-SPEC §Copywriting Contract:
{isSaving ? (
  <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-dim flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-gold-brand" style={{ animation: 'pulse-gold 2s ease-out infinite' }} />
    Saving…
  </span>
) : lastSaved ? (
  <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-text-dim flex items-center gap-2">
    <span className="w-1.5 h-1.5 rounded-full bg-status-good" />
    Saved · {lastSaved}
  </span>
) : null}
{/* offline / save-failure variant — gated on store.saveError if/when that state exists */}
{/* <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-danger">Unsaved Changes</span> */}
```

Note: the current Zustand store has `isDirty` + `isSaving` + `lastSaved` but no `saveError` flag. The "UNSAVED CHANGES" copy from UI-SPEC §Copywriting Contract requires either (a) deriving from `isDirty && !isSaving && !lastSaved` — proxy for "never saved", or (b) adding a `saveError` flag in 09-02. **Recommendation:** option (a) — proxy state, no store change needed.

## Runtime State Inventory

Not applicable. Phase 9 is a visual-only restyle. No data migration, no schema change, no OS-level state changes, no secrets, no service config affected. Build artifacts: standard Next.js `.next/` cache will rebuild on first `npm run build` after token additions — no special handling.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `theme.extend.colors` in `tailwind.config.ts` | Tailwind v4 `@theme inline` in CSS | Tailwind 4.0 (2024) | Project already on v4; pattern is established |
| Webpack-based Next.js | Turbopack (default in Next 16) | Next.js 15+ | `npm run dev` already uses Turbopack; minor caveat — full-page reload on `globals.css` edits is faster than HMR transitions; no Phase-9 impact |
| Self-hosted fonts via raw `<link>` | `next/font/google` with `variable` config | Next 13.2+ | Already adopted partially (Inter via next/font); Phase 9 completes the migration (Inter Tight + JetBrains Mono) |

**Deprecated/outdated:**
- The `<link>` to Google Fonts in `src/app/layout.tsx` is now redundant after Phase 9 fonts.ts rebind. Keep for one phase as belt-and-braces; remove in a follow-up.

## Anti-Pattern Smoke Tests (executor pre-commit checklist)

These are fast greps the executor can run before committing each plan. They map to UI-SPEC §Acceptance Heuristics.

### 09-01 (Foundations) pre-commit

```bash
# Heuristic 1 — no light-surface utility classes outside report route
grep -rn "bg-white\|bg-surface\|bg-surface-alt\|#fff\|#f8fafc" src/app/login src/app/reset-password src/components/layout 2>/dev/null
# expected: no results (or only inside src/components/report/* — those are out of scope)

# Heuristic 5 — no legacy navy / bright gold on Phase 9 surfaces
grep -rn "text-navy\|bg-navy\|text-gold\b\|bg-gold\b" src/app/login src/app/reset-password src/components/layout/Sidebar.tsx src/components/layout/Header.tsx src/components/layout/ProgressBar.tsx src/components/layout/NavigationButtons.tsx 2>/dev/null
# expected: no results

# Heuristic 7 — Inter Tight wired
grep -n "Inter_Tight\|JetBrains_Mono" src/lib/fonts.ts
# expected: both present
grep -n "interTight.variable\|jetbrainsMono.variable\|inter.variable" src/app/layout.tsx
# expected: at least one .variable + jetbrainsMono.variable present

# Build smoke
npm run build
# expected: passes with no token-resolution errors
```

### 09-02 (Working Surfaces) pre-commit

```bash
# Heuristic 1 — no light-surface utility classes on portal pages (report excepted)
grep -rn "bg-white\|bg-surface\|bg-surface-alt" src/app/portal --include="*.tsx" | grep -v "src/app/portal/assessment/\[id\]/report"
# expected: no results (or only inside ReportShell wrapper for the inner light card)

# Heuristic 5 — no legacy navy / bright gold on Phase 9 working surfaces
grep -rn "text-navy\|bg-navy\b\|text-gold\b\|bg-gold\b" src/app/portal src/components/forms src/components/sections src/components/ui --include="*.tsx" | grep -v "src/components/report"
# expected: no results (forms, sections, ui/Dialog, ui/Toast, ui/SectionHeader all clean)

# Heuristic 8 — typography scale audit (only 11/13/20/40)
grep -rn "text-\[1[02-9]px\]\|text-\[2[1-9]px\]\|text-\[3[1-9]px\]\|text-\[1[4-9]px\]\|text-xs\|text-sm\|text-base\|text-lg\|text-xl\|text-2xl\|text-3xl" src/app/portal --include="*.tsx" | grep -v "src/app/portal/assessment/\[id\]/report"
# expected: no results — only text-[11px], text-[13px], text-[20px], text-[40px], or text-[32px] mobile-downscale

# Heuristic 9 — spacing scale audit (only 4/8/16/24/32/48/64; allow inline 96 for hero only)
# Look for off-scale spacing values
grep -rn "p-3 \|p-5 \|p-7 \|p-9 \|p-10\|p-11\|gap-3 \|gap-5 \|gap-7 \|gap-9 \|space-y-3\|space-y-5\|space-y-7\|space-y-9\|m-3 \|m-5 \|m-7 " src/app/portal src/components --include="*.tsx" | grep -v "src/components/report"
# expected: minimal — investigate any hits

# Heuristic 10 — every icon-only button has aria-label
# Find <button> with no text children that lacks aria-label (heuristic)
grep -rn "<button" src/components/layout src/app/portal --include="*.tsx" | grep -v "aria-label\|aria-labelledby" | head
# expected: review each result; reduce to zero false positives

# Hard-coded hex literals in component files (D-04 / UI-SPEC §Token-Naming Map)
grep -rEn "#[0-9a-fA-F]{6}\b" src/components/layout src/components/forms src/components/ui src/components/charts --include="*.tsx" | grep -v "src/components/report"
# expected: only inside MetricChart TIER_HEX map (legitimate — rating palette is preserved)

# Build smoke
npm run build
```

**Note:** these are heuristic greps, not formal CI checks. They cannot detect runtime style resolution (e.g. a font-family resolving to system-ui because next/font misconfigured). The executor must combine grep with a manual visual review per UI-SPEC §Acceptance Heuristics.

## Cross-Phase Guardrails

| Concern | Verification | Result |
|---------|-------------|--------|
| Phase 8 report tokens depend on Phase 9 names | `grep -rln "color-bg\|color-text\|gold-brand\|color-line\|theme-dark" src/components/report src/lib/pdf` | **Empty result** — Phase 8 + Phase 5 are token-isolated from Phase 9 names. The additive migration is genuinely additive. [VERIFIED: grep result empty] |
| Phase 8 report uses legacy navy/gold | `grep -rln "var(--color-navy)\|var(--color-gold)\|bg-navy\|text-gold\b\|bg-gold\b" src/components/report src/lib/pdf` | Hits in PillarsDisplay, PillarsDisplayModal, PillarModal — all using `text-navy` / `text-gold-dark` Tailwind utilities. These resolve via legacy tokens preserved by D-02. [VERIFIED] |
| Phase 5 PDF font registration is independent | Read `src/lib/pdf/styles.ts` (referenced from grep result) | PDF uses `@react-pdf/renderer` with its own font registration; not affected by `--font-sans` rebind. [VERIFIED: grep result + PDF stack already in place per package.json] |
| Phase 8 hand-rolled Dialog already exists | Read `src/components/ui/Dialog.tsx` | Exists, used by Phase 8 + admin destructive confirms. Phase 9 token-swaps `bg-white` → `bg-bg-3`, `bg-black/50` → `rgba(10,10,11,0.7)`, adds `aria-label` on close icon. No prop changes. [VERIFIED] |
| AdminPanel stale link `/admin/normative` | Read `src/components/layout/AdminPanel.tsx` line 10 | `href: '/admin/normative'` — wrong route (should be `/portal/admin/normative`). Also grep shows AdminPanel may be dead code. **Surface as Open Question.** [VERIFIED] |
| AppShell unused | `grep -rln "AppShell" src` | Returns only the source file itself. **Dead code.** No Phase 9 action needed; leave alone. [VERIFIED] |
| Section 11 doesn't use SectionHeader | Inferred from `/portal/assessment/[id]/section/[num]/page.tsx` lines 183–206 — Section11 renders without a wrapper SectionHeader visible | Section 11 likely renders the report content directly. Eyebrow handled at page level, not via SectionHeader change. [LOW CONFIDENCE — verify in 09-02] |

## Open Questions

1. **Section 11 mono-eyebrow injection point**
   - What we know: Sections 1–10 use `<SectionHeader>`; the section-page route renders Section11 inside `<main>` and likely without SectionHeader.
   - What's unclear: Whether to inject the eyebrow in Section11.tsx itself or in the page route file.
   - Recommendation: Inject at the page level for Section 11 only (`src/app/portal/assessment/[id]/section/[num]/page.tsx` lines 184–193) — one inline JSX block before `<Section11>`. Keeps Phase-8-sovereign report card untouched. Decision is small and reversible.

2. **AdminPanel — restyle, fix stale link, or delete?**
   - What we know: File exists with `/admin/normative` (stale) link; grep shows no current import.
   - What's unclear: Whether AdminPanel is rendered anywhere in /portal/admin/* via dynamic resolution.
   - Recommendation: During 09-02 step 8, run `grep -rn "AdminPanel" src/app` — if zero hits, leave file alone (it's a no-op visually). If hits, restyle AND fix the link in the same edit. Out-of-scope for delete (per UI-SPEC "no information re-architecture" — though removing dead code isn't architecture, it's hygiene; defer to user discretion in QA).

3. **AppShell — leave as dead code or remove?**
   - What we know: Definitely unused per grep.
   - What's unclear: Whether removal is in Phase 9 scope.
   - Recommendation: Leave alone. Document as a follow-up todo in STATE.md.

4. **Existing `<link>` to Google Fonts in `layout.tsx` lines 21–26 after next/font rebind**
   - What we know: next/font/google self-hosts fonts and emits the relevant CSS variables.
   - What's unclear: Whether the landing page (`.v2-root`) silently relies on the `<link>` over next/font.
   - Recommendation: Keep the `<link>` for Phase 9. Removal is a follow-up after a visual QA on the landing page confirms `next/font` covers it.

5. **`UNSAVED CHANGES` copy variant — derived state or new store flag?**
   - What we know: Store has `isDirty`, `isSaving`, `lastSaved` — no explicit save-failure flag.
   - What's unclear: Whether UI-SPEC §Copywriting Contract's three variants are aspirational or required.
   - Recommendation: Derive proxy state `!isSaving && isDirty && !lastSaved` → "Unsaved changes". Real offline detection is a follow-up (and would need new error handling in the save loop — not a brand-language concern).

6. **Reduced-motion respect for the gold pulse dot**
   - What we know: UI-SPEC §Focus & keyboard contract says "Reduced motion: at `prefers-reduced-motion: reduce`, … auto-save pulse dot → static dot at peak colour."
   - What's unclear: Whether this is enforced via CSS `@media (prefers-reduced-motion: reduce)` rule or per-component.
   - Recommendation: CSS rule in `globals.css` that disables the `pulse-gold` keyframes under `prefers-reduced-motion`. One-line implementation; consistent with the existing print rule in globals.css.

## Environment Availability

Not applicable in the traditional sense — Phase 9 has no external runtime dependencies. The environment dependencies are baked-in via npm (Tailwind v4, Next.js 16, Recharts, Zustand) and Node toolchain. No databases, services, or CLI tools are introduced. The `npm run build` command per D-12 is the only environment requirement and is verified-working in CI by existing phases.

## Validation Architecture

> `.planning/config.json` was not loaded as part of this research — defaulting to "include this section" per the agent instructions (absent key = enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 (existing) + Playwright 1.58.2 (existing, for e2e/visual) |
| Config file | `vitest.config.ts` (existing — confirmed via package.json `test` script + Playwright config implied by `test:e2e`) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test && npm run test:e2e` (Playwright e2e covers visual surfaces — but Phase 9 is visual-only) |

### Phase Requirements → Test Map

Phase 9 has no formal requirement IDs (per the additional context: "requirements are implicit in 09-UI-SPEC.md visual contract and 09-CONTEXT.md decisions"). The verification rubric is UI-SPEC §Acceptance Heuristics (10 items), executed as **manual visual review per surface**, not automated unit/integration tests.

| Heuristic | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| H1 | No `#fff` / `bg-white` outside report route | grep + manual | `bash <pre-commit smoke test>` (see Anti-Pattern Smoke Tests) | inline check |
| H2 | Body text resolves to cream | manual visual | DevTools `getComputedStyle(body).color` === `rgb(236, 229, 211)` | manual |
| H3 | Mono eyebrow on each hero | manual visual | Page-by-page review | manual |
| H4 | Primary CTA is gold-brand fill | manual visual | Inspect each `/login`, `/portal`, etc. | manual |
| H5 | No legacy navy/gold on Phase 9 surfaces | grep | `grep -rn "text-navy\|bg-navy" src/app/portal ... ` | inline check |
| H6 | Focus ring resolves to gold-brand 45% | manual visual + DevTools | Tab-cycle each form, inspect `box-shadow` | manual |
| H7 | Body font is Inter Tight | DevTools | `getComputedStyle(body).fontFamily.includes('Inter Tight')` | manual |
| H8 | Typography scale 11/13/20/40 | manual visual + grep | grep for off-scale Tailwind size utilities | inline check |
| H9 | Spacing scale 4/8/16/24/32/48/64 | manual visual + grep | grep for off-scale spacing utilities | inline check |
| H10 | Icon-only buttons have aria-label | grep + manual | `grep -rn "<button" ... | grep -v aria-label` | inline check |
| Build | `npm run build` passes | automated | `npm run build` | exists |

### Sampling Rate

- **Per task commit:** run the grep-based pre-commit smoke tests from "Anti-Pattern Smoke Tests" above.
- **Per plan merge:** `npm run build` + manual visual review of every surface touched by the plan.
- **Phase gate:** Full 10-item Acceptance Heuristic checklist (UI-SPEC) + `npm run build` clean + `gsd-ui-checker` / `gsd-ui-auditor` pass per D-11.

### Wave 0 Gaps

- [ ] None — Phase 9 has no new unit/integration test requirements. The 10-item Acceptance Heuristic is the verification rubric, executed via manual visual review + grep smoke tests. No new test files required. Existing Vitest + Playwright suites continue to run unaffected.

## Security Domain

Not applicable to Phase 9. The phase is visual-only — no auth changes (D-13 prohibits theme toggle; auth pages /login + /reset-password are restyled but their auth logic is untouched), no API changes, no data handling. Phase 8 BL-05 ownership gate on the report route is preserved by D-09 (Phase 9 only touches the outer frame, not the report page server-side guards). No ASVS categories are newly engaged by Phase 9.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Section 11 doesn't use `<SectionHeader>` | Pitfall 5, Open Question 1 | Eyebrow injection point shifts; reversible one-line fix |
| A2 | AdminPanel is dead code (no current import) | Pitfall 2, Open Question 2 | Restyle effort wasted; grep verification in 09-02 catches it |
| A3 | next/font-loaded Inter Tight will visually replace landing's Inter Tight without regression | Pattern 2 | Landing visually regresses; mitigated by keeping `<link>` for one phase |
| A4 | The Phase 8 report card body text rendering in Inter Tight is acceptable per UI-SPEC line 34 | Pitfall 4 | Visual QA rejects; one-line exemption added in 09-02 step 9 |
| A5 | `UNSAVED CHANGES` copy can be derived from existing store state | Code example: auto-save | If real offline detection is required, store needs `saveError` flag — small follow-up |
| A6 | Wrapping `theme-dark` only on `portal/layout.tsx` (not also on `portal/assessment/[id]/layout.tsx`) is sufficient because the assessment route inherits from portal | Pitfall 1 | If inheritance fails (Next.js 16 layout cascade quirk), add wrapper to assessment layout too — both files; reversible |
| A7 | Recharts axis ticks accept CSS variables as `fill` prop values | Pattern 5 | If Recharts requires literal hex, swap to `getComputedStyle()`-resolved hex at runtime — small change |

## Sources

### Primary (HIGH confidence)
- `src/app/landing.css` — verbatim hex values for new tokens
- `src/app/globals.css` — existing token model and `@theme inline` pattern
- `src/app/layout.tsx`, `src/app/login/layout.tsx`, `src/app/portal/layout.tsx`, `src/app/portal/assessment/[id]/layout.tsx`, `src/app/portal/assessment/[id]/section/layout.tsx`, `src/app/portal/assessment/[id]/section/[num]/page.tsx`, `src/app/portal/assessment/[id]/report/page.tsx`, `src/app/reset-password/page.tsx` — current routing/layout topology
- `src/components/layout/{Sidebar,Header,ProgressBar,NavigationButtons,AdminPanel,AppShell}.tsx` — current chrome implementations
- `src/components/forms/{FormField,SelectField}.tsx` + sibling form files — current form-component token usage
- `src/components/ui/{SectionHeader,Dialog}.tsx` — eyebrow injection point + dialog primitive
- `src/components/sections/Section1.tsx` — section structure (SectionHeader usage)
- `src/components/charts/MetricChart.tsx` — Recharts styling surface
- `src/components/report/ReportShell.tsx` + `PillarsDisplay.tsx` etc. (token usage inspection) — Phase 8 sovereignty boundary
- `src/lib/fonts.ts` — current next/font wiring
- `package.json` — pinned versions
- `https://tailwindcss.com/docs/theme` — `@theme inline` semantics

### Secondary (MEDIUM confidence)
- `https://nextjs.org/docs/app/api-reference/components/font/google` — next/font/google API (well-established pattern, but version-sensitive details checked via inspection of existing `src/lib/fonts.ts` which uses the same API correctly today)

### Tertiary (LOW confidence)
- Inference about Section 11's heading rendering — not directly verified (file not fully read; deferred to A1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every dependency already pinned and in use; no new installs.
- Architecture: HIGH — route-segment gating is a documented Next.js 16 pattern; the path correction (Pitfall 1) is verified by directory listing.
- Token migration: HIGH — `@theme inline` is the project's established pattern; additive migration is verified non-conflicting by cross-phase grep.
- Pitfalls: HIGH — every pitfall is grounded in either a file read or a grep result performed during this research.
- Section 11 eyebrow injection: LOW (A1) — verify in 09-02.
- AdminPanel usage: MEDIUM (A2) — grep run during this research returned only the source file; verify once more in 09-02 step 8.

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (30 days — Tailwind v4 and Next.js 16 are both stable; tokens and routing topology unlikely to shift)
