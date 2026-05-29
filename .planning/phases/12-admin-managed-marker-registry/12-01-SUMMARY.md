---
phase: 12-admin-managed-marker-registry
plan: 01
subsystem: database
tags: [postgres, drizzle, sqlite, markers, audit, registry, tdd]

requires:
  - phase: 11-report-marker-detail-coach-insights
    provides: marker_content table + idempotent migration pattern cloned here; epoch-ms timestamp convention
  - phase: 08-client-report-design-refresh
    provides: PILLAR_KEYS / PillarKey type consumed by markers.pillar enum
provides:
  - markers Postgres table (test_key PK, label, section, data_key, pillar, category, subcategory, fallback_unit, has_norms, ai_aliases jsonb, severity_weight, created_by/at, updated_by/at)
  - markers SQLite mirror table
  - MarkerRow interface + getAllMarkers / getMarkerByTestKey / createMarker / updateMarker / deleteMarker query layer
  - OptimisticConflictError class for Plan 12-02 to instanceof-check
  - getReportMarkers() merge helper (REPORT_MARKERS seed + DB rows, DB wins on testKey conflict)
  - getFieldMappings() merge helper (hardcoded fieldMappings + DB aiAliases, DB wins on alias collision)
  - markerToPillar() DB short-circuit (returns stored pillar when marker carries the field, bypassing regex heuristic)
  - 'marker.create' / 'marker.update' / 'marker.delete' AuditAction members
  - idempotent CREATE TABLE IF NOT EXISTS "markers" wired into runMigrations() (PG + SQLite branches)
  - live Postgres markers table (0 rows, ready for admin entries)
affects:
  - 12-02-admin-api-and-validation
  - 12-03-admin-ui-list-create-edit
  - 12-04-section-form-custom-markers-block
  - 12-05-section11-pdf-ai-extraction-wiring

tech-stack:
  added: []
  patterns:
    - "DB-driven registry layer that augments a hardcoded seed; merge helper at read time with DB-wins-on-conflict semantics (D-01)"
    - "TDD on pure-ish merge helpers via vi.mock of the query layer (no live DB in unit tests)"
    - "Optimistic concurrency error class shared by query layer + API layer (instanceof check in routes)"
    - "Cascade delete sequence (normative_ranges -> marker_content -> markers) without a real transaction (mirrors existing codebase posture)"

key-files:
  created:
    - src/lib/markers/queries.ts
    - src/lib/markers/registry.ts
    - src/lib/markers/field-mappings.ts
    - src/lib/markers/__tests__/registry.test.ts
    - src/lib/markers/__tests__/field-mappings.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/schema-sqlite.ts
    - src/lib/db/index.ts
    - src/lib/audit.ts
    - src/lib/pillars/mapping.ts
    - src/lib/pillars/__tests__/mapping.test.ts

key-decisions:
  - "Used runMigrations() (CREATE TABLE IF NOT EXISTS) to apply the live Postgres markers table instead of `drizzle-kit push` — the push command was blocked on a pre-existing interactive prompt about a session_token unique constraint (unrelated to Phase 12). Same end state as db:push; surgical and idempotent. Mirrors the Plan 11-01 decision."
  - "No memoization in getReportMarkers() / getFieldMappings() for v1 — matches the async-no-cache posture of loadReportData and Section11. Merge is O(seed + db rows); cost is one DB read per call."
  - "OptimisticConflictError is a separately-exported class (not a magic return shape) so Plan 12-02's PUT route can `instanceof` it cleanly and translate to 409."
  - "Cascade delete in deleteMarker uses .returning() per step to get accurate row counts; falls back to 0 with .catch() on drivers that don't support it (SQLite quirk)."
  - "ClassifiableMarker widened with `pillar?: PillarKey | null` — the short-circuit fires only when `'pillar' in m && m.pillar` is truthy, so seeded markers (no field) and DB markers with `pillar: null` (defensive) both fall through to the regex heuristic without behavior change."
  - "DB aliases in getFieldMappings() override hardcoded ones on collision — applied last in the merge so the existing fieldMappings record is the floor, not the ceiling. This matches D-04's wording 'DB wins on collision'."

patterns-established:
  - "Phase 12 registry pattern: hardcoded seed + DB table, merged at read time, DB wins on key conflict, no migration of seed into DB"
  - "Merge helpers are pure functions over (seed, dbRows) tested via vi.mock — no live DB needed for unit coverage"
  - "Per-marker classifier short-circuits BEFORE legacy heuristic so DB-driven rows never accidentally inherit category-based pillar assignment"

requirements-completed: [D-01, D-02, D-03, D-04, D-07, D-13]

duration: ~10min
completed: 2026-05-28
---

# Phase 12 Plan 01: Marker registry foundation - Summary

**A `markers` DB table is live in dev Postgres alongside the typed query layer, two merge helpers (`getReportMarkers`, `getFieldMappings`) and a `markerToPillar` short-circuit - giving Plans 02-05 a single shared contract for DB-driven markers without disturbing the canonical REPORT_MARKERS seed.**

## Performance

- **Tasks:** 3 (2 auto + 1 blocking human-verify checkpoint)
- **Completed:** 2026-05-28
- **Duration:** ~10min wall-clock (2 atomic feat commits + 1 checkpoint)
- **Files created:** 5
- **Files modified:** 6
- **Test cases added:** 17 (6 registry + 7 field-mappings + 4 mapping)
- **Test cases passing:** 66 (all existing + new)

## Accomplishments

### Schema and migration
- `markers` Drizzle `pgTable` in `src/lib/db/schema.ts` and `sqliteTable` mirror in `src/lib/db/schema-sqlite.ts`. Shape per D-02: `test_key` PK, `label`/`section`/`data_key`/`pillar`/`category` notNull, nullable `subcategory`/`fallback_unit`/`severity_weight`, `has_norms` boolean (integer mode in SQLite), `ai_aliases` jsonb (text JSON in SQLite), epoch-ms `created_at`/`updated_at`, plus `created_by` / `updated_by`.
- Idempotent `CREATE TABLE IF NOT EXISTS "markers"` block in BOTH the PG and SQLite branches of `runMigrations()` so forward-deploy envs converge without a migration step. No seed (D-03 - seeded markers stay in REPORT_MARKERS source).
- **Live dev Postgres applied + verified:** all 15 columns present with correct types and nullability; `SELECT count(*) FROM markers` returns 0; a second `runMigrations()` invocation is a no-op (idempotency proven).

### Query layer
- `MarkerRow` interface published from `src/lib/markers/queries.ts` matches the plan's interfaces block verbatim.
- `getAllMarkers()` returns rows ordered by `createdAt` asc (used by `getReportMarkers` to honour Phase 12 assumption #3).
- `getMarkerByTestKey()` returns row or null.
- `createMarker()` stamps `createdAt`/`updatedAt` with `Date.now()` and returns the fresh row.
- `updateMarker()` performs optimistic-concurrency check (`current.updatedAt > sentUpdatedAt` throws `OptimisticConflictError`), then partial-update (only provided fields), returns fresh row.
- `deleteMarker()` cascades: `normative_ranges` -> `marker_content` -> `markers`, returning `{ deletedMarker, deletedContent, deletedRanges }` counts.
- `OptimisticConflictError` exported so Plan 12-02's PUT route can `instanceof`-check it.

### Merge helpers (TDD)
- `getReportMarkers()` in `src/lib/markers/registry.ts`: unions REPORT_MARKERS with `getAllMarkers()`. Seed first (skipping any testKey overridden by DB), DB rows last in createdAt asc. Every returned entry tagged with `source: 'seed' | 'db'`. DB rows expose `pillar`, `aiAliases`, `severityWeight`, `createdAt`, `updatedAt`.
- `getFieldMappings()` in `src/lib/markers/field-mappings.ts`: spreads hardcoded `fieldMappings` then overlays each DB row's `aiAliases` (lowercased, trimmed, empty-skipped). DB wins on collision per D-04.

### Pillar short-circuit
- `ClassifiableMarker` widened with `pillar?: PillarKey | null`.
- `markerToPillar()` returns stored `pillar` directly when `'pillar' in m && m.pillar` is truthy, bypassing BALANCE_REGEX / category logic. Seeded markers (no field) and DB markers with `pillar: null` fall through to the legacy heuristic, so regressions (e.g. HDL -> cardiometabolic) are impossible.

### Audit
- `AuditAction` union extended with `'marker.create' | 'marker.update' | 'marker.delete'` (D-13) - ready for Plan 12-02 routes to emit.

## Task Commits

1. **Task 1: Add markers schema, query layer, audit actions** - `cf01d85` (feat)
2. **Task 2: Merge helpers + markerToPillar DB short-circuit (TDD)** - `d0f1bee` (feat). 17 new test cases written RED first, then implementation made them GREEN.
3. **Task 3: [BLOCKING] Apply markers table to live Postgres** - no code commit. Applied via `runMigrations()` against `Jaces-Mac-mini.local` Postgres (drizzle-kit push was blocked on a pre-existing interactive prompt about an unrelated session_token constraint). All 15 columns verified; row count 0; idempotency re-verified.

## Files Created/Modified

**Created**
- `src/lib/markers/queries.ts` - MarkerRow + CRUD + OptimisticConflictError.
- `src/lib/markers/registry.ts` - getReportMarkers() + RegistryMarker type.
- `src/lib/markers/field-mappings.ts` - getFieldMappings().
- `src/lib/markers/__tests__/registry.test.ts` - 6 cases.
- `src/lib/markers/__tests__/field-mappings.test.ts` - 7 cases.

**Modified**
- `src/lib/db/schema.ts` - added `markers` pgTable.
- `src/lib/db/schema-sqlite.ts` - added `markers` sqliteTable mirror.
- `src/lib/db/index.ts` - added `CREATE TABLE IF NOT EXISTS "markers"` to both branches of `runMigrations()`.
- `src/lib/audit.ts` - added 3 new AuditAction members.
- `src/lib/pillars/mapping.ts` - widened ClassifiableMarker, added DB short-circuit.
- `src/lib/pillars/__tests__/mapping.test.ts` - added 4 new cases for the short-circuit + regression.

## Verification

```
npx tsc --noEmit   # zero errors in src/lib/markers/**, src/lib/db/schema*, src/lib/audit.ts, src/lib/pillars/mapping.ts
npx vitest run src/lib/markers/__tests__/ src/lib/pillars/__tests__/mapping.test.ts
  Test Files  3 passed (3)
       Tests  66 passed (66)
```

Live PG inspection:
```
markers columns:
   test_key text NO
   label text NO
   section integer NO
   data_key text NO
   pillar text NO
   category text NO
   subcategory text YES
   fallback_unit text YES
   has_norms boolean NO
   ai_aliases jsonb YES
   severity_weight integer YES
   created_by text NO
   created_at bigint NO
   updated_by text NO
   updated_at bigint NO
row count: 0
```

Second runMigrations() invocation: "OK - no error, idempotent."

## Deviations from Plan

### [Rule 3 - Blocking issue] db:push interactive prompt
- **Found during:** Task 3 (BLOCKING checkpoint).
- **Issue:** `npm run db:push` (drizzle-kit) blocked on an interactive prompt about adding a unique constraint to the `session` table - a pre-existing condition unrelated to Phase 12. The agent cannot answer interactive arrow-key prompts.
- **Fix:** Used the idempotent `runMigrations()` path directly via `npx tsx -e`. This is the documented forward-deploy safety net (12-PATTERNS.md notes the raw `CREATE TABLE IF NOT EXISTS` block is exactly this path). End state identical: table exists with correct shape, 0 rows, second run is a no-op.
- **Files modified:** none beyond the migration code already in place.
- **Commit:** n/a (checkpoint, no code change).

No other deviations.

## Stubs

None - all helpers are implemented and unit-tested. The `pillar` field on `MarkerDef` (from `RegistryMarker`) is optional because seeded markers don't carry one; DB markers always do (enforced by `markers.pillar text NOT NULL` at the DB level).

## Threat Flags

None - this plan only adds an empty table + read/write helpers. Validation (per T-12-01) is explicitly deferred to Plan 12-02's POST/PUT routes.

## Self-Check: PASSED

- File `src/lib/markers/queries.ts`: FOUND
- File `src/lib/markers/registry.ts`: FOUND
- File `src/lib/markers/field-mappings.ts`: FOUND
- File `src/lib/markers/__tests__/registry.test.ts`: FOUND
- File `src/lib/markers/__tests__/field-mappings.test.ts`: FOUND
- Commit `cf01d85`: FOUND
- Commit `d0f1bee`: FOUND
- Live PG markers table: EXISTS (15 columns, 0 rows)
- All Vitest cases (66): PASS
