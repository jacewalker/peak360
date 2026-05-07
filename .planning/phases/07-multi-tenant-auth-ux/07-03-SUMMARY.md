---
phase: 07-multi-tenant-auth-ux
plan: 03
subsystem: api
tags: [drizzle, leftJoin, assessments, coachName, multi-tenant]

requires:
  - phase: 06 (or earlier — multi-tenant schema with assessments.coachId + Better Auth user table)
    provides: assessments.coachId column, user table with name field
provides:
  - GET /api/assessments now returns coachName on every row (string or null)
  - Same response shape for admin/coach/client roles (flat array, no per-role branching)
  - Legacy assessments with coachId=NULL preserved via leftJoin (coachName=null)
affects:
  - 07-05 (admin dashboard grouping by coach uses coachName from this response)
  - any future consumer of /api/assessments — TypeScript IntelliSense now exposes coachName

tech-stack:
  added: []
  patterns:
    - "Drizzle leftJoin with explicit-projection select object — preferred over `... as any` spread for type inference"
    - "Single response contract per endpoint regardless of session role (D-14)"

key-files:
  created:
    - .planning/phases/07-multi-tenant-auth-ux/07-03-SUMMARY.md
  modified:
    - src/app/api/assessments/route.ts

key-decisions:
  - "D-14: Single flat-array response shape with coachName projected via leftJoin in all three role branches; grouping logic lives in the admin dashboard (07-05), not the API."
  - "Used leftJoin (not innerJoin) so legacy assessments with NULL coach_id remain visible to admin — coachName is null for those rows."
  - "Inlined the select projection per branch (rather than extracting to a constant) to satisfy the explicit acceptance grep counts and to keep each branch readable as a self-contained query."

patterns-established:
  - "Explicit-projection leftJoin pattern: `db.select({...cols, coachName: user.name}).from(assessments).leftJoin(user, eq(assessments.coachId, user.id))` — reuse this in any /api/assessments/* endpoint that needs coach context."

requirements-completed: [REQ-7.4]

duration: ~5 min
completed: 2026-05-07
---

# Phase 07 Plan 03: GET /api/assessments returns coachName Summary

**`GET /api/assessments` now leftJoins the user table and projects `coachName` on every row across all three role branches, unlocking coach-grouped admin dashboard rendering in plan 07-05.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-07T04:50Z
- **Completed:** 2026-05-07T04:54Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `import { user }` to the existing `@/lib/db/schema` combined import
- Replaced each of the three role-branch `db.select().from(assessments)` queries with an explicit-projection `db.select({...}).from(assessments).leftJoin(user, eq(assessments.coachId, user.id))` query that pulls `coachName: user.name` alongside the assessment columns
- Verified all acceptance grep counts: leftJoin × 3, coachName × 3, innerJoin × 0
- TypeScript compiles cleanly (no new errors in route file or any production source)
- `npm run build` succeeds

## Task Commits

1. **Task 1: Add leftJoin(user) to all three role branches in GET /api/assessments** — `99f509d` (feat)

## Files Created/Modified
- `src/app/api/assessments/route.ts` — GET handler now projects `coachName` via leftJoin in admin / coach / client branches; POST handler unchanged

## Response Shape Contract (for plan 07-05)

Each row returned from `GET /api/assessments` now matches:

```typescript
{
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  clientDob: string | null;
  clientGender: 'male' | 'female' | null;
  assessmentDate: string;
  currentSection: number;
  status: string;
  coachId: string | null;
  clientId: string | null;
  normativeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  coachName: string | null;   // NEW — null when coachId is null OR when the user row was deleted
}
```

The plan 07-05 admin dashboard should group rows by `coachId` and display `coachName ?? 'Unassigned'` as the section header. Rows where `coachId === session.user.id` belong in the "My clients (you)" group.

## Decisions Made

- **Single response contract (D-14):** All three role branches return the same row shape. Coach + client branches carry coachName even though they currently ignore it — this keeps consumers free to evolve without versioning the endpoint.
- **leftJoin not innerJoin (T-07-12 mitigation):** Acceptance criterion enforces `grep -c "innerJoin"` = 0 so legacy null-coachId rows survive on the admin response.
- **Inlined projections:** Each branch repeats the explicit select object. An earlier draft extracted it to a `const assessmentWithCoachSelection` to DRY the code; reverted because the acceptance grep requires the literal `coachName: user.name` to appear three times. Treated the acceptance contract as authoritative.

## Deviations from Plan

None — plan executed exactly as written. Acceptance criteria all pass.

## Issues Encountered

- Pre-existing TypeScript errors in `src/__tests__/**` (vitest globals not typed, Section data shapes) surfaced during `npx tsc --noEmit`. These are out-of-scope per the executor scope boundary (not caused by this task) and not blockers — `npm run build` (which excludes test files) succeeds.

## Threat Surface

All threats in the plan's `<threat_model>` section are dispositioned and mitigated:

- **T-07-10 (accept):** Coach name visibility to clients is intentional product behaviour.
- **T-07-11 (mitigate):** `WHERE coachId = session.user.id` (coach branch) preserved before the join projects to the response — no cross-coach leakage. `requireSession` is preserved (verified: 2 usages + 1 import = 3 occurrences).
- **T-07-12 (mitigate):** Acceptance grep enforces `innerJoin` count = 0; only `leftJoin` is used.

No new threat surface introduced beyond the threat register.

## User Setup Required

None — no environment variables, secrets, or external service configuration required.

## Next Phase Readiness

- Plan 07-05 (admin dashboard coach-grouping) can now consume `coachName` directly from the existing `/api/assessments` GET response without needing a parallel `/api/coaches` lookup.
- No DB migrations required — `user` table already exists.

## Self-Check: PASSED

Verified post-write:
- FOUND: src/app/api/assessments/route.ts (modified)
- FOUND: commit 99f509d (`git log --oneline | grep 99f509d`)
- grep counts: leftJoin × 3, coachName × 3, innerJoin × 0, requireSession × 3 (1 import + 2 usages)
- `npm run build` exits 0

---
*Phase: 07-multi-tenant-auth-ux*
*Completed: 2026-05-07*
