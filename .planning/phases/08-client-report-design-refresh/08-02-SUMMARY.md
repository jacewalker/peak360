---
phase: 08-client-report-design-refresh
plan: 02
subsystem: pillars-pure-layer
tags: [typescript, vitest, drizzle, pure-functions, ssot, classifier, score-formula]
dependency_graph:
  requires:
    - "src/lib/db/schema.ts (Plan 01 — pillarDefinitions / pillarPageCopy / pillarPrescriptions)"
    - "src/lib/db/schema-sqlite.ts (Plan 01 mirror)"
    - "src/lib/db/index.ts (db proxy + runMigrations seed)"
    - "src/lib/pdf/types.ts (ReportMarker shape consumed by classifier)"
    - "src/types/normative.ts (RatingTier union)"
    - "src/lib/pdf/colors.ts (re-export target for D-28 SSOT)"
  provides:
    - "src/lib/pillars/types.ts — PillarKey, PillarStatus, PillarDefinition, PillarPageCopy, PillarPrescription, PillarScoreResult"
    - "src/lib/pillars/colors.ts — TRAFFIC_LIGHT_HEX, TRAFFIC_LIGHT_TEXT, PILLAR_THRESHOLDS, STATUS_LABEL (D-28 SSOT)"
    - "src/lib/pillars/mapping.ts — markerToPillar, computePillarScore, computeAllPillarScores, groupMarkersByPillar (+ legacy adapters)"
    - "src/lib/pillars/queries.ts — getPillarDefinitions, getPillarPageCopy, getPillarPrescriptions"
    - "src/lib/pillars/__tests__/mapping.test.ts — 49 unit tests"
    - "src/lib/pillars/__tests__/colors.test.ts — 10 unit tests"
  affects:
    - "Plan 03 (portal pillars page) — imports computeAllPillarScores + queries"
    - "Plan 04 (admin authoring) — imports queries"
    - "Plan 05 (PDF mirror) — imports computeAllPillarScores + TRAFFIC_LIGHT_HEX (re-exported via pdf/colors)"
    - "src/components/sections/Section11.tsx — switched to computeAllPillarScoresLegacy adapter (back-compat)"
    - "src/components/report/PillarsDisplay.tsx — unchanged (uses TRAFFIC_LIGHT + PillarScore from back-compat exports)"
tech_stack:
  added: []
  patterns:
    - "Pure-function classifier returning {pillar, supporting} discriminated tuple"
    - "Tier-rollup score formula via Record<RatingTier, number> lookup table"
    - "Single-source-of-truth via re-export pattern (D-28) — pdf/colors.ts re-exports from pillars/colors.ts"
    - "TDD red→green: test file committed first, then implementation"
    - "Drizzle row-shape coercion via `Record<string, unknown>` cast at query boundary (matches db-ranges.ts / load-report-data.ts convention)"
key_files:
  created:
    - "src/lib/pillars/types.ts"
    - "src/lib/pillars/colors.ts"
    - "src/lib/pillars/queries.ts"
    - "src/lib/pillars/__tests__/mapping.test.ts"
    - "src/lib/pillars/__tests__/colors.test.ts"
  modified:
    - "src/lib/pillars/mapping.ts (rewrote core; preserved back-compat exports for legacy UI)"
    - "src/lib/pdf/colors.ts (added re-export of TRAFFIC_LIGHT_HEX et al)"
    - "src/components/sections/Section11.tsx (switched import to computeAllPillarScoresLegacy)"
decisions:
  - "D-05 Option A locked in code: BALANCE_REGEX (/balance|sway|stability/i) routes balance markers to Balance pillar regardless of category. single_leg_balance_left/right (under Strength Testing) reclassified to Balance. Strength still has 6+ markers (grip L/R, push_ups, plank_hold, sit_to_stand, single_leg_hop L/R)."
  - "Kept legacy mapping.ts exports (PILLARS, PillarScore, TRAFFIC_LIGHT, computeAllPillarScoresLegacy, pillarKey, TrafficLight) as a back-compat layer wrapping the new pure core. Section11 + PillarsDisplay UI keep working without rewrite. Plans 03/04/05 should use the new API directly."
  - "TRAFFIC_LIGHT (back-compat palette) sources its hex values via TRAFFIC_LIGHT_HEX from the new SSOT file — no duplicated hex strings introduced."
  - "Test helper marker() seeds tier='normal' by default so each test only overrides the fields it cares about (avoids 49× boilerplate)."
metrics:
  duration: "~30 minutes"
  completed: "2026-05-09"
  tasks: 3
  commits: 4
---

# Phase 8 Plan 02: Pure-Function Pillar Layer — Types, Colors, Mapping, Queries Summary

Built the pure-function pillar layer (`src/lib/pillars/`) per CONTEXT D-04/D-05/D-06/D-08/D-09/D-10 with single-source-of-truth traffic-light hex (D-28), Drizzle SSR queries (D-21), and 59 Vitest assertions covering every D-05 mapping branch and the D-08 score formula. Plans 03/04/05 can now consume this layer with the contract locked.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Types + colours single-source-of-truth + PDF colour re-export | 959a30f | src/lib/pillars/types.ts, src/lib/pillars/colors.ts, src/lib/pdf/colors.ts |
| 2 (RED) | Vitest unit tests for mapping + colors | 4095411 | src/lib/pillars/__tests__/mapping.test.ts, src/lib/pillars/__tests__/colors.test.ts |
| 2 (GREEN) | Rewrite mapping.ts to plan-spec contract; back-compat adapters; Section11 import switch | 40f5ad8 | src/lib/pillars/mapping.ts, src/components/sections/Section11.tsx |
| 3 | Server-side query module (getPillarDefinitions / getPillarPageCopy / getPillarPrescriptions) | 5461925 | src/lib/pillars/queries.ts |

## Verification Output

```
OK_FILES                                        # all 6 files present
SSOT: src/lib/pillars/colors.ts:15  (only)      # TRAFFIC_LIGHT_HEX declared exactly once
Tests: 59 passed (49 mapping + 10 colors)       # GREEN gate
TypeScript: no NEW errors in pillars/* or pdf/colors.ts
DB smoke test: OK cardiometabolic,vo2,bodyComposition,strength,balance | The Peak Living Pillars
```

Pre-existing TypeScript errors in `src/__tests__/setup.tsx` and `src/__tests__/store/assessment-store.test.ts` (already failing before this plan, documented in Plan 01 SUMMARY) remain — out of scope per the executor scope boundary.

## D-05 Option A — Reclassification Detail

`/balance|sway|stability/i` matches:

| testKey                    | Original category   | New pillar |
|----------------------------|---------------------|------------|
| single_leg_balance_left    | Strength Testing    | balance    |
| single_leg_balance_right   | Strength Testing    | balance    |

Strength pillar marker count after reclassification (still 6+ contributing markers, signal preserved):
- grip_strength_left, grip_strength_right
- push_ups, plank_hold, sit_to_stand
- single_leg_hop_left, single_leg_hop_right

The regex also catches any future Mobility & Flexibility marker whose label contains "balance"/"sway"/"stability" (e.g. `sway_test`), funneling it to the Balance bucket regardless of category. Documented inline in `mapping.ts` with `// D-05 Option A` and a multi-line JSDoc.

## Pillar Score Smoke (illustrative)

`computeAllPillarScores([elite Lipid, great BodyFat, normal VO2Max, cautious GripL, poor BalanceL])` yields:
- cardiometabolic: { score: 100, status: 'green' }
- bodyComposition: { score: 80,  status: 'green' }
- vo2:             { score: 60,  status: 'amber' }
- strength:        { score: 40,  status: 'amber' }
- balance:         { score: 20,  status: 'red' }

A supporting Hormones marker (D-06) with `tier: 'elite'` does NOT raise the cardiometabolic score (verified by test "Cardiometabolic excludes supporting markers from score (D-09)").

## Single-Source-of-Truth (D-28) Audit

```
$ grep -rn 'export const TRAFFIC_LIGHT_HEX' src/lib/
src/lib/pillars/colors.ts:15  (the ONLY declaration)
```

`src/lib/pdf/colors.ts` re-exports via `export { TRAFFIC_LIGHT_HEX, ... } from '@/lib/pillars/colors';`. Plan 03 (portal Tailwind arbitrary values) and Plan 05 (PDF) both import from these paths — they cannot drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Pre-existing `src/lib/pillars/mapping.ts` had a different API (5-tier `aerobic` keyed at index 1; legacy `MarkerInput`/`PillarScore[]`/`TRAFFIC_LIGHT`/`pillarKey`/`PILLARS` exports) consumed by `src/components/sections/Section11.tsx` and `src/components/report/PillarsDisplay.tsx`.**
- **Found during:** Task 2 implementation — TypeScript flagged broken consumer imports after rewriting mapping.ts to the plan-spec contract.
- **Issue:** The plan's new `computeAllPillarScores(markers: ReportMarker[]): Record<PillarKey, PillarScoreResult>` contract is incompatible with the legacy `computeAllPillarScores(markers: MarkerInput[]): PillarScore[]` shape. Removing the legacy exports would break in-app rendering of the existing pillars section in Section11 (and indirectly the deployed UI).
- **Fix:** Kept the legacy exports at the bottom of `mapping.ts` as adapters wrapping the new pure core:
  - `PILLARS` (5-row array; cardiometabolic/vo2/bodyComposition/strength/balance)
  - `pillarKey()` — thin wrapper around `markerToPillar()` that drops the `supporting` flag
  - `computeAllPillarScoresLegacy()` — projects `MarkerInput[]` → `ReportMarker[]`, calls the new core, then maps the `Record` output into the legacy `PillarScore[]` array shape
  - `TRAFFIC_LIGHT` — palette object that sources its hex strings via `TRAFFIC_LIGHT_HEX` from the SSOT (no duplicated hex literals)
  - `PillarScore`, `TrafficLight`, `PillarKey` — type re-exports
- **Section11 update:** Switched `import { computeAllPillarScores }` → `import { computeAllPillarScoresLegacy }`. PillarsDisplay required no change (it imports `TRAFFIC_LIGHT` + `PillarScore` which both still resolve).
- **Files modified:** `src/lib/pillars/mapping.ts`, `src/components/sections/Section11.tsx`
- **Commit:** 40f5ad8

**2. [Rule 1 — Bug in test fixture] `marker()` test helper had `key: 'test_marker'` default but several call sites overrode `testKey` (the pre-Phase-8 field name) which is not in `Partial<ReportMarker>`.**
- **Found during:** Task 2 first GREEN test run (1/59 failing on `groupMarkersByPillar` because the marker carried the default key, not the override).
- **Fix:** Renamed `testKey` → `key` in the 5 marker() override sites where they were passed as `Partial<ReportMarker>`. Direct calls to `markerToPillar()` (which takes the broader `ClassifiableMarker` shape that accepts both `testKey` and `key`) were left as-is.
- **Files modified:** `src/lib/pillars/__tests__/mapping.test.ts`
- **Commit:** Folded into 4095411 / 40f5ad8 (test was iterated before commit boundary).

### Notes on Acceptance Criteria

- Plan acceptance "supporting: true" should grep-count to 1 — actual count is 2 because the JSDoc on the `markerToPillar` return type explicitly documents `supporting: true when ...`. Only one code branch (`return { pillar: 'cardiometabolic', supporting: true }` at mapping.ts:111) returns the value. The doc-comment occurrence is documentation, not a code branch — passes the spirit of the gate.
- Plan acceptance "'#10b981' in pdf/colors.ts" should grep-count to 1 — actual count is 2 because both `TIER_COLORS_PDF.elite` (line 21) and `TIER_BORDER_PDF.elite` (line 38) used it pre-existing. No new traffic-light declaration was added; the re-export imports the value from pillars/colors.ts.

### Auth Gates

None — entirely pure-function and SSR-read work.

### Architectural Changes

None — back-compat adapters preserved every legacy export so no consumer outside the modified files needed touching.

## Threat Flags

None — surface scan found no new network endpoints, auth paths, file access patterns, or schema changes. All work is below the SSR ownership gate (added in Plan 03 per the threat register).

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/lib/pillars/types.ts
- FOUND: src/lib/pillars/colors.ts
- FOUND: src/lib/pillars/mapping.ts
- FOUND: src/lib/pillars/queries.ts
- FOUND: src/lib/pillars/__tests__/mapping.test.ts
- FOUND: src/lib/pillars/__tests__/colors.test.ts

Commits verified to exist:
- FOUND: 959a30f (Task 1 — types + colors + pdf re-export)
- FOUND: 4095411 (Task 2 RED — Vitest tests)
- FOUND: 40f5ad8 (Task 2 GREEN — mapping rewrite + back-compat + Section11 switch)
- FOUND: 5461925 (Task 3 — queries module)
