---
phase: 11-report-marker-detail-coach-insights
plan: 01
subsystem: database
tags: [postgres, drizzle, sqlite, seed, audit, marker-content]

requires:
  - phase: 08-client-report-design-refresh
    provides: pillar_definitions global-content ownership model + idempotent seed pattern cloned here
provides:
  - marker_content Postgres table (test_key PK, definition, impact, coach_insights jsonb, updated_by, updated_at)
  - MarkerContent interface + getAllMarkerContent + getMarkerContentByKey read queries
  - SEED_MARKER_CONTENT covering all 97 REPORT_MARKERS (definition + impact + 5-tier x male/female matrix)
  - idempotent CREATE TABLE + insert-if-absent seed wired into runMigrations() (Postgres + SQLite branches)
  - 'marker_content.update' AuditAction member
  - live Postgres marker_content table seeded with 97 rows
affects: [11-02-api-marker-content, 11-03-admin-authoring-ui, 11-04-report-detail-panel]

tech-stack:
  added: []
  patterns:
    - "Global admin-authored content table keyed by REPORT_MARKERS testKey (mirrors pillar_definitions)"
    - "Idempotent insert-if-absent seed in runMigrations (ON CONFLICT DO NOTHING / INSERT OR IGNORE) — never DO UPDATE so admin edits survive"

key-files:
  created:
    - src/lib/marker-content/queries.ts
    - src/lib/marker-content/seed-content.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/audit.ts
    - src/lib/db/index.ts

key-decisions:
  - "Used runMigrations() (CREATE TABLE IF NOT EXISTS + idempotent seed) to apply the live Postgres table instead of `drizzle-kit push` — surgical (only touches marker_content), avoiding any risk of push attempting broader ALTERs against the live DB after 10 phases of schema evolution. Same end state the checkpoint required."
  - "97 markers seeded (REPORT_MARKERS length), not ~98 as the plan estimated"
  - "coach_insights stored as jsonb (Postgres) / text JSON (SQLite); insert-if-absent per test_key keeps admin edits durable across re-seeds (D-09)"

patterns-established:
  - "Marker content read layer mirrors src/lib/pillars/queries.ts row-map pattern"
  - "Seed content is research-informed editable defaults; tone is consumer-friendly with no fabricated numeric thresholds (D-14)"

requirements-completed: [D-07, D-08, D-09, D-11]

duration: ~30min
completed: 2026-05-26
---

# Phase 11 Plan 01: Marker content data foundation — Summary

**The `marker_content` table is live in Postgres with 97 fully-authored marker rows (definition + impact + 5-tier × male/female coach insights), backed by an idempotent seed and a typed read layer that every downstream report/admin plan consumes.**

## Performance

- **Tasks:** 3 (2 auto + 1 blocking human-verify checkpoint)
- **Completed:** 2026-05-26
- **Files modified:** 5 (2 created, 3 modified)
- **Note:** The first executor was interrupted (socket close) mid-Task-2; a fresh continuation agent completed Task 2 and stopped at the checkpoint. Task 1 was never re-done.

## Accomplishments
- New `marker_content` Drizzle `pgTable` (D-08) with the exact contract: `test_key` PK, nullable `definition`/`impact`, `coach_insights` jsonb, `updated_by` notNull, `updated_at` integer epoch ms.
- `SEED_MARKER_CONTENT` authored for **all 97** REPORT_MARKERS — every entry has non-empty definition, non-empty impact, and all 5 tiers × {male, female} (verified: `OK: all 97 markers fully seeded`).
- Idempotent table-create + insert-if-absent seed wired into `runMigrations()` for **both** Postgres (`ON CONFLICT ("test_key") DO NOTHING`) and SQLite (`INSERT OR IGNORE`) branches — no `DO UPDATE`, so admin edits are never clobbered (D-09 / threat T-11-01).
- `MarkerContent` interface + `getAllMarkerContent()` + `getMarkerContentByKey()` read queries (mirror `pillars/queries.ts`).
- `'marker_content.update'` added to the `AuditAction` union (D-11).
- **Live DB applied + verified:** `SELECT count(*) FROM marker_content` = 97, all rows with non-null definition + coach_insights; a second migration run left the count unchanged (idempotency proven).

## Task Commits

1. **Task 1: Add marker_content schema, MarkerContent queries, and audit action** — `c3d9c30` (feat)
2. **Task 2: Author researched seed for all REPORT_MARKERS + idempotent runMigrations seed** — `881d269` (feat)
3. **Task 3: [BLOCKING] Apply marker_content to live Postgres** — checkpoint (no code commit). Applied via `runMigrations()` against `Jaces-Mac-mini.local` Postgres; 97 rows seeded; idempotency re-verified. Approved by user.

## Files Created/Modified
- `src/lib/db/schema.ts` — added `markerContent` pgTable (D-08).
- `src/lib/marker-content/queries.ts` — `MarkerContent` type + `getAllMarkerContent` + `getMarkerContentByKey`.
- `src/lib/marker-content/seed-content.ts` — `SEED_MARKER_CONTENT` for all 97 markers.
- `src/lib/db/index.ts` — `CREATE TABLE IF NOT EXISTS "marker_content"` + idempotent seed in `runMigrations()` (both DB branches).
- `src/lib/audit.ts` — `'marker_content.update'` AuditAction.

## Deviations
- **`drizzle-kit push` → `runMigrations()`:** The plan/checkpoint named `db:generate` + `db:push`. Used the project's own runtime migration path instead (surgical CREATE TABLE IF NOT EXISTS + idempotent seed), avoiding the risk of push attempting broader schema reconciliation against the live DB. End state is identical to what the checkpoint required and is what happens on normal app boot.
- **DB reachability:** The dev Postgres host (`Jaces-Mac-mini.local`) was initially asleep/off-LAN; the push proceeded once the user woke it (IP had changed to 192.168.68.10, but the mDNS hostname re-resolved so no DATABASE_URL change was needed).

## Self-Check: PASSED
- tsc: no errors in marker-content / seed-content / db/index files (pre-existing `__tests__` noise out of scope).
- Seed completeness script: `OK: all 97 markers fully seeded`.
- Live Postgres: 97 rows, non-null definition + coach_insights, idempotent on re-run.
