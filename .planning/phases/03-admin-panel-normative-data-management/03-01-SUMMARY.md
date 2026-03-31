---
phase: 03-admin-panel-normative-data-management
plan: 01
subsystem: normative-data-layer
tags: [database, schema, normative-ranges, rating-engine]
dependency_graph:
  requires: []
  provides: [normative_ranges_table, normative_versions_table, db_ranges_query_layer, rating_engine_db_overrides]
  affects: [ratings.ts, schema-sqlite.ts, schema.ts, index.ts, normative.ts]
tech_stack:
  added: [normative_ranges table, normative_versions table, db-ranges.ts query module]
  patterns: [DB-first-with-fallback, pre-loaded batch queries, variant matching]
key_files:
  created:
    - src/lib/normative/db-ranges.ts
  modified:
    - src/lib/db/schema-sqlite.ts
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - src/types/normative.ts
    - src/lib/normative/ratings.ts
decisions:
  - "Keep original getStandards/getPeak360Rating unchanged for backwards compatibility"
  - "Use variant matching pattern (exact gender+ageGroup > gender-only > unisex) for DB range lookups"
  - "Pre-load all DB ranges into a Map to avoid N+1 queries during report generation"
metrics:
  duration: 2m 34s
  completed: "2026-03-30T22:13:52Z"
---

# Phase 03 Plan 01: Normative DB Schema and Query Layer Summary

DB schema for normative ranges with CRUD query layer and rating engine extensions using DB-first-with-hardcoded-fallback pattern.

## What Was Done

### Task 1: Create normative_ranges and normative_versions DB tables with migration SQL
- Added `normativeRanges` and `normativeVersions` table definitions to both SQLite (`schema-sqlite.ts`) and PostgreSQL (`schema.ts`) schemas
- Added `normativeVersionId` column to `assessments` table in both schemas for version pinning
- Added migration SQL to `runMigrations()` in `index.ts` for both database backends
- SQLite ALTER TABLE wrapped in try/catch since it does not support IF NOT EXISTS for columns
- Added `NormativeRangeRow`, `NormativeVersionSnapshot`, `NormativeVersionMarker`, and `NormativeVersionVariant` type definitions to `normative.ts`

### Task 2: Build DB query layer and refactor rating engine
- Created `db-ranges.ts` with full CRUD: `getDbStandards`, `getAllDbRanges`, `getDbRangesByTestKey`, `upsertDbRange`, `deleteDbRange`
- Added `preloadDbRanges()` for batch-loading all ranges into a `DbRangesMap` to avoid N+1 during report generation
- Added `getStandardsWithOverrides()` to ratings.ts: checks DB ranges first, falls back to hardcoded data.ts
- Added `getStandardsFromSnapshot()` to ratings.ts: resolves standards from a versioned snapshot JSON, falls back to hardcoded
- Original `getStandards()` and `getPeak360Rating()` remain completely unchanged for backwards compatibility

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 30a863b | feat(03-01): add normative_ranges and normative_versions DB tables with migration SQL |
| 2 | c924647 | feat(03-01): build DB query layer and extend rating engine with DB-first-with-fallback |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functions are fully implemented with real logic.

## Verification Results

- TypeScript compilation: PASSED (no new errors; pre-existing test file type errors unrelated to changes)
- Normative tests: ALL 41 PASSED (ratings, data, insights)
- Schema verification: All new exports confirmed present in schema files
- Type verification: All new types confirmed exported from normative.ts
