---
phase: 01-clinical-accuracy-report-quality
plan: 01
subsystem: normative
tags: [blood-markers, gender-aware, clinical-ranges, rating-engine]

requires: []
provides:
  - Gender-aware blood_tests type (SimpleMarker | GenderedMarker)
  - 18 gendered blood marker ranges in normativeData
  - Gender-aware getStandards() code path for blood_tests
  - hasNorms: true for 18 blood markers in REPORT_MARKERS
affects: [01-02, 01-03, report-generation, insights-engine]

tech-stack:
  added: []
  patterns:
    - "GenderedMarker pattern for blood_tests matching existing body_comp pattern"
    - "Gender fallback to male when gender is null/empty (D-11 decision)"

key-files:
  created: []
  modified:
    - src/types/normative.ts
    - src/lib/normative/data.ts
    - src/lib/normative/ratings.ts
    - src/lib/report-markers.ts
    - src/__tests__/normative/ratings.test.ts
    - src/__tests__/normative/data.test.ts

key-decisions:
  - "Gender fallback defaults to male ranges when gender is null or empty string"
  - "Female hormone markers (oestradiol, fsh, lh) use follicular phase reference ranges as default"
  - "Lower-is-better markers (creatinine, uric_acid, alt, ast, ggt) have inverted tier ordering (poor=high, elite=low)"
  - "eGFR ranges are identical for male/female since input is pre-calculated, but stored as GenderedMarker for future flexibility"

patterns-established:
  - "GenderedMarker blood_tests: check 'male' in test to discriminate SimpleMarker vs GenderedMarker"

requirements-completed: [CLIN-01, CLIN-02, CLIN-03, CLIN-04]

duration: 5min
completed: 2026-03-29
---

# Phase 01 Plan 01: Gender-Specific Blood Marker Ranges Summary

**Added gender-specific 5-tier normative ranges for 18 blood markers with gender-aware rating engine resolution and male-fallback behavior**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T07:17:01Z
- **Completed:** 2026-03-29T07:22:00Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments

### Task 1: Widen blood_tests type and update rating engine (TDD)
- Changed `NormativeData.blood_tests` type from `Record<string, SimpleMarker>` to `Record<string, SimpleMarker | GenderedMarker>`
- Added gender-aware code path in `getStandards()` for blood_tests using `'male' in test` discriminator
- Gender fallback: null/empty gender defaults to male ranges (matching body_comp pattern)
- Added hemoglobin as first gendered marker to enable tests
- Added 7 new tests covering gender resolution, fallback, and backward compatibility
- Updated existing data tests to handle both SimpleMarker and GenderedMarker shapes
- **Commit:** 34e7984

### Task 2: Add 18 gendered blood marker ranges and update report-markers
- Added gender-specific 5-tier ranges for all 18 markers: hemoglobin, hematocrit, rbc, ferritin, serum_iron, total_testosterone, free_testosterone, creatinine, egfr, uric_acid, alt, ast, ggt, oestradiol, shbg, dheas, fsh, lh
- Clinical ranges sourced from WHO, Medscape, Mayo Clinic, and clinical pathology standards
- Set `hasNorms: true` for all 18 markers in REPORT_MARKERS (total now 48 markers with norms)
- Added data integrity tests verifying all 18 markers have male/female keys, 5 tiers each, valid min/max
- **Commit:** ee5221d

## Verification

- All 52 normative tests pass (ratings + data + insights)
- Gender differentiation confirmed: hemoglobin 13.5 g/dL rates as "cautious" for male, "normal" for female
- Existing ungendered blood markers (cholesterol, glucose, etc.) continue to work unchanged
- Pre-existing TypeScript errors in assessment-store.test.ts are unrelated to this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing data tests for GenderedMarker compatibility**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** Existing `data.test.ts` tests assumed all blood_tests entries have direct tier keys (SimpleMarker shape), but hemoglobin is now a GenderedMarker causing 2 test failures
- **Fix:** Updated tests to detect GenderedMarker shape and check tiers inside male/female sub-objects
- **Files modified:** src/__tests__/normative/data.test.ts
- **Commit:** 34e7984

## Known Stubs

None - all 18 markers have complete 5-tier ranges for both genders.

## Self-Check: PASSED

- All 6 modified files exist on disk
- Both task commits (34e7984, ee5221d) found in git log
