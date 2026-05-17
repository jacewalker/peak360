---
status: partial
phase: 10-section-11-pdf-brand-language-alignment
source: [10-VERIFICATION.md]
started: 2026-05-17T00:33:00Z
updated: 2026-05-17T09:05:00Z
verified_by: claude-playwright
---

## Current Test

[complete — 2 passed, 2 failed; failures match WR-02/WR-03 from 10-REVIEW.md]

## Tests

### 1. Section 11 renders as a light card on the dark portal frame
expected: At `/portal/assessment/{id}/section/11`, the page shows the dark portal chrome (sidebar/header/MonoEyebrow "SECTION 11 / 11 · LONGEVITY ANALYSIS") and Section 11 itself appears as a single cream/white rounded card with a subtle shadow. Inside the card: logo on the LEFT, "Complete Longevity Analysis" title in navy ink on the RIGHT, gold-brand divider, then 4-column client meta strip in dim ink labels + ink values. Pillars, tier cards, marker rows, and insights all render normally below.
result: PASS — verified via Playwright on `/portal/assessment/a593dabc-559d-44a4-9eff-e93f981e131b/section/11`. DOM: outer wrapper `<div class="bg-paper rounded-2xl shadow-sm">` with computed `background: rgb(255,255,255)` sitting inside `theme-dark` portal ancestor. Header: `<img src="/logo.png">` (left) + `<h1 class="text-right">Complete Longevity Analysis</h1>` (right) separated by `flex justify-between`, then `<div class="h-1 w-16 bg-gold-brand">` divider, then `grid-cols-2 sm:grid-cols-4` meta grid. Full-page screenshot at `phase10-section11-desktop.png` confirms light card, pillars, tier cards, marker rows, and insight cards with gold-brand left stripes all rendering correctly.

### 2. Exported PDF gold accents match in-app Section 11 gold-brand
expected: Click "Export PDF" from Section 11. In the resulting PDF: (1) cover gold accent bar is dull gold-brand (#c9a24a) NOT bright orange (#F5A623); (2) all SectionHeading vertical bars throughout the PDF are dull gold-brand; (3) insight card left-edge stripes + bullet dots are dull gold-brand; (4) 5-tier marker palette (emerald/blue/gray/amber/red) renders identically to the in-app Section 11 tier pills; (5) medical-flag amber callout + referral-flag red callout unchanged (status palette sovereign).
result: PASS — PDF generated (`Peak360_Report_Grant_Kempe_.pdf`, 147KB). Cover page rendered to PNG: navy cover block intact (correct, navy is print-sovereign per plan), gold-brand vertical bars visible under the title AND beside every section heading ("Assessment Day Readiness", "Medical Screening", "Results Overview"). Bars read as a muted dull gold-brand, clearly NOT the bright `#F5A623` orange that was the legacy. Results Overview 5-tier palette (Elite green, Great blue, Normal gray, Cautious amber, Poor red) preserved verbatim. Medical-screening status dots (green) preserved. Visual artefact saved to `.playwright-mcp/phase10-pdf-2.png`.

### 3. Browser-print (Cmd+P) of Section 11 renders without box-shadows
expected: Hit Cmd+P on `/portal/assessment/{id}/section/11`. The print preview should show the report content without box-shadows on the bg-paper card or inner cards.
result: FAIL — confirms WR-02 in 10-REVIEW.md. CSS audit via DOM: only TWO `@media print` rules zero shadows: `.report-container * { box-shadow: none !important }` and `.bg-white { box-shadow: none !important }`. The Section 11 card is `bg-paper rounded-2xl shadow-sm`, NOT `bg-white`, and the page has NO `.report-container` ancestor (verified: `document.querySelector('.report-container')` returned null; card's ancestors are `MAIN.flex-1 → DIV.flex-1 → DIV.min-h-screen → DIV.lg:pl-56 → DIV.theme-dark`). The card's `shadow-sm` will print as a visible drop-shadow. Fix: extend the selector to `.bg-white, .bg-paper { box-shadow: none !important }` in globals.css:259.

### 4. Action button row visual gutter on mobile viewport
expected: Resize to mobile width (<640px). The "Export PDF" and "Save & Complete Assessment" buttons should have visible horizontal breathing room from the card edge.
result: FAIL — confirms WR-03 in 10-REVIEW.md. At 390×844 viewport: card spans x=16→368 (width 352), button row class is `flex flex-col sm:flex-row gap-3 justify-center pt-8 pb-4` (no horizontal padding), and BOTH buttons stretch full row width (exportBtn x=16→368, completeBtn x=16→368). Gutter from button edge to card edge = 0px on both sides. Visually functional (the rounded card corners mostly absorb it — see `phase10-section11-mobile-bottom.png`) but the buttons literally touch the card edge. Fix: add `px-6 sm:px-8` to the button row wrapper to match the body padding wrapper.

## Summary

total: 4
passed: 2
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

### WR-02 — Browser-print box-shadow regression (priority: low)
Section 11 card uses `bg-paper` (not `bg-white`) and has no `.report-container` ancestor, so neither existing `@media print` shadow-strip rule matches. Cmd+P print preview will show shadows on the card. Only affects browser-print path; Export PDF (@react-pdf/renderer) path unaffected.

**Fix:** `src/app/globals.css:259` change `.bg-white { box-shadow: none !important; }` to `.bg-white, .bg-paper { box-shadow: none !important; }`

### WR-03 — Mobile button row has zero horizontal gutter (priority: low)
Action buttons stretch full card width on mobile. Visually functional today but fragile to font-size or icon changes.

**Fix:** `src/components/sections/Section11.tsx:582` add `px-6 sm:px-8` to the button row wrapper class.

### Test data hygiene (informational, not a phase 10 gap)
Verified against `a593dabc-559d-44a4-9eff-e93f981e131b` (Grant Kempe, completed). Assessment has `coachId=null` so visible only to admins. Three of four completed assessments in production have null coach_id — that's a Phase 7/8 data-link issue, not Phase 10's.
