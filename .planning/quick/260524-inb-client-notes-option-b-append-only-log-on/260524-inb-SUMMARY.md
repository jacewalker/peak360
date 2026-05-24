---
phase: quick-260524-inb
plan: 01
subsystem: client-notes
tags: [notes, client-page, api, schema, drizzle]
requires:
  - requireSession / role model (auth-helpers)
  - assessments table (coachId, clientName) for coach scoping
provides:
  - client_notes table (pg + sqlite) + idempotent migrations
  - GET/POST /api/client-notes (role-scoped)
  - Notes tab on /portal/clients/[name]
affects:
  - src/lib/db/schema.ts
  - src/lib/db/schema-sqlite.ts
  - src/lib/db/index.ts
  - src/app/api/client-notes/route.ts
  - src/app/portal/clients/[name]/page.tsx
tech-stack:
  added: []
  patterns:
    - "Append-only log keyed by client_name with denormalized author attribution"
    - "Role-scoped API mirroring /api/assessments (admin/coach/client)"
key-files:
  created:
    - src/app/api/client-notes/route.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/db/schema-sqlite.ts
    - src/lib/db/index.ts
    - src/app/portal/clients/[name]/page.tsx
decisions:
  - "Notes keyed by client NAME (no client user row); append-only, no edit/delete in v1"
  - "Author attribution denormalized (author_id + author_name) captured at write time"
  - "Coach access scoped to client names appearing in the coach's own assessments; client role 403"
metrics:
  tasks_completed: 3
  tasks_total: 4
  files_created: 1
  files_modified: 4
  completed_date: 2026-05-24
---

# Quick 260524-inb: Client Notes (Append-Only Log) on the Client Page Summary

Append-only client-notes log keyed by client name — a new `client_notes` table (Postgres + SQLite with idempotent migrations), a role-scoped `/api/client-notes` GET/POST route, and a Notes tab on the client detail page where coaches/admins add timestamped, attributed notes and view history newest-first.

## What Was Built

### Task 1 — `client_notes` table (schema + migrations) — commit `c8cddb7`
- `src/lib/db/schema.ts`: added `clientNotes` pgTable (`id` PK, `client_name`, `author_id`, `author_name`, `body`, `created_at` — all `notNull`).
- `src/lib/db/schema-sqlite.ts`: mirrored as `clientNotes` sqliteTable with identical columns/types.
- `src/lib/db/index.ts`: idempotent `CREATE TABLE IF NOT EXISTS "client_notes"` + `CREATE INDEX IF NOT EXISTS idx_client_notes_client_name` in BOTH the Postgres (`d.execute`) and SQLite (`d.run`) branches. The dev server applies this on next app boot via `runMigrations` (no `db:push` needed).

### Task 2 — `/api/client-notes` route — commit `7c195fe`
- New `src/app/api/client-notes/route.ts` mirroring `/api/assessments` auth conventions.
- `canAccess(session, clientName)`: admin → true; coach → true iff an `assessments` row exists with that `clientName` AND `coachId === session.user.id`; else false.
- **GET** `?client=<name>`: `requireSession` → `client` role 403 → missing `client` 400 → `!canAccess` 403 → returns notes `where clientName = client` ordered `desc(createdAt)` as `{ success: true, data }`.
- **POST** `{ client, body }`: `requireSession` → `client` role 403 → empty `client` 400 → empty trimmed `body` 400 → `!canAccess` 403 → inserts `{ id: uuid(), clientName, authorId, authorName, body: trimmed, createdAt: ISO }`, returns the new note with status 201.

### Task 3 — Notes tab on the client detail page — commit `0e9bcfe`
- `src/app/portal/clients/[name]/page.tsx`: tab union extended to `'assessments' | 'trends' | 'notes'`; added a third "Notes" tab button matching the existing active-state styling.
- State: `notes`, `notesLoading`, `notesLoaded` (lazy-load guard), `noteBody`, `notesSaving`.
- Lazy-loads notes via `GET /api/client-notes?client=<encoded>` the first time the Notes tab opens.
- Add form: `<textarea>` bound to `noteBody` + "Add note" button (disabled while empty/saving). On success, prepends the returned note and clears the textarea.
- History list: each entry shows `authorName` + en-AU `toLocaleString` date/time, body with `whitespace-pre-wrap`, newest first. Handles loading and "No notes yet." empty states. Uses existing tokens (`bg-bg-3`, `border-line`, `text-text/-dim/-faint`, `gold-brand`, `MonoEyebrow`).

## Verification Results

- `npx tsc --noEmit`: **no errors in any changed/new file** (schema.ts, schema-sqlite.ts, index.ts, api/client-notes/route.ts, clients/[name]/page.tsx). Pre-existing errors exist only in `src/__tests__/*` (test setup `vi` globals, type-cast assertions) — unrelated to this work and out of scope.
- `npx eslint src/app/api/client-notes/route.ts`: **clean**.
- `npx eslint "src/app/portal/clients/[name]/page.tsx"`: **clean**.
- Self-check: all 5 files present; all 3 commits present in git log.

## Deviations from Plan

None — plan executed exactly as written. The main render block was changed from a nested `tab === 'assessments' ? (...) : (...)` ternary to three independent `tab === '...' && (...)` blocks to cleanly accommodate the third tab; behavior for the existing two tabs is unchanged.

## Task 4 — Human Verification Checkpoint (NOT executed)

Per plan (`autonomous: false`), execution stops here. A dev server is already running against remote Postgres; the `client_notes` table is created on its next app boot by `runMigrations` (no `db:push`). Verify manually:

1. Sign in as a coach or admin and open a client detail page: `/portal/clients/<name>` (a client the coach has at least one assessment for).
2. Click the **Notes** tab.
3. Confirm the "Add note" button is **disabled** when the textarea is empty.
4. Type a note and click **Add note** → it appears at the top of the history list with your name + an en-AU timestamp.
5. **Reload** the page, reopen the Notes tab → the note is still there (persisted).
6. (Optional) Confirm a coach gets 403 / no access for a client name not in their own assessments, and a `client`-role user cannot reach notes.

## Known Stubs

None.

## Self-Check: PASSED
- FOUND: src/lib/db/schema.ts, src/lib/db/schema-sqlite.ts, src/lib/db/index.ts, src/app/api/client-notes/route.ts, src/app/portal/clients/[name]/page.tsx
- FOUND commits: c8cddb7, 7c195fe, 0e9bcfe
