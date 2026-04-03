---
phase: quick
plan: 260403-pze
subsystem: ui
tags: [pdf, page-break, section11, jspdf, html2canvas]

requires:
  - phase: quick-260331-r70
    provides: PDF page-break spacer algorithm in exportPdf
provides:
  - Forced page-break mechanism via data-pdf-page-break attribute
affects: [section11, pdf-export]

tech-stack:
  added: []
  patterns: ["data-pdf-page-break attribute for forced PDF page breaks (separate from data-pdf-break for boundary prevention)"]

key-files:
  created: []
  modified: [src/components/sections/Section11.tsx]

key-decisions:
  - "Used data-pdf-page-break='before' as new attribute distinct from existing data-pdf-break to separate forced breaks from boundary prevention"
  - "Forced page-break loop runs before existing breakable-element loop so reflow is correct"

patterns-established:
  - "data-pdf-page-break='before': Forces element to start at top of next PDF page"

requirements-completed: []

duration: 1min
completed: 2026-04-03
---

# Quick 260403-pze: Force Insights Section onto New PDF Page Summary

**Forced page break before Insights & Recommendations section using new data-pdf-page-break attribute and pre-loop spacer insertion in exportPdf**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-03T07:44:32Z
- **Completed:** 2026-04-03T07:45:43Z
- **Tasks:** 1 (+ 1 auto-approved checkpoint)
- **Files modified:** 1

## Accomplishments
- Added `data-pdf-page-break="before"` attribute to the Insights & Recommendations wrapper div
- Added forced page-break spacer logic in exportPdf that runs before the existing breakable-element loop
- Elements marked with `data-pdf-page-break="before"` are pushed to the top of the next page unless already near a page boundary

## Task Commits

Each task was committed atomically:

1. **Task 1: Add forced page break before Insights section in PDF export** - `7ff48d8` (feat)

## Files Created/Modified
- `src/components/sections/Section11.tsx` - Added data-pdf-page-break attribute to insights div and forced page-break logic in exportPdf

## Decisions Made
- Used `data-pdf-page-break="before"` as a new attribute distinct from the existing `data-pdf-break`, keeping the two mechanisms separate (forced breaks vs boundary prevention)
- Used `forEach` instead of `for...of` on `NodeListOf` to avoid TypeScript strict-mode iteration error
- Forced page-break loop inserted before the existing `data-pdf-break` loop so that reflow from forced spacers is accounted for when the boundary-prevention loop runs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error with for...of on NodeListOf**
- **Found during:** Task 1 (verification)
- **Issue:** `for (const el of forceBreaks)` produces TS2495 because NodeListOf is not iterable in strict TS without downlevelIteration
- **Fix:** Changed to `forceBreaks.forEach((el) => { ... })` which is natively supported
- **Files modified:** src/components/sections/Section11.tsx
- **Verification:** `npx tsc --noEmit` shows no new errors in Section11.tsx
- **Committed in:** 7ff48d8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor syntax adjustment, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None

## Next Phase Readiness
- PDF forced page-break pattern established and reusable via `data-pdf-page-break="before"` on any element

---
*Plan: quick-260403-pze*
*Completed: 2026-04-03*

## Self-Check: PASSED
