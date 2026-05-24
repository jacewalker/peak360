---
phase: quick-260524-inb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/db/schema.ts
  - src/lib/db/schema-sqlite.ts
  - src/lib/db/index.ts
  - src/app/api/client-notes/route.ts
  - src/app/portal/clients/[name]/page.tsx
autonomous: false
requirements:
  - INB-01  # Append-only client_notes store keyed by client name (pg + sqlite)
  - INB-02  # API to list + add client notes (admin/coach, role-scoped)
  - INB-03  # Notes tab on the client page: add a note + see timestamped, attributed history
must_haves:
  truths:
    - "A client_notes table exists in both the Postgres and SQLite schemas + idempotent migrations"
    - "GET /api/client-notes?client=<name> returns that client's notes newest-first; POST adds a note attributed to the signed-in user"
    - "The client detail page (/portal/clients/[name]) has a Notes tab where a coach/admin can add a note"
    - "Added notes appear in a history list with author name + timestamp, newest first, and persist across reload"
    - "Notes are append-only (no edit/delete in v1); empty notes are rejected"
  artifacts:
    - path: "src/app/api/client-notes/route.ts"
      provides: "GET (list) + POST (add) client notes, role-scoped"
      contains: "client_notes"
    - path: "src/app/portal/clients/[name]/page.tsx"
      provides: "Notes tab with add form + history list"
      contains: "Notes"
  key_links:
    - from: "src/app/portal/clients/[name]/page.tsx"
      to: "/api/client-notes"
      via: "GET on Notes tab open, POST on add"
      pattern: "client-notes"
    - from: "src/app/api/client-notes/route.ts"
      to: "client_notes table"
      via: "drizzle insert/select via schema"
      pattern: "clientNotes"
---

# Quick 260524-inb — Client notes (append-only log) on the client page

## Decisions (locked by user)

- **Option B** = append-only notes **log** (timestamped, attributed entries), NOT a single editable field.
- UI lives on the **client detail page** `/portal/clients/[name]` — add a note AND see history there.
- Clients are **name-based** in this app (the client page aggregates by `clientName`; there is no client `user` row for them). Therefore notes MUST be keyed by **client name**, not `user_id`.

## Design decisions (resolved — implement as written)

- Table `client_notes`, keyed by `client_name` (text). Append-only; no edit/delete in v1.
- Author attribution is **denormalized** at write time (`author_id` + `author_name`) so the history renders without a join and survives later name changes as "who wrote it then".
- Auth/scoping (mirror existing role-scoping in `/api/assessments`):
  - `admin` → may read/add notes for ANY client name.
  - `coach` → may read/add notes ONLY for client names that appear in at least one of THEIR OWN assessments (`assessments.coachId === session.user.id`). Otherwise 403.
  - `client` role → 403 (the client page is a coach/admin tool; notes are not exposed to clients).
- All API handlers gate on `requireSession()` first (returns `[session, errorRes]`).

## Tasks

### Task 1 — Add the `client_notes` table (schema + migrations)

**Files:** `src/lib/db/schema.ts`, `src/lib/db/schema-sqlite.ts`, `src/lib/db/index.ts`

**Action:**
1. `src/lib/db/schema.ts` (Postgres / drizzle pgTable) — add:
   ```ts
   export const clientNotes = pgTable('client_notes', {
     id: text('id').primaryKey(),
     clientName: text('client_name').notNull(),
     authorId: text('author_id').notNull(),
     authorName: text('author_name').notNull(),
     body: text('body').notNull(),
     createdAt: text('created_at').notNull(),
   });
   ```
2. `src/lib/db/schema-sqlite.ts` — mirror with the sqlite table builder used by the other tables in that file (same columns/types; `id` text PK).
3. `src/lib/db/index.ts` — add an idempotent `CREATE TABLE IF NOT EXISTS "client_notes" (...)` in BOTH branches:
   - Postgres branch: place it alongside the other `CREATE TABLE IF NOT EXISTS` statements (e.g. just before the Phase 8 pillar block ~L238 or after it ~L297, inside the `if (isPostgres)` body). Add `CREATE INDEX IF NOT EXISTS "idx_client_notes_client_name" ON "client_notes" ("client_name")`.
   - SQLite branch (the `} else {` body): same table + index using `d.run(sql\`...\`)` like the neighbouring tables.
   Columns: `id text PK NOT NULL, client_name text NOT NULL, author_id text NOT NULL, author_name text NOT NULL, body text NOT NULL, created_at text NOT NULL`.

**Verify:** `npx tsc --noEmit` clean for the schema files.

### Task 2 — `/api/client-notes` route (GET list + POST add)

**File:** `src/app/api/client-notes/route.ts` (new)

**Action:** Follow the conventions in `src/app/api/assessments/route.ts`.
- Import `db`, the `clientNotes` + `assessments` tables from `@/lib/db/schema`, drizzle `eq`/`and`/`desc`, `uuid`, and `requireSession` from `@/lib/auth-helpers`.
- Helper `canAccess(session, clientName)`: admin → true; coach → true iff a `assessments` row exists with `clientName === name AND coachId === session.user.id`; else false.
- **GET**: read `client` from `request.nextUrl.searchParams` (or `new URL(request.url)`). `requireSession`; if role === 'client' → 403; if `!client` → 400; if `!canAccess` → 403. Return notes `where eq(clientNotes.clientName, name)` ordered `desc(clientNotes.createdAt)` → `{ success: true, data: rows }`.
- **POST**: body `{ client, body }`. `requireSession`; role === 'client' → 403; validate `client` non-empty and `body` (trimmed) non-empty (else 400); `canAccess` else 403. Insert `{ id: uuid(), clientName: client, authorId: session.user.id, authorName: session.user.name, body: body.trim(), createdAt: new Date().toISOString() }`. Return `{ success: true, data: <the new note> }`, status 201.

**Verify:** `npx tsc --noEmit` clean; `npx eslint` clean on the new file.

### Task 3 — Notes tab on the client detail page

**File:** `src/app/portal/clients/[name]/page.tsx`

**Action:**
- Extend the existing tab state union from `'assessments' | 'trends'` to also include `'notes'`. Add a third tab button **"Notes"** next to "Trends & Analytics" (same styling/active-state pattern).
- State: `notes` (array), `notesLoading`, `noteBody` (textarea), `notesSaving`.
- Fetch: when the Notes tab is first opened (or on load), `GET /api/client-notes?client=${encodeURIComponent(clientName)}` and store the rows. Handle loading + empty ("No notes yet.") states.
- Add form (top of the Notes tab): a `<textarea>` bound to `noteBody` + an "Add note" button (disabled while empty or saving). On submit: `POST /api/client-notes` with `{ client: clientName, body: noteBody }`; on success prepend the returned note to the list and clear the textarea.
- History list (below the form): each entry shows author name + formatted date/time (use the same `toLocaleDateString`/`en-AU` style already in the file), then the note body (preserve line breaks, e.g. `whitespace-pre-wrap`). Newest first.
- Use existing tokens/components (bg-bg-3, border-line, text-text/-dim/-faint, gold-brand, MonoEyebrow where it fits). Match the visual language of the Assessments tab.

**Verify:** `npx tsc --noEmit` clean; `npx eslint` clean on the file.

### Task 4 — Human verification checkpoint

Coach/admin session on the running dev server: open a client page → Notes tab → add a note → it appears in history with author + timestamp → reload → still there. Confirm the add button is disabled when empty.

## Out of scope

- No edit/delete of notes (append-only v1).
- No notes on the admin People page (superseded — user chose the client page).
- No exposure of notes to client-role users.
- No DB destructive migration (additive table only); existing assessments unaffected.

## Conventions

Follow `CLAUDE.md`: `'use client'` for the page, `@/` imports, `import type`,
camelCase, NextResponse JSON `{ success, data?, error? }`, navy/gold tokens.
Mirror `/api/assessments/route.ts` for auth + role-scoping patterns.
