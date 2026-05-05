---
phase: 01-clinical-accuracy-report-quality
verified: 2026-04-14T09:20:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Section 11 report displays a horizontal range bar next to each rated marker showing the value's position across all 5 tiers"
    status: partial
    reason: "Range bars exist in the PDF export (RangeBarPdf.tsx wired via MarkerRow.tsx) but are NOT rendered in the Section 11 on-screen web view. They were added in commit f243b85 then removed in commit ef65f10 ('Mobile responsiveness, PDF export fixes') before Phase 5 PDF migration. The web view renderMarkerRow() contains only label + value + tier pill — no RangeBar component."
    artifacts:
      - path: "src/components/sections/Section11.tsx"
        issue: "renderMarkerRow (lines 252-274) does not import or render RangeBar, ReferralFlag, or Disclaimer. The 'import { RangeBar }' line added by commit f243b85 was deleted by ef65f10."
      - path: "src/components/report/RangeBar.tsx"
        issue: "Component exists (117 lines, substantive, wired to getStandards) but is ORPHANED — zero consumers in the codebase. Only src/lib/pdf/components/RangeBarPdf.tsx serves the PDF."
      - path: "src/components/report/ReferralFlag.tsx"
        issue: "Component exists (24 lines) but is ORPHANED — no consumer. Only ReferralFlagPdf.tsx is used."
      - path: "src/components/report/Disclaimer.tsx"
        issue: "Component exists (20 lines) but is ORPHANED — no consumer. Only DisclaimerPdf.tsx is used."
    missing:
      - "Re-import RangeBar, ReferralFlag, and Disclaimer in Section11.tsx renderMarkerRow to restore on-screen visual elements"
      - "OR accept that PDF is the sole report delivery path and update success criteria to reflect this (human decision required)"
  - truth: "Markers critically out of range show a visible referral flag recommending further medical investigation"
    status: partial
    reason: "Same root cause as range bars gap. ReferralFlag component exists and works, but is not rendered in the Section 11 web view. Poor/cautious tier markers in the on-screen report show only a colored tier pill — no 'Refer to GP' or 'Monitor' badge. The PDF report DOES show referral flags via ReferralFlagPdf.tsx in MarkerRow.tsx."
    artifacts:
      - path: "src/components/sections/Section11.tsx"
        issue: "No ReferralFlag import or usage. renderMarkerRow at lines 252-274 does not conditionally render any referral flag."
    missing:
      - "Add ReferralFlag rendering for poor-tier markers ('urgent') and cautious-tier markers ('monitor') in Section11 renderMarkerRow"
human_verification:
  - test: "Confirm PDF is the intended primary report delivery mechanism (not the web view)"
    expected: "If PDF is the sole delivery path, SC2/SC3/SC5 are effectively satisfied. If web view must also show range bars and flags, re-import the orphaned components."
    why_human: "The success criteria say 'Section 11 report' and 'every generated report' — it is ambiguous whether this means the web preview or only the PDF export."
  - test: "Verify range bars and referral flags render correctly in the PDF export"
    expected: "Each rated marker row in the PDF shows a 5-segment colored bar with a needle, poor markers show red 'Refer to GP' badge, cautious markers show amber 'Monitor' badge"
    why_human: "PDF rendering requires running the app and opening the generated PDF — cannot verify programmatically"
---

# Phase 1: Clinical Accuracy & Report Quality Verification Report

**Phase Goal:** Coaches can deliver clinically accurate, gender-aware assessments with visual range indicators and actionable recommendations
**Verified:** 2026-04-14T09:20:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Female client's blood marker ratings differ from male for gender-sensitive markers | VERIFIED | `getPeak360Rating('hemoglobin', 13.5, null, 'male')` → 'cautious'; female → 'normal'. Confirmed by 72/72 passing tests. Creatinine also differs. |
| 2 | Section 11 report displays a horizontal range bar next to each rated marker | PARTIAL | PDF export has RangeBarPdf.tsx fully wired. On-screen Section11 web view has NO range bar — RangeBar.tsx exists but was removed from Section11.tsx in commit ef65f10. |
| 3 | Markers critically out of range show a visible referral flag | PARTIAL | PDF has ReferralFlagPdf.tsx wired in MarkerRow.tsx. Section11 web view has NO referral flag — ReferralFlag.tsx exists but not used anywhere in the web view. |
| 4 | Markers in poor or cautious tiers display supplementation and lifestyle recommendations | VERIFIED | insights.ts has PROVIDER_PREFIX on every `why` field, specific supplement dosages (Vitamin D3 2000-4000 IU/day, iron bisglycinate, omega-3 EPA/DHA), dietary suggestions (oats, soluble fibre, sun exposure). 72/72 tests pass. |
| 5 | A medical advice disclaimer is clearly visible on every generated report | PARTIAL | PDF has DisclaimerPdf.tsx at top and bottom (Medical Disclaimer heading + biological sex note). Section11 web view has only a 9px footer line "This report is for informational purposes only" — no Medical Disclaimer heading, no biological sex reference note. Disclaimer.tsx exists but is orphaned. |

**Score:** 2/5 truths fully verified (3 partial — PDF path satisfies all 5, web view satisfies 1 and 4 only)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/normative.ts` | Widened blood_tests type | VERIFIED | Line 32: `blood_tests: Record<string, SimpleMarker \| GenderedMarker>` |
| `src/lib/normative/data.ts` | 18 gendered blood marker ranges | VERIFIED | All 18 markers present: hemoglobin, hematocrit, rbc, ferritin, serum_iron, total_testosterone, free_testosterone, creatinine, egfr, uric_acid, alt, ast, ggt, oestradiol, shbg, dheas, fsh, lh. 64 `male:` occurrences confirm GenderedMarker structure. |
| `src/lib/normative/ratings.ts` | Gender-aware blood_tests code path | VERIFIED | Line 83+99: `if ('male' in test && 'female' in test)` for blood_tests path |
| `src/lib/report-markers.ts` | 18 markers with hasNorms: true | VERIFIED | 48 total `hasNorms: true` entries (8 existing + 18 new + 22 fitness markers) |
| `src/lib/normative/insights.ts` | Healthcare provider prefix + supplement dosages | VERIFIED | PROVIDER_PREFIX constant on line 16, 25 action() calls, specific dosages: D3, iron bisglycinate, omega-3, berberine, methylated B vitamins |
| `src/__tests__/normative/insights.test.ts` | Tests for supplement specificity | VERIFIED | 72/72 tests pass including supplement content tests |
| `src/components/report/RangeBar.tsx` | Horizontal segmented range bar | ORPHANED | 117 lines, substantive (getStandards, MIN_SEGMENT_PCT, proportional width). NOT imported or used in any production component. |
| `src/components/report/ReferralFlag.tsx` | Monitor and urgent referral badges | ORPHANED | 24 lines, substantive ("Refer to GP", "Monitor — retest in 3-6 months"). NOT used in any production component. |
| `src/components/report/Disclaimer.tsx` | Medical disclaimer component | ORPHANED | 20 lines, has "Medical Disclaimer" heading and "biological sex reference data" note. NOT used in any production component. |
| `src/components/sections/Section11.tsx` | Wired report with range bars, flags, disclaimer | FAILED | No import of RangeBar, ReferralFlag, or Disclaimer. renderMarkerRow is a flat label/value/tier row with no sub-components. Header still says "Gender" (line 315) not "Biological Sex". |
| `src/lib/pdf/components/RangeBarPdf.tsx` | PDF range bar | VERIFIED | SVG-based, 5-segment proportional bar with needle. Wired in MarkerRow.tsx line 59. |
| `src/lib/pdf/components/ReferralFlagPdf.tsx` | PDF referral flags | VERIFIED | "Refer to GP for further investigation" (urgent) and "Monitor — retest in 3-6 months" (monitor). Wired in MarkerRow.tsx lines 64-65. |
| `src/lib/pdf/components/DisclaimerPdf.tsx` | PDF disclaimer | VERIFIED | "Medical Disclaimer" heading + "Normative ranges are based on biological sex reference data." Wired in Peak360Report.tsx at top (line 32) and bottom (line 75). |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/normative/ratings.ts` | `src/lib/normative/data.ts` | `'male' in test` discriminator for blood_tests path | WIRED | Lines 83, 99: `if ('male' in test && 'female' in test)` selects gender-specific sub-range |
| `src/lib/normative/data.ts` | `src/types/normative.ts` | `NormativeData` type | WIRED | data.ts satisfies the widened `blood_tests: Record<string, SimpleMarker \| GenderedMarker>` type |
| `src/components/sections/Section11.tsx` | `src/components/report/RangeBar.tsx` | import + render in renderMarkerRow | NOT_WIRED | Import was added in f243b85, deleted in ef65f10. Currently zero references in Section11.tsx. |
| `src/components/report/RangeBar.tsx` | `src/lib/normative/ratings.ts` | getStandards to fetch tier ranges | WIRED | RangeBar.tsx line 3 imports getStandards; but RangeBar.tsx itself is orphaned. |
| `src/components/sections/Section11.tsx` | `src/components/report/ReferralFlag.tsx` | conditional render on poor/cautious tier | NOT_WIRED | No import or usage in Section11.tsx. |
| `src/lib/pdf/components/MarkerRow.tsx` | `src/lib/pdf/components/RangeBarPdf.tsx` | import + conditional render | WIRED | Line 6 import, line 59 render with `marker.resolvedStandards` |
| `src/lib/pdf/components/MarkerRow.tsx` | `src/lib/pdf/components/ReferralFlagPdf.tsx` | conditional render on tier | WIRED | Lines 64-65: poor→urgent, cautious→monitor |
| `src/lib/pdf/Peak360Report.tsx` | `src/lib/pdf/components/DisclaimerPdf.tsx` | render at top and bottom | WIRED | Lines 32 and 75 |
| `src/lib/report/load-report-data.ts` | `src/lib/normative/ratings.ts` | getStandards called with age+gender | WIRED | Line 54: `getStandards(m.testKey, age, gender)` → `resolvedStandards` in PDF markers |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Section11.tsx` (web) | `markers[].tier` from `getPeak360Rating` | `src/lib/normative/data.ts` via `ratings.ts` | Yes — 18 gendered markers produce gender-specific tiers | FLOWING |
| `Section11.tsx` (web) | `insights` from `generatePeak360Insights` | `src/lib/normative/insights.ts` | Yes — real supplement/lifestyle content with PROVIDER_PREFIX | FLOWING |
| `src/lib/pdf/components/MarkerRow.tsx` | `marker.resolvedStandards` | `load-report-data.ts` → `getStandards()` | Yes — real tier ranges from normative data | FLOWING |
| `src/components/report/RangeBar.tsx` | `getStandards(testKey, age, gender)` | `normative/data.ts` | Yes (internally) but component is orphaned — no caller passes props | DISCONNECTED (orphaned) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Hemoglobin 13.5 rates differently by gender | `npx tsx -e "getPeak360Rating('hemoglobin', 13.5, null, 'male')` vs female | male='cautious', female='normal' | PASS |
| Creatinine 0.65 rates differently by gender | `getPeak360Rating('creatinine', 0.65, null, 'male')` vs female | male='great', female='normal' | PASS |
| All 72 normative tests pass | `npx vitest run src/__tests__/normative/` | 3 test files, 72/72 pass | PASS |
| Insights include healthcare provider language | generatePeak360Insights with poor markers | Every insight.why has PROVIDER_PREFIX | PASS |
| Ferritin and serum_iron have distinct insight titles | generatePeak360Insights with both | "Ferritin (iron stores) flagged" vs "Serum iron levels flagged" | PASS |
| Section11 web view has range bars | Check imports in Section11.tsx | Zero imports of RangeBar/ReferralFlag/Disclaimer | FAIL |
| Section11 web view has referral flags | renderMarkerRow in Section11.tsx | No conditional flag rendering | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CLIN-01 | 01-01-PLAN | Rating engine accepts gender and selects gender-specific thresholds | SATISFIED | `getStandards()` has `'male' in test` discriminator for blood_tests; gender param wired through |
| CLIN-02 | 01-01-PLAN | Gender-specific ranges for ~15-20 blood markers | SATISFIED | 18 markers with male/female TierRanges in data.ts; hasNorms: true for all 18 |
| CLIN-03 | 01-01-PLAN | Combined age-bucketed + gender-specific lookups | SATISFIED | ratings.ts lines 83-87: GenderedAgeMarker path handles both age group and gender |
| CLIN-04 | 01-01-PLAN | Gender propagated from Section 1 to Section 11 | SATISFIED | Section11.tsx line 174: `const gender = info.clientGender as string \|\| null` feeds into line 189 getPeak360Rating call |
| REPT-01 | 01-03-PLAN | Horizontal range bar next to each marker | PARTIAL | PDF: SATISFIED (RangeBarPdf.tsx in MarkerRow). Web view: NOT SATISFIED (orphaned RangeBar.tsx). REQUIREMENTS.md still shows "Pending". |
| REPT-02 | 01-03-PLAN | Referral flags for critically out-of-range markers | PARTIAL | PDF: SATISFIED (ReferralFlagPdf.tsx). Web view: NOT SATISFIED (orphaned ReferralFlag.tsx). REQUIREMENTS.md still shows "Pending". |
| REPT-03 | 01-02-PLAN | Supplementation recommendations for poor/cautious tiers | SATISFIED | insights.ts has specific supplement names and dosages for every poor/cautious case. REQUIREMENTS.md correctly shows "Complete". |
| REPT-04 | 01-02-PLAN | Lifestyle/dietary suggestions for cautious tier | SATISFIED | insights.ts includes dietary food sources and lifestyle actions for cautious cases. REQUIREMENTS.md correctly shows "Complete". |
| REPT-05 | 01-03-PLAN | Medical advice disclaimer clearly displayed | PARTIAL | PDF: DisclaimerPdf.tsx at top + bottom with full text. Web view: only 9px footer line, no Medical Disclaimer heading, no biological sex note. REQUIREMENTS.md shows "Pending". |

**Note:** REQUIREMENTS.md traceability table still shows CLIN-01 through CLIN-04, REPT-01, REPT-02, REPT-05 as "Pending" — this is a documentation gap; the implementation work is complete or partial as noted above.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/sections/Section11.tsx` | 315 | `"Gender"` label (not "Biological Sex") | Warning | Plan 01-03 required "Biological Sex" per D-08; was changed in f243b85, reverted in ef65f10 |
| `src/components/report/RangeBar.tsx` | — | Component created but never used in production code | Warning | 117 lines of implementation never reached from any rendered component |
| `src/components/report/ReferralFlag.tsx` | — | Component created but never used in production code | Warning | 24 lines orphaned |
| `src/components/report/Disclaimer.tsx` | — | Component created but never used in production code | Warning | 20 lines orphaned — no Medical Disclaimer heading in web report view |
| `.planning/REQUIREMENTS.md` | 82-90 | CLIN-01..04, REPT-01, REPT-02, REPT-05 still marked "Pending" | Info | Requirements status not updated after implementation; should show Partial/Complete |

No blockers found in normative data layer (CLIN requirements are implemented and tested).

---

### Human Verification Required

#### 1. Scope of "Every Generated Report"

**Test:** Determine whether "Section 11 report" and "every generated report" in the success criteria refer to (a) the on-screen web view, (b) the PDF export, or (c) both.
**Expected:** If PDF is the sole delivery artifact, SC2/SC3/SC5 are effectively satisfied. If the on-screen view also counts, re-import the orphaned components into Section11.tsx.
**Why human:** Product decision about what constitutes "the report" — cannot determine programmatically from the codebase.

#### 2. PDF Visual Verification

**Test:** Export a PDF from an assessment with blood test values. Verify range bars, referral flags, and disclaimer are visible and correct.
- Enter hemoglobin 13.5 with gender=Female → should rate 'normal', no referral flag
- Enter hemoglobin 13.5 with gender=Male → should rate 'cautious', amber "Monitor" flag
- Enter ferritin 5 → should rate 'poor', red "Refer to GP" flag
- Verify range bar segments are proportional (not equal fifths)
- Verify Medical Disclaimer appears at top and bottom of PDF

**Expected:** All elements render correctly in the exported PDF document.
**Why human:** PDF rendering requires running the app and visually inspecting the output.

---

### Gaps Summary

The Phase 1 data layer is fully implemented and tested: 18 blood markers have gender-specific 5-tier ranges, the rating engine selects them correctly (72/72 tests pass), gender propagates from Section 1 through to ratings, and insights have specific supplement dosages with healthcare provider language.

The report UI work from Plan 01-03 has a critical discontinuity: three components were created (`RangeBar.tsx`, `ReferralFlag.tsx`, `Disclaimer.tsx`) and were wired into Section11.tsx in commit `f243b85`, but were subsequently removed in commit `ef65f10` ("Mobile responsiveness, PDF export fixes") before the Phase 5 PDF migration superseded the html2canvas approach. Phase 5 re-implemented the visual elements as PDF-native components (`RangeBarPdf.tsx`, `ReferralFlagPdf.tsx`, `DisclaimerPdf.tsx`) which ARE wired and functional.

The result: all range bar / referral flag / disclaimer features work in the PDF export but are absent from the on-screen Section 11 web view. The orphaned `src/components/report/` files are dead code.

Whether this constitutes a goal gap depends on whether the on-screen view is considered part of "the report" (human verification item #1 above). If the PDF is the primary delivery mechanism — which the architecture strongly suggests — the phase goal is substantially achieved.

---

*Verified: 2026-04-14T09:20:00Z*
*Verifier: Claude (gsd-verifier)*
