---
phase: quick
plan: 260410-pzr
subsystem: assessment-workflow
tags: [navigation, completion, section-11]
key-files:
  modified:
    - src/components/layout/NavigationButtons.tsx
    - src/app/assessment/[id]/section/[num]/page.tsx
decisions: []
metrics:
  duration: 55s
  completed: "2026-04-10T08:46:05Z"
---

# Quick Task 260410-pzr: Fix Complete Button on Section 11

Wire the Complete button on the final assessment section to save data, mark the assessment as completed, and redirect to home.

## What Changed

### NavigationButtons.tsx
- Added `onComplete?: () => void` prop to interface
- Complete button (shown on last section) now calls `onComplete` instead of `onNext` when the prop is provided
- Non-final sections still call `onNext` as before

### page.tsx (Section Page)
- Added `handleComplete` callback: saves section with completion check, PUTs `{ status: 'completed' }` to the assessment API, then redirects to `/`
- Passed `onComplete={handleComplete}` to both NavigationButtons render paths (Section 11 special case and general sections)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b6be831 | Wire Complete button to save, mark completed, redirect |

## Verification

- TypeScript compiles without errors in modified files (pre-existing test file errors unrelated)
- Complete button calls onComplete on last section, onNext on all other sections
