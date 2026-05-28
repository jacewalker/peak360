---
phase: 12-admin-managed-marker-registry
plan: 02
subsystem: api
tags: [api, admin, validation, audit, optimistic-concurrency, cascade-delete, ai-extraction]

requires:
  - phase: 12-admin-managed-marker-registry
    plan: 01
    provides: markers schema + queries (createMarker, updateMarker, deleteMarker, OptimisticConflictError, getAllMarkers, getMarkerByTestKey), getReportMarkers/getFieldMappings merge helpers, AuditAction extensions
  - phase: 11-report-marker-detail-coach-insights
    provides: admin marker-content route patterns reused for shape, gate, audit
  - phase: 03
    provides: upsertDbRange + validateTiers analog for initial-range write
provides:
  - GET/POST /api/admin/markers - admin list + create with full validation, REPORT_MARKERS seed-uniqueness, DB-uniqueness, atomic initial unisex normativeRanges write when hasNorms, 'marker.create' audit
  - GET/PUT/DELETE /api/admin/markers/[testKey] - admin fetch/update/delete with optimistic-concurrency 409, data_key immutability guard, cascade delete via queries.deleteMarker, 'marker.update'/'marker.delete' audit
  - GET /api/markers - client-readable merged registry (admin/coach/client) via requireSession
  - AI extract route now reads from getFieldMappings() - admin-entered aliases participate in extractions without redeploy
affects:
  - 12-03-admin-ui-list-create-edit (consumes /api/admin/markers + /[testKey])
  - 12-04-section-form-custom-markers-block (consumes /api/markers)
  - 12-05-section11-pdf-ai-extraction-wiring (consumes /api/markers; verifies getFieldMappings path)

tech-stack:
  added: []
  patterns:
    - "Admin route shape: requireAdmin gate -> runMigrations -> validate -> seeded+DB uniqueness check -> mutation -> audit emit -> NextResponse.json({success,data})"
    - "Permissive initial-tier validation: each of 5 tiers must be {min,max} but either bound may be null (admins can seed just normal range, fill later via dedicated editor)"
    - "data_key immutability via 400 explicit error message in PUT (prevents orphaning sectionData JSON keys)"
    - "Optimistic concurrency: PUT requires body.updatedAt; OptimisticConflictError thrown by queries.updateMarker is translated to 409 + reload guidance"
    - "Cascade delete via single queries.deleteMarker call; audit metadata carries per-table delete counts for forensics"
    - "AI extract: shadow imported name with const inside POST so existing call sites work unchanged (minimizes diff per 12-PATTERNS section 4)"

key-files:
  created:
    - src/app/api/admin/markers/route.ts
    - src/app/api/admin/markers/[testKey]/route.ts
    - src/app/api/markers/route.ts
  modified:
    - src/app/api/ai/extract/route.ts

key-decisions:
  - "Permissive initialTiers validation (null allowed for min/max bounds) - the dedicated normative editor enforces strict tier-edge continuity; the create form is for fast minimum-viable entry"
  - "Initial-range write failures (after marker insert) are logged and recorded in audit metadata (withInitialRange + initialRangeWritten flags) rather than rolled back - matches the cross-table-no-txn posture documented in 12-PATTERNS section 5"
  - "PUT requires body.updatedAt unconditionally (400 if missing) - safer default than treating omission as 'no concurrency check' (which the marker-content analog does); a brand-new admin form will always know the fetched updatedAt"
  - "AI extract migration kept minimal: import swap + local const shadow inside POST. The verify route does not import fieldMappings (grep-confirmed), so no further changes needed."

requirements-completed: [D-04, D-05, D-13, D-14]

duration: 3m48s
completed: 2026-05-28
---

# Phase 12 Plan 02: Admin + client marker APIs - Summary

**Four route files - admin CRUD (`/api/admin/markers`, `/api/admin/markers/[testKey]`), client-readable merged registry (`/api/markers`), and the AI extract migration to `getFieldMappings()` - all under their respective auth gates, with full body validation, optimistic concurrency, cascade delete, and audit emission on every admin write.**

## Performance

- **Tasks:** 3 (all auto)
- **Completed:** 2026-05-28
- **Duration:** 3m 48s wall-clock (3 atomic feat commits)
- **Files created:** 3 (`route.ts` in `admin/markers/`, `admin/markers/[testKey]/`, `markers/`)
- **Files modified:** 1 (`api/ai/extract/route.ts`)
- **Type-check:** clean for all four files
- **Test cases:** 13 existing merger-helper tests still pass (regression-only verification - no new tests written for this plan, deferred to Plan 12-05 per CONTEXT assumption #7)

## Accomplishments

### Admin list + create (`/api/admin/markers/route.ts`)
- `GET` returns `{ success, data: { markers } }` from `getAllMarkers()` under `requireAdmin` + `runMigrations()`.
- `POST` validates the full request body (testKey regex `^[a-z][a-z0-9_]*$`, label non-empty, section integer 1..10, dataKey regex `^[a-z][a-zA-Z0-9]*$`, pillar in `PILLAR_KEYS`, category non-empty, hasNorms boolean, optional aiAliases string-array). When `hasNorms`, validates initialTiers permissively: each of the 5 tier keys must be `{min, max}` objects but either bound may be `null`.
- Uniqueness checks fail-fast in order: REPORT_MARKERS seed first (cheap in-memory), then DB row check via `getMarkerByTestKey`. Both return 409 with explicit error messages.
- Atomic-ish write: `createMarker` then `upsertDbRange` (when hasNorms). If the range insert fails after the marker insert succeeds, the marker is kept and the failure is logged + recorded in audit metadata (`initialRangeWritten: false`). No real txn (codebase posture, 12-PATTERNS section 5).
- Audit emit: `marker.create` with `{ section, pillar, hasNorms, withInitialRange, initialRangeWritten }`.

### Per-marker admin route (`/api/admin/markers/[testKey]/route.ts`)
- `GET` returns the single marker or 404.
- `PUT` enforces the data_key immutability guard (400 with explicit "would orphan existing assessment data" message). Requires `body.updatedAt` (400 if missing) for optimistic concurrency. Validates each provided field with the same shape rules as POST (only checking fields that are actually present). Catches `OptimisticConflictError` from `queries.updateMarker` and returns 409 with the reload-guidance message. Emits `marker.update` with `metadata.fields = Object.keys(body).filter(k => k !== 'updatedAt')`.
- `DELETE` verifies existence (404 if not), then invokes `deleteMarker` for the cascade (normative_ranges -> marker_content -> markers). Audit emits `marker.delete` with `{ deletedContent, deletedRanges }` metadata.
- All three handlers wrap their main path in try/catch and return `{ success: false, error: 'Unexpected error' }` + 500 on unhandled exceptions; the catch path also `console.error`s for forensics.

### Client-readable registry (`/api/markers/route.ts`)
- Single `GET` handler gated by `requireSession` (any authenticated role).
- Calls `getReportMarkers()` and returns `{ success, data: { markers } }`.
- No `requireAdmin`. No audit (read-only).

### AI extract migration (`/api/ai/extract/route.ts`)
- Static `import { fieldMappings } from '@/lib/ai/field-mappings'` replaced with `import { getFieldMappings } from '@/lib/markers/field-mappings'`.
- Inside `POST`, added `const fieldMappings = await getFieldMappings()` immediately before the existing normalization loop. The local const shadows the imported name with zero changes to the call site at line 110-112. Result: every extraction picks up the latest admin-entered DB aliases without a redeploy (D-04).
- `/api/ai/verify` was grep-checked - does not import `fieldMappings` - no change needed.

## Task Commits

1. **Task 1: Admin list + create route** - `8152af2` (feat)
2. **Task 2: Per-marker GET/PUT/DELETE route** - `83809ed` (feat)
3. **Task 3: Client-readable /api/markers + AI extract migration** - `d28ad4f` (feat)

## Files Created/Modified

**Created**
- `src/app/api/admin/markers/route.ts` - GET (list) + POST (create with validation, seed/DB uniqueness, atomic initial range, audit). 296 lines.
- `src/app/api/admin/markers/[testKey]/route.ts` - GET + PUT (optimistic concurrency, data_key guard) + DELETE (cascade). 314 lines.
- `src/app/api/markers/route.ts` - GET (merged registry, requireSession). 28 lines.

**Modified**
- `src/app/api/ai/extract/route.ts` - swapped static fieldMappings import + added local const shadow. +3/-2 lines.

## Verification

### Acceptance criteria
All three tasks' acceptance criteria pass:

- **Task 1:**
  - `grep -c '^export async function' src/app/api/admin/markers/route.ts` = 2 (GET + POST)
  - `grep -c 'requireAdmin' src/app/api/admin/markers/route.ts` = 2
  - `grep -c "'marker.create'" src/app/api/admin/markers/route.ts` = 1
  - `grep -c 'REPORT_MARKERS.some' src/app/api/admin/markers/route.ts` = 1
  - `grep -c 'getMarkerByTestKey' src/app/api/admin/markers/route.ts` = 1
  - `grep -c 'upsertDbRange\|initialTiers' src/app/api/admin/markers/route.ts` >= 1 (5 matches across init/validation/insert)
- **Task 2:**
  - `grep -c '^export async function' src/app/api/admin/markers/[testKey]/route.ts` = 3 (GET, PUT, DELETE)
  - `grep -c 'requireAdmin' src/app/api/admin/markers/[testKey]/route.ts` = 4 (import + 3 handlers)
  - `grep -c 'dataKey cannot be changed' src/app/api/admin/markers/[testKey]/route.ts` = 1
  - `grep -c 'OptimisticConflictError' src/app/api/admin/markers/[testKey]/route.ts` = 2 (import + instanceof)
  - `grep -c "action: 'marker.update'" src/app/api/admin/markers/[testKey]/route.ts` = 1
  - `grep -c "action: 'marker.delete'" src/app/api/admin/markers/[testKey]/route.ts` = 1
  - `grep -c 'deleteMarker' src/app/api/admin/markers/[testKey]/route.ts` = 2 (import + call)
- **Task 3:**
  - `grep -c 'getReportMarkers' src/app/api/markers/route.ts` = 2 (import + call)
  - `grep -c 'requireAdmin' src/app/api/markers/route.ts` = 0
  - `grep -c 'requireSession' src/app/api/markers/route.ts` = 3 (import + call + comment)
  - `grep -c 'import { fieldMappings }' src/app/api/ai/extract/route.ts` = 0
  - `grep -c 'getFieldMappings' src/app/api/ai/extract/route.ts` = 2 (import + call)
  - `grep -c 'const fieldMappings = await getFieldMappings' src/app/api/ai/extract/route.ts` = 1

### Type-check
```
npx tsc --noEmit 2>&1 | grep -E "api/(admin/)?markers|api/ai/extract"
(no output - all four files clean)
```

### Regression test
```
npx vitest run src/lib/markers/__tests__/
Test Files  2 passed (2)
     Tests  13 passed (13)
```

### Manual smoke (not run - deferred to Plan 12-05 UAT per CONTEXT assumption #7)
Verification block lists 4 curl checks (401 unauth, 409 seed-collision, 409 DB-collision, DELETE cascade verification). All shapes were authored to match the interfaces block and the existing marker-content route's verified-working shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical correctness] PUT requires body.updatedAt unconditionally**
- **Found during:** Task 2 implementation
- **Issue:** The marker-content analog (`src/app/api/admin/marker-content/[marker]/route.ts:139`) treats `updatedAt: null` as "skip concurrency check". For Phase 12's marker registry that would be unsafe - an admin overwriting another admin's edit without realizing it (and the metadata changes here are wider than marker-content: pillar reassignment, dataKey was attempted, etc.).
- **Fix:** Return 400 if `body.updatedAt` is not a number. Brand-new admin form fetched the row, so the fetched updatedAt is always known.
- **Files modified:** `src/app/api/admin/markers/[testKey]/route.ts` (PUT handler)
- **Commit:** `83809ed`
- Documented as a key-decision in this SUMMARY.

**2. [Rule 2 - Critical correctness] aiAliases trim + empty-skip + null on empty**
- **Found during:** Task 1 implementation
- **Issue:** Plan said "aiAliases must be array of strings" but did not specify normalization. Stale whitespace ("  hba1c " vs "hba1c") would cause `getFieldMappings` lookups to miss.
- **Fix:** Trim + filter empty strings before writing. If the resulting array is empty, store `null` (matches `getFieldMappings`'s `Array.isArray && length > 0` guard in Plan 01).
- **Files modified:** both POST in `src/app/api/admin/markers/route.ts` and PUT in `[testKey]/route.ts` apply the same normalization.
- **Commits:** `8152af2`, `83809ed`

### Out-of-scope deferred
- Vitest test suite is currently failing on pre-existing errors (test setup `vi` undefined, store/data tests using stale type shapes). None of these are related to my changes - they failed before this plan ran. NOT addressed per scope-boundary rule. The marker-specific tests (`src/lib/markers/__tests__/`) all pass.

## Known Stubs

None. All four routes are fully implemented and validated; no placeholder responses, no "TODO" wiring left for downstream consumers. The initial-range write path is best-effort but explicitly documented in audit metadata so any partial-write state is forensically recoverable.

## Threat Flags

None new. The four routes implement the mitigations called out in the plan's `<threat_model>`:
- T-12-04 (seed shadowing) mitigated by REPORT_MARKERS.some uniqueness check before DB write.
- T-12-05 (data_key tampering) mitigated by 400 dataKey-immutability guard in PUT.
- T-12-06 (privilege escalation) mitigated by requireAdmin on every admin handler.
- T-12-07 (repudiation) mitigated by logAuditEvent on every POST/PUT/DELETE.
- T-12-09 (DoS via /api/markers spam) mitigated by requireSession.

T-12-08 (alias mis-routing) is the accepted-risk path; the admin editor guidance (Plan 12-03) will surface the warning text.

## Self-Check: PASSED

- File `src/app/api/admin/markers/route.ts`: FOUND
- File `src/app/api/admin/markers/[testKey]/route.ts`: FOUND
- File `src/app/api/markers/route.ts`: FOUND
- File `src/app/api/ai/extract/route.ts`: FOUND (modified)
- Commit `8152af2`: FOUND
- Commit `83809ed`: FOUND
- Commit `d28ad4f`: FOUND
- `npx tsc --noEmit` clean for all four files: CONFIRMED
- Marker test regression (13/13): PASSED
