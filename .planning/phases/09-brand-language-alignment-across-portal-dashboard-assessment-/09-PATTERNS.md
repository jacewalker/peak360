# Phase 9: Brand-language alignment — Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 1 new + ~25 modified (in place)
**Analogs found:** 1 / 1 new + N/A for restyles (in-place edits, current code is the landmark)

> **Phase nature:** This is an in-place restyle phase. Apart from one new layout file, every change is a token swap, font wiring, eyebrow injection, or copy edit on existing components. The "patterns" below are the **landing excerpts** — the exact current lines the executor needs to find and rewrite. Treat current code as the "before"; UI-SPEC §Token-Naming Map + §Copywriting Contract is the "after."

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/app/reset-password/layout.tsx` (NEW) | layout (RSC) | request-response | `src/app/login/layout.tsx` | exact |
| `src/app/globals.css` | tokens / global stylesheet | n/a | self (additive) | n/a — additive edit |
| `src/lib/fonts.ts` | font wiring | build-time | self (extend) | n/a — additive edit |
| `src/app/layout.tsx` | root layout | request-response | self | n/a — body className extension |
| `src/app/portal/layout.tsx` | route-segment layout | request-response | self | n/a — wrap children |
| `src/app/login/layout.tsx` | route-segment layout | request-response | self | n/a — wrap children |
| `src/components/ui/SectionHeader.tsx` | UI primitive | n/a | self | n/a — re-render |
| `src/components/layout/Sidebar.tsx` | client component (chrome) | n/a | self | n/a — token swap |
| `src/components/layout/Header.tsx` | client component (chrome) | n/a | self | n/a — token swap |
| `src/components/layout/ProgressBar.tsx` | client component (chrome) | n/a | self | n/a — token swap |
| `src/components/layout/NavigationButtons.tsx` | client component (chrome) | n/a | self | n/a — token swap + copy variants |
| `src/components/forms/*` (7 files) | form primitives | n/a | self | n/a — token swap |
| `src/components/ui/Dialog.tsx` | UI primitive | n/a | self | n/a — token swap |
| `src/components/ui/Toast.tsx` | UI primitive | n/a | self | n/a — token swap + mono eyebrow |
| `src/components/layout/AdminPanel.tsx` | dead code (per RESEARCH §Pitfall 2) | n/a | self | flag for leave-alone or skip |
| `src/components/charts/MetricChart.tsx` | client component (chart) | n/a | self | n/a — prop swap |
| Portal pages + admin sub-pages + Section{1..11} | pages | request-response | self | n/a — utility class swap |

---

## 1. New File: `src/app/reset-password/layout.tsx`

**Analog:** `src/app/login/layout.tsx`

**Current `login/layout.tsx` (verbatim — 5 lines):**
```tsx
export const dynamic = 'force-dynamic';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

**Executor action:**
1. Create `src/app/reset-password/layout.tsx`. Pattern-match against login but **wrap in `<div className="theme-dark">`** per D-05 / D-06.
2. Update `login/layout.tsx` in the same plan to add the `theme-dark` wrapper too.

**Target shape for BOTH after Plan 09-01:**
```tsx
export const dynamic = 'force-dynamic';

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-dark">{children}</div>;
}
```

---

## 2. Token Additions: `src/app/globals.css`

**Current `@theme inline` block (lines 3–33 — full block, the landmark):**
```css
@theme inline {
  --color-navy: #1a365d;
  --color-navy-light: #2d5986;
  --color-navy-dark: #0f2440;
  --color-gold: #F5A623;
  --color-gold-light: #f7bc5a;
  --color-gold-dark: #d4891a;
  --color-background: #f8fafc;
  --color-foreground: #1a202c;
  --color-surface: #ffffff;
  --color-surface-alt: #f1f5f9;
  --color-border: #e2e8f0;
  --color-muted: #64748b;
  --color-rating-elite: #10b981;
  /* ... rating tiers ... */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;   /* line 21 — REBIND TARGET */

  /* Landing page fonts */
  --font-heading: var(--font-heading);
  --font-body: var(--font-body);

  /* Extended brand palette for landing page */
  --color-navy-950: #0a1628;
  /* ... gradient tokens ... */
}
```

**Current `body` rule (lines 35–39 — the landmark for de-gating):**
```css
body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}
```

**Current input focus ring (lines 42–46 — replaced by gold-brand @ 45%):**
```css
input:focus, select:focus, textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.25);
  border-color: var(--color-gold);
}
```

**Executor action:** ADD new tokens at the end of `@theme inline` (do NOT modify existing ones except `--font-sans`); REBIND `--font-sans` value; REMOVE the `body { background: ... }` line (theme is now segment-gated); ADD `.theme-dark` utility class + `@keyframes pulse-gold` outside the `@theme` block. Per RESEARCH §Code Examples lines 195–243 and UI-SPEC §Token-Naming Map.

---

## 3. Font Wiring: `src/lib/fonts.ts` + `src/app/layout.tsx`

**Current `src/lib/fonts.ts` (verbatim — full file, 22 lines):**
```ts
import { Montserrat, Open_Sans, Inter } from 'next/font/google';

export const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-heading', display: 'swap', weight: ['400', '500', '600', '700', '800'] });
export const openSans = Open_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap', weight: ['400', '500', '600', '700'] });
export const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
```

**Executor action (per RESEARCH §Pattern 2 + §Pitfall 8):**
- Replace `Inter` import with `Inter_Tight`, change `inter = Inter(...)` body to `Inter_Tight({ ..., weight: ['300','400','500','600'] })`. **Keep the export name `inter`** to avoid cascade rename through layout.tsx.
- Add a NEW `JetBrains_Mono` import + export with `variable: '--font-mono'`, weights `['400','500']`.
- Keep `montserrat` + `openSans` (landing page consumes them).

**Current `src/app/layout.tsx` body line (line 28 — the landmark):**
```tsx
<body className={`${inter.variable} antialiased min-h-screen bg-background font-sans`}>
```

**Executor action:** Add `${jetbrainsMono.variable}` to className; REMOVE `bg-background` (theme is segment-gated). New shape:
```tsx
<body className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen font-sans`}>
```

**Keep the Google Fonts `<link>` (lines 21–26)** per RESEARCH §Pattern 2 belt-and-braces.

---

## 4. Theme-Dark Wrappers (Segment Layouts)

### `src/app/portal/layout.tsx`

**Current return (lines 19–24 — the landmark):**
```tsx
return (
  <>
    <Sidebar />
    <div className="lg:pl-56">{children}</div>
  </>
);
```

**Executor action:** Replace `<>...</>` fragment with `<div className="theme-dark">`. Sidebar + main remain inside. Per RESEARCH §Code Examples lines 492–509. **Note (RESEARCH §Pitfall 1 + §Cross-Phase Guardrails):** wrapping at `portal/layout.tsx` is sufficient — `src/app/portal/assessment/[id]/layout.tsx` inherits automatically and does NOT need its own wrapper. CONTEXT.md D-05's reference to `src/app/assessment/[id]/layout.tsx` is a path error (that file does not exist).

### `src/app/login/layout.tsx`

See §1 above. Current: `return children;`. Target: `return <div className="theme-dark">{children}</div>;`

### `src/app/reset-password/layout.tsx` (NEW)

See §1 above.

---

## 5. SectionHeader Mono-Eyebrow Injection: `src/components/ui/SectionHeader.tsx`

**Current full file (verbatim — 22 lines, the landmark):**
```tsx
'use client';

interface SectionHeaderProps {
  number: number;
  title: string;
  description?: string;
}

export default function SectionHeader({ number, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center gap-3 mb-1.5">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-navy-light text-white flex items-center justify-center text-sm font-bold shadow-sm">
          {number}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-navy">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted ml-11">{description}</p>}
    </div>
  );
}
```

**Eyebrow goes ABOVE the existing flex row.** Per RESEARCH §Pattern 4 (target shape lines 351–365). Replace the navy-gradient number bubble with mono eyebrow; swap `text-navy` heading → `text-text` with Heading-role typography (20px, 500, `-0.015em`); swap `text-muted` description → `text-text-dim` at Label size 13px. Per UI-SPEC §Copywriting line "SECTION {N} / 11 · {SECTION_LABEL}".

**Section 11 caveat (RESEARCH §Open Question 1):** Section11 likely does NOT render `<SectionHeader>` (it's the report). Inject the eyebrow inline at `src/app/portal/assessment/[id]/section/[num]/page.tsx` only when `num === 11`, outside the Phase-8-sovereign report card. Verify during 09-02.

---

## 6. Form Components — Token Swap Map

For every file below, the landmark is the current `className` string. Map per RESEARCH §Pitfall 5:

| Legacy class | New class / value |
|--------------|-------------------|
| `text-navy` (labels, headings) | `text-text` |
| `text-red-500` (required asterisk, error) | `text-danger` |
| `bg-white` | `bg-bg-3` |
| `border-border` | `border-line` |
| `focus:ring-gold/50` + `focus:border-gold` | `focus:border-gold-brand` + focus box-shadow `0 0 0 2px rgba(201,162,74,0.45)` |
| `disabled:bg-surface-alt` | `disabled:bg-bg-2` |
| `disabled:text-muted` | `disabled:text-text-faint` |
| `bg-surface-alt` (slider track) | `bg-bg-2` or `bg-line` |
| `accent-gold` | `accent-gold-brand` |
| `text-gold` (slider readout) | `text-gold-brand` |
| `text-muted` (helper, min/max) | `text-text-dim` |

### `src/components/forms/FormField.tsx` (lines 33–50 — full landmark)
```tsx
<div className={`space-y-1.5 ${className}`}>
  <label htmlFor={id} className="block text-sm font-medium text-navy">
    {label}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
  <input
    /* ... */
    className="w-full px-3 py-2.5 sm:py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors disabled:bg-surface-alt disabled:text-muted"
  />
</div>
```
**Target shape:** RESEARCH §Code Examples "Restyled FormField" lines 515–542. Input height to 48px (`h-12`). Text size `text-[13px]`.

### `src/components/forms/SelectField.tsx` (lines 22–43 — same landmark shape)
Has the extra `bg-white` on the `<select>` element (line 33). Swap → `bg-bg-3`.

### `src/components/forms/TextareaField.tsx` (lines 24–39 — same shape)
Adds `resize-vertical`. Same token swap as FormField.

### `src/components/forms/RadioGroup.tsx` (lines 22–47)
Landmark: `<input type="radio" className="w-5 h-5 sm:w-4 sm:h-4 text-gold focus:ring-gold border-border" />` (line 40). Swap `text-gold` → `text-gold-brand`, `focus:ring-gold` → `focus:ring-gold-brand`, `border-border` → `border-line`. Label `text-navy` → `text-text`.

### `src/components/forms/SliderField.tsx` (lines 24–46)
Landmarks:
- `<span className="text-lg font-bold text-gold">{value}</span>` (line 30) — swap text-gold → text-gold-brand. Per UI-SPEC the readout should be Display-40 mono for the assessment progress; for an inline slider value, Label 13px mono is acceptable.
- `<input type="range" className="w-full h-2 bg-surface-alt rounded-lg appearance-none cursor-pointer accent-gold" />` (line 40) — swap `bg-surface-alt` → `bg-bg-2`, `accent-gold` → `accent-gold-brand`.
- Thumb styling: `globals.css` lines 49–69 hard-code `background: var(--color-gold)` and `border: 2px solid white`. Phase 9 swap to `var(--color-gold-brand)` + `border: 2px solid var(--color-bg-3)`.

### `src/components/forms/SignaturePad.tsx` (lines 119–153)
Landmarks:
- Canvas border container: `border border-border rounded-lg overflow-hidden bg-white` (line 122). Swap → `border-line bg-bg-3`.
- Canvas stroke colour (line 85): `ctx.strokeStyle = '#1a365d'` — hex literal, swap to `'var(--color-text)'` via `getComputedStyle` resolution (or use cream `#ece5d3` directly with comment "from --color-text"). Same for autoSign (line 113): `ctx.fillStyle = '#1a365d'`.
- Clear / auto-sign buttons (lines 137, 145): `text-muted hover:text-red-600 border border-border` → `text-text-dim hover:text-danger border-line`; `text-navy hover:text-gold` → `text-text hover:text-gold-brand`.
- Label `text-navy` → `text-text`.

### `src/components/forms/FileUploadZone.tsx`
Heaviest restyle. Multiple legacy tokens across the ProcessingStepper internals (lines 64, 73, 82, 96, 112, 121, 127, 173, 233, 253, 269, 273).

Key landmarks:
- Label `text-navy` (line 234) → `text-text`.
- Active stepper bubble: `bg-gold text-white shadow-[0_0_0_4px_rgba(245,166,35,0.15)]` (line 65) → `bg-gold-brand text-bg shadow-[0_0_0_4px_rgba(201,162,74,0.15)]`.
- Idle drop zone `border-border hover:border-gold/50 hover:bg-surface-alt` (lines 252–253) → `border-line hover:border-gold-brand/50 hover:bg-bg-2`.
- AI badges `bg-gold text-white` (lines 127, 140) → `bg-gold-brand text-bg`.
- Browse link `text-gold` (line 273) → `text-gold-brand`. Help text `text-foreground`/`text-muted` → `text-text`/`text-text-dim`.
- Status palette swaps (emerald/amber/red icon backgrounds): leave as-is OR swap to `--color-status-good` / `--color-danger` per UI-SPEC §Color. Status colours are status-only (D-16).

### `src/components/forms/FormRow.tsx` + `ExtractedValuesPanel.tsx`
Audit during 09-02 step 1. Same swap table.

---

## 7. Layout Chrome Restyle

### `src/components/layout/Sidebar.tsx`

Heaviest single-file restyle. Hard-coded `bg-navy-dark` (line 225), `text-gold` / `bg-gold/15` for active state (lines 142, 147, 150), `text-white/*` cream-alpha tier (lines 120, 123, 143, 159, 174, 199, 216, 241), `border-white/10` (lines 159, 169), `bg-navy` (mobile hamburger line 216), `bg-black/50` (overlay line 232).

Landmark — active nav item (lines 138–152):
```tsx
className={`
  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
  ${
    active
      ? 'bg-gold/15 text-gold shadow-[inset_0_0_0_1px_rgba(245,166,35,0.15)]'
      : 'text-white/50 hover:text-white/90 hover:bg-white/5'
  }
`}
```

**Target swaps (per UI-SPEC §Component Inventory row "Sidebar"):**
- `bg-navy-dark` (line 225, 236) → `bg-bg-2` + 1px right border `border-r border-line`.
- Active state: `bg-gold/15 text-gold shadow-[inset_...]` → 2px left border gold-brand + cream label (`border-l-2 border-gold-brand text-text font-medium`). No fill tint.
- Inactive: `text-white/50` → `text-text-dim`; hover `text-white/90 hover:bg-white/5` → `hover:text-text hover:bg-line`.
- Logo block (lines 110–128): `text-white` heading + `text-gold` 360 → `text-text` + `text-gold-brand`. ADD a mono eyebrow above: **PEAK360 / PORTAL** (11px mono, gold-brand, uppercase 0.18em) per UI-SPEC §Copywriting.
- Mobile hamburger (lines 213–222): `bg-navy text-white/70` → `bg-bg-2 text-text-dim`. `aria-label="Open menu"` → `aria-label="Open navigation"` per UI-SPEC.
- Mobile overlay scrim `bg-black/50` (line 232) → `bg-bg/70` or `rgba(10,10,11,0.7)`.
- ADD user/role chip block at bottom (mono 11px gold-brand uppercase). Per UI-SPEC: `{role}` ∈ `{COACH, ADMIN, CLIENT}`.

### `src/components/layout/Header.tsx`

Landmark — full header (lines 7–38):
```tsx
<header className="text-white shadow-lg" style={{ backgroundColor: '#0f2440' }}>
  <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
    <Link href="/portal" className="flex items-center gap-3 group">
      ...
      <h1 className="text-xl font-bold tracking-tight">PEAK<span className="text-gold">360</span></h1>
      <p className="text-[11px] text-white/60 tracking-widest uppercase">Longevity Assessment</p>
    ...
```

**Target swaps:**
- `style={{ backgroundColor: '#0f2440' }}` → `bg-bg-2` Tailwind class (remove inline style).
- `text-white` → `text-text`.
- `text-gold` (the "360") → `text-gold-brand`.
- `text-white/60` → `text-text-dim`.
- Logout button (lines 23–34) `text-white/60 hover:text-white hover:bg-white/10` → `text-text-dim hover:text-text hover:bg-line`.
- Add 1px bottom border `border-b border-line`; height 56px (`h-14`).
- UI-SPEC §Component Inventory row "Header": replace the right-side logo block with `mono eyebrow "CLIENT · {name}" 11px + sans Label 13px section indicator`. RESEARCH §Pitfall 9: surface conflict check on the report route (two eyebrows stacked).

### `src/components/layout/ProgressBar.tsx`

Landmark — full file (lines 17–72):
- Container: `bg-white border-b border-border ... shadow-sm` (line 18) → `bg-bg-2 border-b border-line` (no shadow).
- Section label: `text-navy` (line 21) → mono eyebrow 11px gold-brand uppercase or Label 13px cream.
- Section title: `text-muted` (line 24) → `text-text-dim`.
- Track: `bg-surface-alt rounded-full h-1.5` (line 28) → `bg-line h-1` per UI-SPEC "4px track height".
- Fill: `bg-gradient-to-r from-gold-dark to-gold` (line 30) → `bg-gold-brand` (solid).
- Step dots (lines 47–52): `bg-gold text-navy shadow-[0_0_0_3px_rgba(245,166,35,0.2)]` / `bg-navy text-white` / `border-gray-300 text-muted` → all swap to gold-brand / bg-3 / line tokens.

### `src/components/layout/NavigationButtons.tsx`

Landmark — auto-save indicator (lines 30–44, repeated 67–79):
```tsx
{isSaving ? (
  <>
    <span className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    <span className="text-gold font-medium">Saving...</span>
  </>
) : lastSaved ? (
  <>
    <span className="w-1.5 h-1.5 rounded-full bg-rating-elite" />
    <span>Saved at {lastSaved}</span>
  </>
) : null}
```

**Per RESEARCH §Pitfall 6 + §Code Examples lines 546–564:**
- Replace spinner with mono `SAVING…` (11px / 500 / uppercase / `tracking-[0.18em]` / gold-brand pulse dot, animation `pulse-gold 2s ease-out infinite`).
- Replace `bg-rating-elite` (green) → `bg-gold-brand` per UI-SPEC, OR `bg-status-good` (sage) — UI-SPEC §Copywriting says "gold pulse dot", D-16 reserves sage for status. **Recommendation:** gold-brand dot for "Saved · {time}" since UI-SPEC explicitly says gold-pulse.
- Add third variant: `!isSaving && isDirty && !lastSaved` → `<span className="font-mono text-[11px] tracking-[0.18em] uppercase text-danger">Unsaved Changes</span>` (derived proxy state per RESEARCH §Assumption A5).

Landmark — Prev/Next buttons (lines 49–55, 91–100):
```tsx
className="px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg font-medium ... bg-surface-alt text-navy hover:bg-border ..."
/* Next */ className={`... ${isLastSection ? 'bg-gold text-navy hover:bg-gold-light' : 'bg-navy text-white hover:bg-navy-light'}`}
```

**Target (per UI-SPEC §Copywriting CTAs):**
- Prev: ghost variant — `bg-transparent border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand`. Label: "Back to section {n-1}" (section ≥ 2) or "Back to dashboard" (section 1).
- Next: gold-brand fill — `bg-gold-brand text-bg hover:bg-champagne`. Label: "Save & continue".
- Complete: same gold-brand fill.

### `src/components/layout/AdminPanel.tsx`

**Per RESEARCH §Pitfall 2 + Open Question 2:** AdminPanel is dead code (grep returned only the source file itself; no imports). Plus stale link `/admin/normative` should be `/portal/admin/normative` (line 10). **Recommendation:** leave file untouched in Phase 9 (no surface renders it). Flag in STATE.md follow-up todos. If executor decides to restyle for completeness, swap `bg-navy` (line 55), `border-white/10`, `text-white/*`, `text-gold` to dark tokens — but this is wasted work per current usage.

Landmark — panel block (lines 55–58):
```tsx
<div className="absolute bottom-16 left-3 z-50 w-72 rounded-xl bg-navy shadow-2xl border border-white/10 p-4">
  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-3">
```

### `src/components/layout/AppShell.tsx`

**Per RESEARCH §Pitfall 3:** Dead code (grep returns only source file). Do NOT restyle. Leave alone.

---

## 8. Dialog & Toast Restyle

### `src/components/ui/Dialog.tsx`

Landmarks (lines 137–152):
```tsx
const panelClass =
  mode === 'centered'
    ? 'max-w-[640px] w-full mx-4 rounded-2xl bg-white p-6 md:p-8 max-h-[90vh] overflow-y-auto'
    /* ... */;

/* ... */
className={`fixed inset-0 z-50 bg-black/50 motion-safe:transition-opacity ${overlayLayoutClass}`}

/* Drag handle */
className="md:hidden mx-auto mb-3 h-1 w-9 rounded-full bg-gray-300"
```

**Swaps (UI-SPEC §Component Inventory row "Dialog"):**
- `bg-white` → `bg-bg-3` (3 occurrences in `panelClass`).
- `bg-black/50` (scrim) → `bg-[rgba(10,10,11,0.7)]`.
- `bg-gray-300` (drag handle) → `bg-line-2`.
- ADD `border border-line-2` on the panel.
- Close icon (if any in consumers — Dialog does NOT render its own close button): consumers must include `aria-label="Close"` per UI-SPEC.

### `src/components/ui/Toast.tsx`

Landmark — full render (lines 22–39):
```tsx
const borderColor = variant === 'success' ? 'border-l-4 border-gold' : 'border-l-4 border-red-500';
/* ... */
<div role={role} className={`fixed bottom-6 right-6 z-50 bg-white px-4 py-3 rounded-lg shadow-lg ${borderColor} text-sm text-navy max-w-sm`}>
  {message}
</div>
```

**Swaps (UI-SPEC §Component Inventory row "Toast"):**
- `bg-white` → `bg-bg-3`.
- `border-gold` → `border-gold-brand`; `border-red-500` → `border-danger`.
- `text-navy` → `text-text`.
- Position: top-right per UI-SPEC ("Toasts: top-right, 24px inset"). Swap `bottom-6 right-6` → `top-6 right-6`.
- ADD mono eyebrow above message: `SAVED` / `ERROR` / `INFO` (11px mono uppercase, gold-brand for success, danger for error).
- ADD `aria-label="Dismiss notification"` if a dismiss button is introduced.

---

## 9. Recharts Restyle: `src/components/charts/MetricChart.tsx`

Landmarks (the four prop-swap points):

**Default series stroke fallback (line 64):**
```tsx
const lineColor = latest.tier ? TIER_HEX[latest.tier] : '#F5A623';
```
**Swap:** `'#F5A623'` → `'var(--color-gold-brand)'` (two occurrences — also line 160 in `dot` renderer fallback). Per RESEARCH §Anti-Patterns "Hard-coding hex literals."

**XAxis / YAxis tick fill (lines 117, 127):**
```tsx
<XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} ... />
<YAxis tick={{ fontSize: 9, fill: '#cbd5e1' }} ... />
```
**Swap:** Both → `tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-faint)' }}`. Note `fontSize: 11` (UI-SPEC Eyebrow size) and add mono fontFamily.

**Tooltip panel (lines 134–149):**
```tsx
<div className="bg-navy-dark text-white text-xs rounded-lg px-3.5 py-2.5 shadow-xl border border-white/10">
  <p className="font-bold text-sm">{p.value} <span className="font-normal text-white/50">{unit}</span></p>
  <p className="text-white/40 mt-0.5">{p.date}</p>
  /* tier divider: border-white/10 */
```
**Swap:** `bg-navy-dark text-white` → `bg-bg-3 text-text`; `border-white/10` → `border-line-2`; `text-white/50` → `text-text-dim`; `text-white/40` → `text-text-faint`.

**Card chrome (lines 67–103):**
- `bg-white rounded-xl border border-border` → `bg-bg-3 rounded-xl border border-line`.
- Tier accent border-t: keep (TIER_HEX preserved per UI-SPEC §Color "Rating tier palette preserved verbatim").
- Fallback `border-t-gold` (line 62) → `border-t-gold-brand`.
- Text values: `text-navy` → `text-text`; `text-muted` → `text-text-dim`; `text-muted/70` → `text-text-faint`; `text-muted/40` → `text-text-faint` (further compress).
- Delta pills `bg-emerald-50/red-50/gray-50 text-emerald-700/red-600/gray-500` — keep palette per UI-SPEC §Color (status pills); but on dark canvas, swap pill backgrounds to alpha equivalents (`bg-emerald-500/10`, etc.). Conservative path: leave as-is in 09-02 step 6 if visually acceptable; flag during review.

**TIER_HEX / TIER_PILL / TIER_ACCENT / TIER_GLOW maps (lines 8–38):** **UNTOUCHED** per UI-SPEC §Color "Rating tier palette preserved verbatim." Tier colours stay across the report and chart.

---

## Shared Patterns (apply across multiple files)

### Focus Ring
**Source:** `globals.css` lines 42–46 (current) → replaced.
**Apply to:** All inputs, selects, textareas.
**Pattern:**
```css
input:focus, select:focus, textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(201, 162, 74, 0.45);
  border-color: var(--color-gold-brand);
}
```

### Mono Eyebrow Primitive
**Per CONTEXT D-claude-1 (Claude's discretion):** if used in >3 places, lift into `src/components/ui/MonoEyebrow.tsx`. Uses: SectionHeader, Header (CLIENT chip), Sidebar (PEAK360/PORTAL + role), every page hero (dashboard, clients, assessments, login, reset-password, every admin/*), Toast eyebrow, auto-save indicator. **>3 — recommend lifting.**

**Reference snippet (RESEARCH §Pattern 4 line 355):**
```tsx
<span className="font-mono text-[11px] tracking-[0.18em] uppercase text-gold-brand">
  Section {number} / 11 · {title.toUpperCase()}
</span>
```
Variant for meta (sidebar role, table column headers): `tracking-[0.16em] text-text-faint`.

### Pulse-Gold Keyframes
**Source:** Landing's `@keyframes v2pulse` (landing.css lines 233–236, do not import — copy).
**Add to** `globals.css` (RESEARCH §Code Examples lines 484–488):
```css
@keyframes pulse-gold {
  0% { box-shadow: 0 0 0 0 rgba(201, 162, 74, 0.6); }
  100% { box-shadow: 0 0 0 12px rgba(201, 162, 74, 0); }
}
@media (prefers-reduced-motion: reduce) {
  /* disable pulse */
}
```
**Apply to:** NavigationButtons saving dot, optional Toast saving variant.

---

## Portal Pages, Admin Pages, Section{1..11} (Hero Eyebrow + Token Sweep)

Per CONTEXT D-08, restyle in this order. Each page has a hero section + body. Apply the swap table from §6, plus:

1. **Add page hero**: 96px top padding (`pt-24`, inline dimension per CONTEXT D-17), mono eyebrow per UI-SPEC §Copywriting Contract, Display 40px title (`text-[40px] font-medium text-text leading-none tracking-[-0.03em]`, mobile downscales to 32 via `sm:` or media query).
2. **Body cards**: `bg-white` → `bg-bg-3`; `border-border` → `border-line`.
3. **Counter numerics**: 40px mono tabular-nums on `text-gold-brand` (dashboard "12 active", admin row counts).
4. **Tables**: column headers Label 13px mono uppercase `text-text-faint`; row dividers `border-line`; hover `hover:bg-bg-3`.
5. **Section{1..11} headings**: handled centrally via SectionHeader (§5). No per-section file edit except Section 11.

**Phase 8 report-frame edge (D-09):** The report page at `src/app/portal/assessment/[id]/report/page.tsx` already has `<main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">`. Per RESEARCH line 329, wrap `<ReportShell>` content in an inner `<div className="bg-white rounded-2xl p-8 my-6">` so the report card stays light cream/white inside the dark portal shell. **Do NOT modify** `src/components/report/*` or `src/lib/pdf/**`.

---

## No Analog Found

None. Every Phase 9 change is either an in-place restyle of existing code (the file itself is the landmark) or — for the one new file — has a direct sibling analog (`login/layout.tsx`).

---

## Metadata

**Analog search scope:**
- `src/app/login/`, `src/app/reset-password/`, `src/app/portal/`, `src/app/layout.tsx`
- `src/app/globals.css`, `src/lib/fonts.ts`
- `src/components/layout/` (Sidebar, Header, ProgressBar, NavigationButtons, AdminPanel, AppShell)
- `src/components/forms/` (FormField, SelectField, TextareaField, RadioGroup, SliderField, SignaturePad, FileUploadZone, FormRow, ExtractedValuesPanel)
- `src/components/ui/` (SectionHeader, Dialog, Toast)
- `src/components/charts/MetricChart.tsx`

**Files scanned:** ~20
**Pattern extraction date:** 2026-05-12

**Key cross-cutting findings:**
- `AdminPanel` and `AppShell` are dead code (grep verified). Recommend leaving alone.
- Hex literals appearing in component code today: `#1a365d` (SignaturePad lines 85, 113), `#F5A623` (MetricChart lines 64, 160), `#0f2440` (Header line 8 inline style), `#94a3b8` + `#cbd5e1` (MetricChart axis ticks). All need swapping per D-04 / UI-SPEC §Token-Naming Map (no hex in component files).
- `globals.css` thumb-styling rules (lines 49–69) reference `var(--color-gold)` directly — this is a CSS-level token reference (not a component file), but per D-14 should swap to `var(--color-gold-brand)` for dark-canvas slider thumbs.
- `reset-password/` directory exists but contains only `page.tsx` — `layout.tsx` is genuinely NEW.
- `src/app/portal/assessment/[id]/layout.tsx` is the correct path for the assessment-form layout (CONTEXT.md path "src/app/assessment/[id]/layout.tsx" is incorrect — see RESEARCH §Pitfall 1). Portal-level wrapper alone is sufficient — no need to also wrap the assessment layout.
