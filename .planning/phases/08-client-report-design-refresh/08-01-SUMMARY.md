---
phase: 08-client-report-design-refresh
plan: 01
subsystem: db-schema
tags: [drizzle, migrations, schema, audit, pillars, foundation]
dependency_graph:
  requires:
    - "src/lib/db/schema.ts (pre-existing assessments, audit_logs tables)"
    - "src/lib/db/schema-sqlite.ts (pre-existing assessments, audit_logs tables)"
    - "src/lib/db/index.ts (runMigrations dual-dialect pattern)"
    - "src/lib/audit.ts (AuditAction union, logAuditEvent)"
  provides:
    - "pillarDefinitions table (PK pillar_key) — 5 rows seeded"
    - "pillarPageCopy table (single-row, auto-increment id) — 1 row seeded"
    - "pillarPrescriptions table (composite PK assessment_id + pillar_key, FK CASCADE)"
    - "AuditAction union extended with 4 Phase 8 literals"
    - "runMigrations idempotent for both dialects"
  affects:
    - "Plans 08-02 through 08-05 (read/write the new tables, log the new audit actions)"
tech_stack:
  added: []
  patterns:
    - "Drizzle composite PK via `(t) => ({ pk: primaryKey({ columns: [...] }) })`"
    - "Idempotent seed: ON CONFLICT DO NOTHING (pg) / INSERT OR IGNORE (sqlite) / WHERE NOT EXISTS (single-row)"
    - "Paired dual-dialect schema files (schema.ts + schema-sqlite.ts) with dialect-correct JSON columns (jsonb vs text mode:json)"
key_files:
  created:
    - "drizzle-sqlite/0000_whole_makkari.sql"
    - "drizzle-sqlite/meta/0000_snapshot.json"
    - "drizzle-sqlite/meta/_journal.json"
  modified:
    - "src/lib/db/schema.ts"
    - "src/lib/db/schema-sqlite.ts"
    - "src/lib/db/index.ts"
    - "src/lib/audit.ts"
decisions:
  - "Adopted single-row table approach for pillar_page_copy (D-19) over sentinel-row for cleaner read paths"
  - "All seed rows use updated_by='system' and a single Date.now() timestamp shared across the 5 pillar inserts + 1 page-copy insert per branch"
  - "Composite PK declared in BOTH the Drizzle table builder AND the raw runMigrations SQL so db:push and the boot-time CREATE TABLE IF NOT EXISTS path stay coherent"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-09"
  tasks: 4
  commits: 4
---

# Phase 8 Plan 01: Schema Foundation — Pillar Tables + Audit Extension Summary

Three new tables (`pillar_definitions`, `pillar_page_copy`, `pillar_prescriptions`) added to BOTH Drizzle dialect schemas with mirrored definitions, an idempotent seed for the 5 pillar definitions and 1 page-copy row wired into `runMigrations()` for both dialects, and the `AuditAction` union extended with 4 Phase 8 literals — locking Pitfalls #3 (composite PK) and #6 (dual-dialect drift) at the source.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add 3 pillar tables to both Drizzle dialect schemas | 97cbbf1 | src/lib/db/schema.ts, src/lib/db/schema-sqlite.ts |
| 2 | Extend AuditAction union with 4 Phase 8 literals | f506d88 | src/lib/audit.ts |
| 3 | runMigrations CREATE TABLE IF NOT EXISTS + idempotent seed (both dialects) | 3c75fbc | src/lib/db/index.ts |
| 4 | Generate migration + db:push + verify seed (idempotency confirmed) | b5f7c4a | drizzle-sqlite/0000_whole_makkari.sql + meta |

## Verification Output

Local sqlite verification (run twice — second run identical, confirming idempotency):
```
{"defsCount":5,"pcCount":1,"keys":["balance","bodyComposition","cardiometabolic","strength","vo2"]}
```

Plan-level verification gates:
- `OK_SCHEMA_PAIRED` — all 6 schema grep gates pass (3 tables × 2 dialects)
- `OK_AUDIT` — all 4 new audit literals present, all 8 prior literals preserved
- `OK_MIGRATION_PAIRED` — `CREATE TABLE IF NOT EXISTS "pillar_definitions"` count = 2; composite PK count = 2
- `OK_TYPECHECK` — no NEW TypeScript errors in `src/lib/db/schema.ts`, `src/lib/db/schema-sqlite.ts`, `src/lib/db/index.ts`, or `src/lib/audit.ts` (pre-existing test errors in `src/__tests__/store/assessment-store.test.ts` were already failing before this plan and are out of scope per the deviation rule's scope boundary)

## Migration Artifact

`drizzle-sqlite/0000_whole_makkari.sql` is the drizzle-kit-generated migration. Inspected:
- Contains `CREATE TABLE` for `pillar_definitions`, `pillar_page_copy`, `pillar_prescriptions`
- `pillar_prescriptions` declares `PRIMARY KEY(\`assessment_id\`, \`pillar_key\`)` and `FOREIGN KEY ... ON DELETE cascade`
- No DROP/ALTER on pre-existing tables — purely additive

## Production Deploy Note

> **Action required before deploying any code that reads/writes these tables:** the maintainer must run `scripts/db-push.sh` against production Postgres (per MEMORY.md: deployment & DB push reference). The runMigrations boot-time path will create the tables if absent and seed them idempotently, but executing the schema push out-of-band ensures the deploy doesn't race with the first request.

## Deviations from Plan

None. Plan executed exactly as written:
- All four tasks matched the plan's `<action>` blocks verbatim
- All grep gates and acceptance criteria passed on first attempt
- Idempotency verification produced expected `{defsCount:5, pcCount:1}` on both first and second run
- No bugs, no missing critical functionality, no blockers, no architectural changes

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/lib/db/schema.ts (modified)
- FOUND: src/lib/db/schema-sqlite.ts (modified)
- FOUND: src/lib/db/index.ts (modified)
- FOUND: src/lib/audit.ts (modified)
- FOUND: drizzle-sqlite/0000_whole_makkari.sql
- FOUND: drizzle-sqlite/meta/0000_snapshot.json
- FOUND: drizzle-sqlite/meta/_journal.json

Commits verified to exist:
- FOUND: 97cbbf1 (Task 1 — schema tables)
- FOUND: f506d88 (Task 2 — audit union)
- FOUND: 3c75fbc (Task 3 — runMigrations + idempotent seed)
- FOUND: b5f7c4a (Task 4 — generated migration + db:push verified)
