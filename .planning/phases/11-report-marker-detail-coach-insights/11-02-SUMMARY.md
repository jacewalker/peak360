---
phase: 11-report-marker-detail-coach-insights
plan: 02
subsystem: api
tags: [nextjs, drizzle, postgres, rbac, audit, optimistic-concurrency, marker-content]

# Dependency graph
requires:
  - phase: 11-report-marker-detail-coach-insights (Plan 01)
    provides: markerContent pgTable, getAllMarkerContent() read layer, MarkerContent interface, marker_content.update audit action
provides:
  - "Admin-gated GET/PUT /api/admin/marker-content/[marker] with 409 optimistic-concurrency + audit"
  - "Admin-gated GET /api/admin/marker-content list endpoint returning rows + authoredKeys"
  - "Client-readable any-role GET /api/marker-content returning all marker content"
affects: [11-03 (admin authoring UI reads/writes these admin routes), 11-04 (report reads /api/marker-content)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin route gate cloned from /api/admin/normative (requireAdmin → errorRes short-circuit)"
    - "409 optimistic-concurrency on integer epoch-ms updatedAt before onConflictDoUpdate upsert"
    - "Any-role read endpoint via requireSession (no role gate) delegating to a queries.ts read fn"

key-files:
  created:
    - src/app/api/admin/marker-content/[marker]/route.ts
    - src/app/api/admin/marker-content/route.ts
    - src/app/api/marker-content/route.ts
  modified: []

key-decisions:
  - "GET on a missing row returns an empty-form shape ({ definition:null, ... updatedAt:null }) so the editor renders for unauthored markers"
  - "authoredKeys returned as a string[] (not Set) for JSON serialization"

patterns-established:
  - "marker_content admin API mirrors normative API gate + 409 semantics verbatim"
  - "audit metadata.fields = Object.keys(body) minus updatedAt — records which fields a PUT touched"

requirements-completed: [D-07, D-11, D-12]

# Metrics
duration: 9min
completed: 2026-05-26
---

# Phase 11 Plan 02: Marker Content API Layer Summary

**Three Next.js route files exposing marker_content: admin-gated single-marker GET/PUT (409 concurrency + audit), an admin list endpoint with authoredKeys, and a client-readable any-role GET the report consumes.**

## Performance

- **Duration:** ~9 min
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments
- `GET/PUT /api/admin/marker-content/[marker]` — requireAdmin gate, REPORT_MARKERS 404 check, 409 optimistic-concurrency on stale `updatedAt`, `onConflictDoUpdate` upsert stamping `updatedBy`/`updatedAt`, and `logAuditEvent('marker_content.update')` on every write. GET on an unauthored marker returns an empty-form shape so the editor can still render.
- `GET /api/admin/marker-content` — requireAdmin list returning all rows plus `authoredKeys` (testKeys with any of definition/impact/coachInsights set) for status pills.
- `GET /api/marker-content` — requireSession any-role read delegating to `getAllMarkerContent()`; the endpoint Plan 04's report fetches in `loadReport()`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin GET/PUT route for single marker (409 + audit)** - `a460ef3` (feat)
2. **Task 2: Admin list route + client-readable any-role GET route** - `d560f00` (feat)

## Files Created/Modified
- `src/app/api/admin/marker-content/[marker]/route.ts` - Admin GET (single marker, empty-form fallback) + PUT (409 concurrency, upsert, audit)
- `src/app/api/admin/marker-content/route.ts` - Admin list of all rows + authoredKeys
- `src/app/api/marker-content/route.ts` - Any-role authenticated GET of all marker content

## Decisions Made
- GET on a not-yet-authored marker returns `{ testKey, definition:null, impact:null, coachInsights:null, updatedBy:null, updatedAt:null }` rather than a 404, so the Plan 03 editor can render an empty form for every REPORT_MARKERS entry.
- `authoredKeys` is serialized as a `string[]` (the analog used a Set; JSON cannot serialize a Set, so the array form is correct for the wire contract).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Annotated db.select() row type in the admin list route**
- **Found during:** Task 2 (admin list route)
- **Issue:** `db` is exported as `Proxy<any>`, so `rows` from `db.select()` is untyped — `.filter((r) => ...)` and `.map((r) => ...)` raised TS7006 (implicit any) under `noEmit`.
- **Fix:** Cast `rows as Record<string, unknown>[]` before filter/map and `r.testKey as string` (matching the convention already used in `src/lib/marker-content/queries.ts`).
- **Files modified:** src/app/api/admin/marker-content/route.ts
- **Verification:** `npx tsc --noEmit` reports no marker-content errors.
- **Committed in:** d560f00 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking type error)
**Impact on plan:** Necessary to satisfy the plan's `npx tsc --noEmit` verification gate. No scope creep.

## Issues Encountered
None beyond the type annotation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 (admin authoring UI) can read/write through `/api/admin/marker-content` and `/api/admin/marker-content/[marker]`; the PUT contract is `{ definition, impact, coachInsights, updatedAt }` → `{ success, data: { updated: 1 } }` with 409 on stale updatedAt.
- Plan 04 (report read path) can fetch `/api/marker-content` → `{ success, data: MarkerContent[] }`.

## Self-Check: PASSED

All 3 route files and the SUMMARY exist on disk; both task commits (a460ef3, d560f00) are present in git history.

---
*Phase: 11-report-marker-detail-coach-insights*
*Completed: 2026-05-26*
