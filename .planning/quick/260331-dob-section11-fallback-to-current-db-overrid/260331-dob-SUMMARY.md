---
phase: quick
plan: 260331-dob
subsystem: normative-versioning
tags: [bugfix, section11, normative-data, backwards-compatibility]
dependency_graph:
  requires: [mergeDbWithHardcoded from versioning.ts]
  provides: [live snapshot fallback for unversioned assessments]
  affects: [Section 11 report rendering for old assessments]
tech_stack:
  added: []
  patterns: [live snapshot fallback]
key_files:
  modified:
    - src/app/api/assessments/[id]/normative-version/route.ts
decisions:
  - Use mergeDbWithHardcoded for live snapshot instead of returning null
metrics:
  duration: 43s
  completed: "2026-03-31"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Quick Task 260331-dob: Section 11 Fallback to Live DB Snapshot Summary

Live merged snapshot fallback for unversioned assessments using existing mergeDbWithHardcoded function.

## What Changed

The normative-version API route previously returned `null` for assessments without a `normativeVersionId` (pre-Phase-3 assessments). Section 11 would then fall back to hardcoded normative data only, meaning markers with DB-only admin overrides (e.g., Vitamin B12) would show no tier pill or scale bar.

Now the API calls `mergeDbWithHardcoded()` to build a live snapshot combining DB overrides with hardcoded defaults, returning a full `NormativeVersionSnapshot` that Section 11 already knows how to consume.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Return live merged snapshot for unversioned assessments | be400eb | src/app/api/assessments/[id]/normative-version/route.ts |

## Changes Detail

**src/app/api/assessments/[id]/normative-version/route.ts:**
1. Added `mergeDbWithHardcoded` to the import from `@/lib/normative/versioning`
2. Replaced `return NextResponse.json({ success: true, data: null })` with a call to `mergeDbWithHardcoded()` that returns the live snapshot

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles without errors in the modified file
- Pre-existing test file TS errors are unrelated (test setup/mocking issues)
- Assessments with a `normativeVersionId` continue to use their pinned snapshot (code path unchanged)

## Known Stubs

None.
