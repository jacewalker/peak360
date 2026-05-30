---
slug: critical-audit-fixes
created: 2026-05-30
branch: fix/critical-audit-bugs
---

# Quick Task: Fix critical audit bugs

Fix the 5 critical bugs from the codebase audit, one atomic commit per GitHub issue.

## Tasks

1. **#2 - bulk-delete unauthenticated** (`src/app/api/assessments/bulk-delete/route.ts`)
   Add `requireSession()`, block `role === 'client'`, scope the delete to the
   caller's own assessments (admins may delete any). Return the real deleted count.

2. **#3 - audit-logs unauthenticated** (`src/app/api/admin/audit-logs/route.ts`)
   Add `requireAdmin()` guard.

3. **#4 - export unauthenticated** (`src/app/api/assessments/export/route.ts`)
   Add `requireAdmin()` guard (full PHI CSV is an admin capability).

4. **#9 - resolver returns 'normal' for unmatched/NaN values** (`src/lib/normative/ratings.ts`)
   `resolveRawLabel` now returns `string | null`; returns `null` on no-standards,
   NaN, or no-tier-match. All three rating call sites early-return `null` so
   out-of-range extremes render as "no rating" instead of a misleading "normal".

5. **#21 - testosterone insights dead code** (`src/lib/normative/insights.ts`)
   Rename switch case labels `totalTestosterone`/`freeTestosterone` to the
   actual snake_case testKeys `total_testosterone`/`free_testosterone`.

## Out of scope / follow-ups
- #9 secondary recommendation (raise lower-is-better `poor.max` caps / add
  marker direction so extremes resolve to `poor`/`elite` rather than `null`) is a
  data-level change deferred to a separate task.
- `case 'crpHs'` in insights.ts may share the same camelCase-vs-snake_case defect
  as the testosterone cases (data key appears to be `crp_hs`); flagged for a
  separate check, not changed here to keep this task scoped to #21.
