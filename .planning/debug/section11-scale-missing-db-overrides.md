---
status: awaiting_human_verify
trigger: "Section 11 report page doesn't show scale visualization for markers with DB overrides"
created: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two independent issues prevent scale rendering for DB-override markers
test: Traced code path from data loading through RangeBar rendering
expecting: N/A - root cause confirmed
next_action: Apply fix to RangeBar and Section11 rendering guard

## Symptoms

expected: Scale visualization (showing where the client's value sits on the poor-to-elite range) appears for all markers in the Section 11 report, whether using hardcoded or DB-override normative ranges
actual: Scale visualization is absent for markers that have DB overrides set by the admin (tested with Vitamin B12)
errors: No visible errors reported
reproduction: 1. Set a DB override for a marker via /admin/normative/[marker]. 2. Open an assessment's Section 11 report. 3. That marker's scale bar is missing.
started: After Phase 3 (admin panel + normative versioning) was implemented

## Eliminated

## Evidence

- timestamp: 2026-03-31T00:01:00Z
  checked: RangeBar.tsx line 80
  found: RangeBar calls getStandards() which only looks up hardcoded normativeData. For markers like vitamin_b12 that have no hardcoded entry, getStandards returns {standards: null} and RangeBar returns null (line 81).
  implication: RangeBar cannot render DB-override ranges because it never receives them.

- timestamp: 2026-03-31T00:02:00Z
  checked: Section11.tsx line 402
  found: Guard condition is `m.hasNorms && m.value !== null && m.tier`. hasNorms is a static boolean from REPORT_MARKERS. vitamin_b12 has hasNorms: false (report-markers.ts line 32).
  implication: Even if RangeBar were fixed, the rendering guard would still prevent it from being shown for markers that gained norms via DB override.

- timestamp: 2026-03-31T00:03:00Z
  checked: Section11.tsx lines 288-303
  found: Data loading correctly uses getStandardsFromSnapshot() which finds DB overrides and computes tier. So the tier pill shows correctly. But the RangeBar component does its own independent lookup.
  implication: The tier calculation and scale visualization use different code paths - tier uses snapshot, scale uses hardcoded only.

## Resolution

root_cause: Two issues prevent scale bars for DB-override markers: (1) RangeBar component independently calls getStandards() which only checks hardcoded normative data, ignoring DB overrides/snapshots entirely. (2) The rendering guard in Section11 uses the static hasNorms boolean from REPORT_MARKERS, which is false for markers that only have norms via DB override.
fix: (1) Modify RangeBar to accept an optional pre-resolved TierRanges prop so Section11 can pass snapshot-resolved standards directly. (2) Change the Section11 rendering guard to use the runtime-resolved hasNorms (i.e., whether standards were actually found from any source) instead of the static REPORT_MARKERS.hasNorms.
verification: Build passes. Type check passes for changed files.
files_changed: [src/components/report/RangeBar.tsx, src/components/sections/Section11.tsx]
