---
slug: pdf-pillar-report-redesign
quick_id: 260528-g0i
date: 2026-05-28
status: in-progress
---

# Quick Task: Redesign Section 11 downloadable PDF into an 8-page pillar report

Rebuild the `@react-pdf/renderer` longevity report so the downloadable PDF matches
the dark-portal brand and is organised one page per Peak Living pillar, markers
ranked worst-to-best (Attention -> Peak). Bigger, more legible type.

**Design source of truth:** `mockups/pdf-pillar-report.html` (full 8-page HTML mockup,
all pages fit A4). Match its layout, type scale, spacing and copy structure as closely
as react-pdf allows.

## Page structure (8 pages)

1. **Cover** - wordmark (Peak360, "360" in gold), report-issued date, hero title, lede,
   client info band (name / age / sex / assessment date), 5-pillar scoreboard (ring
   gauge + name + status per pillar), overall composite score, brand tagline
   ("Know more. Live longer. Optimise everything.").
2-6. **One page per pillar** in `sortOrder` (cardiometabolic, vo2, bodyComposition,
   strength, balance): mono eyebrow "PILLAR NN / 05", big pillar name, plain-meaning
   sentence, a score ring (traffic-light colour) + status chip, a tier-distribution bar,
   then the pillar's score-driving markers grouped Attention -> Cautious -> Normal ->
   Optimal -> Peak (each row: tier rail + name + sub-category + value/unit + tier pill),
   then a gold "Coach focus" note from the pillar prescription.
7. **Full Blood Panel** - every blood marker with a value (primary AND supporting),
   grouped by sub-category panel, compact 2-column rows (tier dot + name + value), tier
   legend at the bottom.
8. **Appendix** - assessment-day readiness grid, medical-screening flags, consent status,
   medical disclaimer.

## Data (all already available)

- `loadReportData()` -> `ReportData`: `markers[]` (key,label,value,tier,unit,category,
  subcategory,hasNorms), `definitions` (PillarDefinition: label, plainMeaning, sortOrder),
  `prescriptions` (PillarPrescription: pillarKey, summary, bullets), `tierCounts`,
  `readiness`, `medical`, `consent`, client fields.
- `computeAllPillarScores(markers)` -> per-pillar `{ score, status, tierCounts }`.
- `markerToPillar(m)` -> `{ pillar, supporting }`. Pillar marker set = `pillar===key &&
  !supporting && value!=null`, sorted by tier rank poor->elite.
- Overall composite = rounded mean of the non-null pillar scores.
- Tier labels: `TIER_LABELS` (poor=Attention ... elite=Peak). Tier dot/pill = `TIER_COLORS_PDF`;
  pillar ring/status = `TRAFFIC_LIGHT_HEX` (preserve D-11 / D-16 palette sovereignty).

## Tasks (atomic commits)

1. **Fonts** - 8 brand TTFs already at `src/lib/pdf/fonts/*.ttf` (Inter Tight 300/400/500/600/700,
   JetBrains Mono 400/600/700, converted from @fontsource woff). Rewrite `src/lib/pdf/fonts.ts`
   to `Font.register` both families from those files (absolute path via `process.cwd()`),
   exposing `FONT.sans` / `FONT.mono` plus weight constants. Verified: react-pdf renders them.
2. **Shared primitives + helpers** - in `src/lib/pdf/`: tier-grouping + pillar-marker
   selection helpers; a `RingGauge` (reuse the SVG arc approach from the old PillarsPage),
   tier pill, marker row, section eyebrow. Update `colors.ts`/`styles.ts` only if needed.
3. **Page components** - `src/lib/pdf/pages/`: `CoverPage`, `PillarPage` (param: pillar def +
   score + markers + prescription), `FullBloodPanelPage`, `AppendixPage`. Reuse existing
   `ReadinessSection` / `MedicalSection` / `ConsentStatus` / `DisclaimerPdf` inside the
   appendix where sensible.
4. **Assemble** - rewrite `Peak360Report.tsx` to render Cover -> 5 PillarPages (sorted) ->
   FullBloodPanelPage -> AppendixPage. Remove the old single `PillarsPage` + flat
   `MarkerTable`/`TierSummary` dump from the document. Keep `ReportFooter` per page
   (page brand + number).
5. **Verify** - typecheck + build clean; render a real PDF for a seeded assessment and
   eyeball every page against the mockup; fix overflow/wrapping.

## Constraints / guards

- Defensive: never throw in PDF generation. Missing data -> "-" / "Awaiting data".
  Pillars with no scored markers -> pending state (ring "-", no groups, gentle note).
- react-pdf has no CSS grid: use flex rows/`width:'50%'` for the blood-panel 2-col and the
  cover scoreboard. No conic-gradient: rings use SVG stroke-dasharray arc. Radial-gradient
  page glows are decorative-only; approximate or omit (do not block on them).
- Dense pillar (cardiometabolic ~11 markers) must fit one page at the mockup's tightened
  spacing; allow react-pdf to flow a page-2 continuation gracefully if a client has more.
- NO em-dashes anywhere (code, comments, copy) - regular hyphens only.
- Existing assessments must still generate a valid PDF.
