---
phase: "01"
phase_name: "clinical-accuracy-report-quality"
status: issues_found
depth: standard
files_reviewed: 12
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
---

# Code Review: Phase 01 — Clinical Accuracy & Report Quality

## Critical

### CR-01 — Testosterone insight switch cases never fire (wrong key format)

- **File:** `src/lib/normative/insights.ts`, lines 189–190
- **Description:** The `flagIf` switch uses `case 'totalTestosterone':` and `case 'freeTestosterone':` (camelCase), but the `testKey` values passed in by `Section11.tsx` come from `REPORT_MARKERS` (`src/lib/report-markers.ts`, lines 48–49) where the keys are `'total_testosterone'` and `'free_testosterone'` (snake_case). The mismatched cases silently fall through to `default`, producing a generic "Marker out of range" insight instead of the specific hormone-related insight.
- **Severity rationale:** Confirmed code path defect. When a client's testosterone is flagged as `poor` or `cautious`, the hormone-specific insight with zinc/magnesium/sleep recommendations is suppressed and replaced by a generic fallback. Directly degrades clinical output quality.
- **Suggested fix:** Add snake_case aliases to the switch block:
  ```ts
  case 'totalTestosterone':
  case 'total_testosterone':
  case 'freeTestosterone':
  case 'free_testosterone':
  ```

## Warnings

### WR-01 — BMI tier ranges are subsumed: `great` and `elite` are unreachable

- **File:** `src/lib/normative/data.ts`, lines 403–407
- **Description:** BMI tiers: `normal: { min: 18.5, max: 29.99 }`, `great: { min: 20.0, max: 24.99 }`, `elite: { min: 21.0, max: 23.99 }`. The `resolveRawLabel` function iterates tiers in order `['poor', 'cautious', 'normal', 'great', 'elite']` and returns on first match. Because `normal` spans 18.5–29.99, any value in the `great` or `elite` range matches `normal` first.
- **Severity rationale:** Affects rating correctness for every client with a healthy BMI. A BMI of 22 shows `normal` instead of `elite`.
- **Suggested fix:** Use non-overlapping ranges or restructure iteration order for inverted-scale markers.

### WR-02 — GGT tier ranges for normal/great/elite all start at `min: 0`, making `great` and `elite` unreachable

- **File:** `src/lib/normative/data.ts`, lines 293–305
- **Description:** For a "lower is better" marker, male GGT: `normal: { min: 0, max: 35 }`, `great: { min: 0, max: 20 }`, `elite: { min: 0, max: 10 }`. Same subsumption issue as BMI — `normal` always matches first.
- **Severity rationale:** GGT is a gendered marker introduced in Phase 01. A male client with GGT of 5 U/L (genuinely elite) is rated `normal`.
- **Suggested fix:** Use non-overlapping disjoint ranges: `normal: { min: 21, max: 35 }`, `great: { min: 11, max: 20 }`, `elite: { min: 0, max: 10 }`.

## Info

### IR-01 — Markers with no normative data display misleading tier text in insights

- **File:** `src/lib/normative/insights.ts`, lines 31–38
- **Description:** The `flagIf` function defaults `tier` to `'normal'` when `rating` is null. For markers like `tsh`, `ft3`, `ft4` with `hasNorms: false`, the insight text reads "rated **normal**" which is factually incorrect since no rating was computed.
- **Severity rationale:** UX issue rather than logic error. Insights themselves are still clinically appropriate.
- **Suggested fix:** Branch on whether rating exists before constructing tier label.

## Files with No Issues

- `src/types/normative.ts` — Type definitions correct and well-structured
- `src/lib/normative/ratings.ts` — Logic sound, gender fallback correctly implemented
- `src/lib/report-markers.ts` — Marker definitions consistent
- `src/__tests__/normative/ratings.test.ts` — Well-structured tests with gender-aware edge cases
- `src/__tests__/normative/data.test.ts` — Structural validation good (but misses range subsumption)
- `src/__tests__/normative/insights.test.ts` — Tests cover major paths (but uses camelCase keys directly, masking CR-01)
- `src/components/report/RangeBar.tsx` — Well-implemented with correct minimum segment width handling
- `src/components/report/ReferralFlag.tsx` — Correct and minimal
- `src/components/report/Disclaimer.tsx` — Appropriate disclaimer language
- `src/components/sections/Section11.tsx` — Data loading, tier counting, and PDF export all sound
