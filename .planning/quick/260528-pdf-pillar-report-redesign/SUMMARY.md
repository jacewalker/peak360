---
slug: pdf-pillar-report-redesign
quick_id: 260528-pdf-pillar-report-redesign
date: 2026-05-28
status: complete
---

# Summary: PDF redesign + foolproof marker coverage

Rebuilt the Section 11 downloadable PDF as an 8-page pillar-based report,
branded to the dark portal, and closed the silent-marker-drop hole so newly
added markers (FABER, eyes-closed CoP) actually surface in the report.

## What shipped

**8-page report structure** (`@react-pdf/renderer`, dark portal palette):
1. Cover - wordmark, client band, 5-pillar scoreboard with ring gauges,
   overall composite, brand tagline. Always renders all 5 pillars;
   untested pillars show "Awaiting data" + "-" score.
2-6. One page per pillar in `sortOrder` - score ring + traffic-light
   status chip, plain-meaning, Coach Focus card (positioned above the
   marker list per UX feedback), tier-distribution bar, markers grouped
   Attention -> Cautious -> Normal -> Optimal -> Peak. Pending pillars
   render an "Awaiting data" placeholder page.
7. Full Results Reference - exhaustive index of every recorded marker
   (blood by subcategory + body composition + cardiovascular + strength
   + mobility), compact 2-column rows with tier dots, legend. Driven
   generically from REPORT_MARKERS categories so future categories cannot
   be silently dropped.
8. Appendix - readiness, medical-screening flags, consent, disclaimer.

**Brand fonts bundled.** Inter Tight + JetBrains Mono (8 latin TTFs at
src/lib/pdf/fonts/, converted from @fontsource woff). Registered via
Font.register; replaces the previous Helvetica. styles.ts + the reused
appendix components were migrated to FONT.sans / FONT.mono + WEIGHT.*
so bold actually renders bold.

**New markers wired.** FABER (pass/fail outcome + distance to table, per
side, Section 9 / Mobility & Flexibility) and Single-Leg Balance Eyes
Closed (4 CoP measurements: ML + AP per leg in mm, Section 8 / Strength
Testing). Form inputs added to Section 8 and Section 9, types extended,
8 REPORT_MARKERS entries added. Pass/fail values render as "Pass"/"Fail"
in the report.

**Foolproof guard.** New vitest at
src/lib/pdf/__tests__/marker-coverage.test.ts asserts every REPORT_MARKERS
entry is reachable in the PDF (routed to a pillar OR included in the
reference-page category list). Adding a new category that the PDF
doesn't handle, or a marker the registry doesn't reach, fails CI with an
explicit message. Sanity-tested against a fake marker - guard fired as
expected.

**Untested markers filtered.** Markers with `value == null` are skipped
across both pillar pages (pillar-page-data.ts L63) and the reference page
(L185); empty pillars show an "Awaiting data" placeholder; the scoreboard
keeps the full 5-pillar layout with "-" for pending pillars. Matches
client confirmation: only tested markers render, with explicit
"pending data" wording for empty pillars.

## Files

**New:**
- src/lib/pdf/fonts/InterTight-{Light,Regular,Medium,SemiBold,Bold}.ttf
- src/lib/pdf/fonts/JetBrainsMono-{Regular,SemiBold,Bold}.ttf
- src/lib/pdf/pages/{CoverPage,PillarPage,FullResultsPage,AppendixPage}.tsx
- src/lib/pdf/components/{RingGauge,SectionEyebrow,MarkerTierRow}.tsx
- src/lib/pdf/pillar-page-data.ts (selectPillarMarkers, groupByTier,
  buildPillarPageModels, buildFullResultsGroups, computeOverallComposite)
- src/lib/pdf/__tests__/marker-coverage.test.ts
- scripts/render-sample-report.mjs + scripts/_render-entry.tsx
- mockups/pdf-pillar-report.html (design source of truth, 8-page mockup)

**Changed:**
- src/lib/pdf/Peak360Report.tsx - rewritten to assemble the 8-page report
- src/lib/pdf/fonts.ts - registers brand families, exposes FONT.sans/.mono + WEIGHT
- src/lib/pdf/{styles,colors,types}.ts - migrated off literal 'Helvetica';
  em-dashes purged
- src/lib/pdf/components/{ReportFooter,ReadinessSection,MedicalSection,
  ConsentStatus,DisclaimerPdf}.tsx - migrated to FONT.sans + WEIGHT.*
- src/lib/report-markers.ts - +8 REPORT_MARKERS (FABER + EC balance)
- src/types/assessment.ts - +8 dataKeys, em-dash sweep
- src/components/sections/Section8.tsx - new TestRow for SL Balance EC
- src/components/sections/Section9.tsx - new FABER Test row
- src/lib/report/load-report-data.ts - em-dash sweep

**Removed:**
- src/lib/pdf/components/PillarsPage.tsx (orphaned by the new assembly)
- The flat MarkerTable / TierSummary dump from Peak360Report

## DB / data safety

Zero schema changes. Zero migrations. The 8 new dataKeys live inside the
existing assessment_sections JSON blob - existing assessments simply have
those keys absent (rendered as `null` and filtered out of the PDF).
No data loss risk on deploy.

## Verification

- `npx tsc --noEmit`: zero NEW errors. 19 pre-existing errors in
  `src/__tests__/**` (vitest globals, store-test type mismatches) untouched.
- `npx vitest run src/lib/pdf/__tests__/marker-coverage.test.ts`: 3/3 pass.
- `node scripts/render-sample-report.mjs`: produces an 10-page A4 PDF
  (85.8 KB) without throwing; all 8 brand font weights embedded.
- Em-dash grep over the entire PDF/report tree + Section 8/9 + assessment
  types: clean.
- Visually QA'd all 10 pages of the rendered sample against the mockup.

## Outstanding follow-ups (not in scope of this task)

- **Phase B - DB-driven marker registry.** Real "add markers in production"
  fix. Needs proper planning (registry table + dynamic admin Add-marker UI +
  dynamic input fields + migration). Recommend `/gsd:plan-phase`.
- **Eyes-open balance metric harmonisation.** User mentioned ML+AP-mm
  applies to both eyes-open and eyes-closed, but the existing
  single_leg_balance_left/right markers are still mm² area. Migrating
  eyes-open to the same 4-field ML+AP-mm structure is a separate task.
- Reference page "Mobility & Flexibility" heading can orphan at the very
  bottom of its page; one-line `wrap` fix when next polished.
