---
phase: 10-section-11-pdf-brand-language-alignment
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/app/globals.css
  - src/components/sections/Section11.tsx
  - src/lib/pdf/colors.ts
  - src/lib/pdf/components/MarkerTable.tsx
  - src/lib/pdf/components/MarkerRow.tsx
  - src/lib/pdf/components/ConsentStatus.tsx
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-17
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 10 is a brand/CSS retokenization phase across two waves: Plan 10-01 retokenizes `Section11.tsx` to render as a light cream/navy/gold-brand card on the dark portal frame and adds six print-safe alias tokens to `globals.css`; Plan 10-02 shifts the PDF `COLORS.gold`/`goldDark` token values to the Phase 9 brand palette and routes three stray hex literals in MarkerTable/MarkerRow/ConsentStatus through existing tokens.

The substantive banned-literal sweep is correct — `grep -E "#1a365d|#F5A623|text-white|bg-white"` against `Section11.tsx` returns 0 matches, and the same grep against `src/lib/pdf/` returns only the single legitimate `navy: '#1a365d'` token definition in `colors.ts`. Phase 8 sovereign palettes (TIER_DOT/ROW_BG/ROW_BORDER/TEXT, TierPill bg map, TIER_*_PDF maps, status hexes) are preserved verbatim across all touched files.

However, the sweep heuristic is **not airtight**: a navy literal still slips through `src/lib/pdf/components/MarkerTable.tsx:42` in **rgba form** (`rgba(26, 54, 93, 0.7)` = `#1a365d` at 70% alpha) — the hex-only grep doesn't catch it, and per Plan 10-02's stated truth ("Zero hex literals matching #1a365d|#F5A623 remain anywhere in src/lib/pdf/ … routed through token"), the spirit of the rule fails even if the letter passes. There are also two print/layout concerns: the `@media print .bg-white { box-shadow: none }` rule in `globals.css:259` no longer matches Section 11 (now `bg-paper`), so browser-print box shadows will print; and the action button row (`Section11.tsx:585`) sits inside the light card but outside the `px-6 sm:px-8` body padding wrapper, making the buttons flush to the card edge with no horizontal gutter. Plus minor non-standard `border-3` utility carried over from the loading spinner.

## Warnings

### WR-01: rgba form of banned navy literal bypasses sweep heuristic

**File:** `src/lib/pdf/components/MarkerTable.tsx:42`
**Issue:** The category-header text color uses `color: 'rgba(26, 54, 93, 0.7)'`. `rgb(26, 54, 93)` is `#1a365d` — the Phase 9 navy ink the plan claims to have routed through `COLORS.navy`. The plan's `<must_haves.truths>` for 10-02 explicitly states *"the navy hex literal #1a365d is eliminated from the entire src/lib/pdf/ tree by routing through COLORS.navy = '#1a365d' centrally"*, but this rgba spelling sidesteps the literal-hex grep used as verification. If someone later edits `COLORS.navy` to a new brand value, the PDF category-header label stays on the old hex and silently drifts out of sync with the rest of the PDF surface. This is exactly the brand-drift bug the centralized token file is designed to prevent.

This appears to have existed before Phase 10 (it is in the pre-image of this phase), but Phase 10 explicitly opened the door to PDF brand-language alignment and asserted total navy-literal elimination — this one was missed.

**Fix:**
```tsx
// MarkerTable.tsx:42 — route through the token instead of inlining rgba(navy, 0.7)
color: COLORS.navy,
// or, if the alpha is load-bearing for the category-header label de-emphasis,
// keep a dimmed variant alongside the brand swap:
color: COLORS.textSecondary,   // already in palette, similar visual weight
```

Preferred: `COLORS.textSecondary` (`#64748b`) which is the dimmed-label token the rest of the table already uses (e.g. line 65 `color: COLORS.textSecondary` on the subcategory label). That keeps the cohesion with the rest of the table and removes the rgba-navy outlier.

### WR-02: Section 11 print box-shadow rule no longer matches the new card

**File:** `src/app/globals.css:259-261`
**Issue:** The legacy print rule strips box shadows via `.bg-white { box-shadow: none !important; }`. After Plan 10-01, Section 11's outer container is `bg-paper rounded-2xl shadow-sm` and every inner card now uses `bg-paper` (not `bg-white`). When a user invokes browser-print on Section 11 (Ctrl/Cmd+P — separate path from "Export PDF" which uses @react-pdf/renderer), the `shadow-sm` on the outer card and `hover:shadow-lg` artifacts will render in the printed output, plus any other `report-tier-card` / `report-insight-card` shadows will not be stripped. The token swap silently disabled an existing print-cleanup behavior.

**Fix:** Extend the selector to cover the new alias:
```css
/* globals.css:259 */
.bg-white, .bg-paper {
  box-shadow: none !important;
}
```
Or, more durably, target the report container directly:
```css
.report-container *, .report-tier-card, .report-insight-card {
  box-shadow: none !important;
}
```

### WR-03: Action-button row sits outside body padding inside the light card

**File:** `src/components/sections/Section11.tsx:582-621`
**Issue:** The body wrapper `<div className="px-6 sm:px-8 pb-8">` closes on line 582 ("end px-6 report body wrapper" comment). The action-button row on line 585 sits inside the outer `bg-paper rounded-2xl shadow-sm` card but **outside** the px-6/px-8 body padding wrapper, with only `pt-8 pb-4` vertical padding (no horizontal). On viewports where the flex row stays `flex-col` (mobile, `< sm` breakpoint), the two `w-full`-ish buttons will sit flush to the card's rounded-2xl edge with no gutter, breaking the card's visual breathing room. On `sm:flex-row`, the `justify-center` centers them so the visual issue is less obvious — but a viewport-resize will surface it.

The buttons themselves have `px-8` internal padding so they don't *touch* the card edge in normal sizing, but the lack of an explicit horizontal padding container is a layout fragility — any future button expansion (e.g. a full-width primary button on mobile) will render edge-to-edge.

**Fix:** Move the buttons inside the body wrapper, or add explicit horizontal padding to the button row:
```tsx
{/* Section11.tsx:585 — wrap buttons with horizontal padding */}
<div className="flex flex-col sm:flex-row gap-3 justify-center px-6 sm:px-8 pt-8 pb-4">
```
Alternatively, close the outer card before the buttons and render them on the dark portal frame outside the card. Either way, the implicit assumption that "px-8 on the button itself" provides a card gutter should be made explicit at the row level.

## Info

### IN-01: Non-standard `border-3` utility on loading spinner

**File:** `src/components/sections/Section11.tsx:240`
**Issue:** The loading-state spinner uses `className="w-10 h-10 border-3 border-gold-brand border-t-transparent ..."`. Tailwind v4 does not ship a `border-3` utility out of the box (defaults are `border`, `border-2`, `border-4`, `border-8`). If Tailwind's JIT does not match `border-3`, the spinner renders with no visible border thickness. This is pre-existing per the plan ("KEEP AS IS") and not introduced by Phase 10, but it sits inside the reviewed file and is worth surfacing during this phase rather than continuing to inherit it.

**Fix:** Either define a `border-3` utility in the Tailwind config (Tailwind v4 supports `--border-width-3: 3px` in `@theme`), or swap to a supported width:
```tsx
// Section11.tsx:240 — use a defined width
<div className="w-10 h-10 border-2 border-gold-brand border-t-transparent rounded-full animate-spin mx-auto" />
```

### IN-02: `<img>` tags inside React/Next.js component (use `next/image`)

**File:** `src/components/sections/Section11.tsx:298, 571`
**Issue:** The header logo (`/logo.png`) and footer logo (`/logo.png` again) are rendered as raw `<img>` tags. Next.js best practice is to use `next/image` for static-bundled images so they get lazy-loaded, served as AVIF/WebP, and dimension-locked to prevent layout shift. The PDF surface obviously can't use `next/image`, but Section 11 is the in-app React component — it's a Next.js client component (`'use client'` directive on line 1). This is also pre-existing (Plan 10-01 didn't introduce the `<img>` — it kept the existing logo node and just reset its placement), but worth flagging.

**Fix:**
```tsx
import Image from 'next/image';
// header
<Image src="/logo.png" alt="Peak360" width={120} height={48} className="h-10 sm:h-12 w-auto object-contain" />
// footer
<Image src="/logo.png" alt="Peak360" width={60} height={20} className="h-5 w-auto object-contain opacity-40" />
```
Defer if the Next.js linter is configured to ignore `<img>` warnings (check `eslint.config.mjs`); otherwise this should produce a build warning today.

### IN-03: PDF token comments inadvertently invert meaning of `goldDark`

**File:** `src/lib/pdf/colors.ts:8`
**Issue:** The field is named `goldDark` but its new value `#e8d6a8` (champagne) is **lighter** than `gold = #c9a24a`. The Phase 9 brand semantic of champagne is "lighter accent tint" — not "darker shade of gold". The field name now misrepresents the value (`goldDark` implies a darker companion; `champagne` is a lighter companion). Any future maintainer reading `goldDark` will assume "deeper gold" and may use it expecting a darker accent — e.g. for hover states — and get a lighter color than expected. The inline comment "Phase 9 champagne" partially mitigates but the field name carries forward incorrectly.

This is intentional-but-misleading per the plan (the rename would require ~83 downstream consumer edits, which is exactly what the value-only swap was designed to avoid). Acceptable trade-off for this phase, but should be tracked as token-naming debt.

**Fix:** None for this phase. Add to follow-up: rename the field to `goldAccent` or `champagne` in a future cleanup pass, or document the rename as a deferred refactor in the next phase's CONTEXT.md.

---

_Reviewed: 2026-05-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
