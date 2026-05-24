---
phase: quick-260524-hua
plan: 01
subsystem: strength-testing
tags: [section8, vald, ui, result-card]
requires: []
provides:
  - ValdResultCard secondary L/R metric row
  - ValdResultCard computed Max Force Asymmetry %
  - Section 8 CMJ single jump height + Modified RSI
  - Section 8 SL Jump (renamed) with L/R jump height + L/R Modified RSI
affects:
  - src/components/ui/ValdResultCard.tsx
  - src/components/sections/Section8.tsx
tech-stack:
  added: []
  patterns: [optional-backward-compatible-props]
key-files:
  created: []
  modified:
    - src/components/ui/ValdResultCard.tsx
    - src/components/sections/Section8.tsx
decisions:
  - "Max Force Asymmetry % is computed read-only from L/R (|L-R|/max*100), not a typed input"
  - "Modified RSI is unitless (secondaryUnit=''); inputs use step=0.01"
  - "SL Jump retains existing singleLegHopLeft/Right data keys to preserve saved values"
metrics:
  duration: ~10m
  completed: 2026-05-24
requirements: [HUA-01, HUA-02, HUA-03, HUA-04]
---

# Quick 260524-hua: Strength Testing (Section 8) Metric Changes Summary

Extended `ValdResultCard` with a backward-compatible secondary L/R metric row and a computed Max Force Asymmetry % display, then rewired Section 8's CMJ (single jump height + Modified RSI), IMTP (computed asymmetry %), and renamed Single Leg Hop to "SL Jump" with L/R jump height + L/R Modified RSI.

## What Was Built

### Task 1 — ValdResultCard extension (commit a141061)
- Added optional props `secondaryLeft`, `secondaryRight`, `secondaryMetric`, `showAsymmetryPercent` to `ValdResultCardProps`.
- Added module-level helper `asymmetryPct(l, r) = max>0 ? |l-r|/max*100 : 0`.
- In the L/R-only branch: wrapped the primary row in a `space-y-3` column; renders a compact secondary L/R row (`text-lg`, blue Left / amber Right) labeled by `secondaryMetric` when both secondary values are present (`hasSecondaryLR`).
- In both the combined (`hasLR && hasSingle`) and L/R-only branches: renders a subtle "Max Force Asymmetry" stat (mono eyebrow label + `tabular-nums` value to 1 decimal + "%") when `showAsymmetryPercent` is true.
- Existing single-value `secondaryLabel`/`secondaryValue` path left untouched (CMJ + Farmers Carry).

### Task 2 — Section 8 wiring (commit 44b740b)
- **CMJ:** Replaced `cmjLeft`/`cmjRight` inputs with `cmjJumpHeight` (step 0.1) + `cmjModifiedRsi` (step 0.01). Card now uses `singleValue={cmjJumpHeight}` + `secondaryLabel="Modified RSI"` / `secondaryValue={cmjModifiedRsi}` / `secondaryUnit=""`.
- **IMTP:** Inputs unchanged; added `showAsymmetryPercent` to the card so the computed Max Force Asymmetry % renders alongside the existing single value + L/R split.
- **SL Jump:** Renamed TestRow title + card title from "Single Leg Hop Test" to "SL Jump". Kept `singleLegHopLeft`/`singleLegHopRight` data keys (relabeled "Left/Right Jump Height (cm)"). Added `singleLegHopRsiLeft`/`singleLegHopRsiRight` (step 0.01) and passed them as `secondaryLeft`/`secondaryRight` with `secondaryMetric="Modified RSI"`. Card `metric="Jump height"`, dropped the "Top 3 hops" subtitle.

## Backward Compatibility
All new `ValdResultCard` props are optional. Verified the unchanged call sites (Handgrip, Shoulder ISO-Y, Push-Up, Dead Man Hang, Farmers Carry, Single Leg Balance) pass none of the new props, so they render exactly as before. The new secondary L/R row and asymmetry % only render when their respective props are supplied.

## Deviations from Plan
None - plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: No errors in `ValdResultCard.tsx` or `Section8.tsx`. (Pre-existing, out-of-scope tsc errors remain in `src/__tests__/` — test setup `vi` globals, store/normative test type casts — not introduced by this change.)
- `npx eslint src/components/ui/ValdResultCard.tsx`: clean (exit 0).
- `npx eslint src/components/sections/Section8.tsx`: clean (exit 0).
- Dev server already running; not restarted per constraints.

## Out of Scope (per plan)
- No normative thresholds / report-marker changes (these metrics aren't rated).
- No DB/schema migration; stale `StrengthTesting` interface in `src/types/assessment.ts` left as-is.
- Orphaned dev data in old `cmjLeft`/`cmjRight` keys is acceptable (dev only).

## Known Stubs
None.

## Self-Check: PASSED
- Files exist: ValdResultCard.tsx, Section8.tsx, 260524-hua-SUMMARY.md
- Commits exist: a141061, 44b740b
- Content checks: `secondaryLeft` in ValdResultCard, `cmjJumpHeight` in Section8
