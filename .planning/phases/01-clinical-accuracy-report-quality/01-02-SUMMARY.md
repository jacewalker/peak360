---
phase: 01-clinical-accuracy-report-quality
plan: 02
subsystem: normative-insights
tags: [insights, supplements, recommendations, clinical-guidance]
dependency_graph:
  requires: []
  provides: [enhanced-insights-with-supplements, healthcare-provider-prefixed-recommendations]
  affects: [Section11-report-output, insight-generation-for-all-markers]
tech_stack:
  added: []
  patterns: [healthcare-provider-prefix-on-all-insights, null-rating-still-flags-marker]
key_files:
  created: []
  modified:
    - src/lib/normative/insights.ts
    - src/__tests__/normative/insights.test.ts
decisions:
  - "Separated homocysteine from crp_hs into its own case for methylation-specific guidance"
  - "Changed flagIf to fire when rating is null (no normative data) so markers without thresholds still produce guidance"
  - "Each marker case now includes at least one doNow item referencing clinician or healthcare provider"
metrics:
  duration: 5m
  completed: "2026-03-29T07:21:28Z"
---

# Phase 01 Plan 02: Enhanced Insights with Supplement Dosages Summary

Enhanced the insights system with specific supplementation recommendations, dietary/lifestyle suggestions, and healthcare provider consultation prefix on all recommendations.

## One-liner

Specific supplement dosages (D3, iron bisglycinate, omega-3, berberine, B vitamins, selenium, zinc, milk thistle, NAC) and dietary/lifestyle guidance added to all flagged marker insights, with healthcare provider consultation language prefixed on every recommendation.

## What Was Done

### Task 1: Add specific supplement dosages and lifestyle recommendations to insights (TDD)

**RED:** Wrote 22 new tests covering D-03 (supplement names/dosages), D-04 (dietary/lifestyle suggestions), D-05 (healthcare provider prefix), de-duplication fix, and new marker cases. All 22 new tests failed as expected.

**GREEN:** Updated `src/lib/normative/insights.ts`:

1. **Healthcare provider prefix (D-05):** Added `PROVIDER_PREFIX` constant prepended to every insight's `why` field via the `action` helper.

2. **Supplement dosages (D-03):** Enhanced every blood marker case with specific supplement recommendations:
   - Vitamin D: D3 2000-4000 IU/day with K2
   - Iron: iron bisglycinate 25-50mg/day with vitamin C
   - Lipids: omega-3 EPA/DHA 1-2g/day, psyllium husk 5-10g/day
   - Glucose: berberine 500mg 2x/day, magnesium glycinate 200-400mg/day, chromium picolinate
   - Homocysteine: methylfolate 400-800mcg, methylcobalamin 1000mcg, P5P 25-50mg
   - HDL: niacin (vitamin B3) with clinician discussion
   - Liver: milk thistle 150-300mg/day, NAC 600-1200mg/day
   - Thyroid: selenium 100-200mcg/day, iodine testing
   - Hormones: zinc 15-30mg/day, magnesium 200-400mg/day
   - Kidney: hydration 2-3L/day (no self-supplementation)

3. **Dietary/lifestyle suggestions (D-04):** Added to every case:
   - Lipids: soluble fibre sources (oats, barley, legumes, apples, citrus)
   - Glucose: walk after meals, carb timing around training
   - Iron: iron-rich foods with vitamin C pairing
   - Vitamin D: 10-20 min midday sun exposure

4. **De-duplication fix:** Split ferritin and serumIron into separate cases with unique titles ("Ferritin (iron stores) flagged" vs "Serum iron levels flagged").

5. **New marker cases:** Added hemoglobin/hematocrit/rbc, uric_acid, dheas, fsh/lh.

6. **Null rating handling:** Changed `flagIf` to fire when `getPeak360Rating` returns null (no normative data exists) so markers without thresholds still produce guidance.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | d80bd9e | test(01-02): add failing tests for supplement dosages and healthcare provider language |
| 2 | a7c69e5 | feat(01-02): enhance insights with supplement dosages and healthcare provider language |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Markers without normative data produced no insights**
- **Found during:** Task 1 GREEN phase
- **Issue:** `flagIf` skipped markers when `getPeak360Rating` returned null (no normative data), because `tier` defaulted to `'normal'` and `tierScore(normal) >= 3` triggered early return. This meant ferritin, serum iron, thyroid, hormones, liver, kidney, and all new markers could never produce insights.
- **Fix:** Changed condition from `if (r >= 3) return` to `if (rating !== null && r >= 3) return` -- only skip if normative data exists AND tier is normal or better.
- **Files modified:** src/lib/normative/insights.ts
- **Commit:** a7c69e5

**2. [Rule 2 - Missing functionality] Homocysteine needed separate case from CRP**
- **Found during:** Task 1 implementation
- **Issue:** Plan specified homocysteine should have methylated B vitamin recommendations, but it shared a case with crp_hs. The recommendations are very different (methylation support vs general inflammation).
- **Fix:** Split homocysteine into its own switch case with title "Homocysteine elevated" and methylation-specific guidance.
- **Files modified:** src/lib/normative/insights.ts
- **Commit:** a7c69e5

## Verification Results

- 29/29 tests passing (22 new + 7 original)
- TypeScript: no errors in modified files (pre-existing errors in unrelated test file)
- All acceptance criteria grep checks passed
- 25 action() calls in insights.ts (requirement: >= 20)

## Known Stubs

None -- all marker cases have complete recommendation content.

## Self-Check: PASSED

- [x] src/lib/normative/insights.ts exists
- [x] src/__tests__/normative/insights.test.ts exists
- [x] .planning/phases/01-clinical-accuracy-report-quality/01-02-SUMMARY.md exists
- [x] Commit d80bd9e found
- [x] Commit a7c69e5 found
