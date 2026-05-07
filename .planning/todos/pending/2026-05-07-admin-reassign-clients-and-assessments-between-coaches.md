---
created: 2026-05-07T00:42:00.000Z
title: Admin reassign clients/assessments between coaches
area: auth
files:
  - src/app/portal/admin/
  - src/app/api/assessments/route.ts
  - src/app/api/assessments/[id]/route.ts
  - src/lib/db/schema.ts
---

## Problem

Admins have no in-app way to move a client (and that client's assessments) from one coach to another. Today this requires raw SQL — `UPDATE assessments SET coach_id = '<new coach user.id>' WHERE coach_id = '<old coach user.id>' AND client_id = '<client user.id>'` (or similar by-client filter), which is unsafe to expose to non-engineers and leaves no audit trail.

Operational triggers we already know about:
- Coach leaves the practice → their book of clients needs to reassign to other coaches.
- Client switches coach → only their assessments should move, not the entire roster.
- Single assessment exception (e.g. coach was off, a colleague did the test) → just one row reassigns.

The DB is already shaped for this — `assessments.coach_id` is the single source of truth — so this is a UX/API task, not a schema task.

## Solution

Suggested approach (TBD — needs phase planning):

- **API surface:**
  - `PATCH /api/assessments/[id]` accepts `{ coach_id }` when caller is admin. Already partially exists (used for client-info edits) — extend with admin-only ownership change.
  - New `POST /api/admin/clients/[clientId]/transfer` body `{ to_coach_id }` — bulk-moves all assessments belonging to that client to the new coach in a single transaction.
  - New `POST /api/admin/coaches/[fromCoachId]/transfer-all` body `{ to_coach_id }` — wholesale book transfer when a coach offboards.
  - Each operation writes to `audit_logs` (table already exists per earlier DB inspection) so we can answer "who moved which client when".

- **UI:**
  - In the new admin user-management area (other todo), each user row exposes "Reassign…" button.
  - Coach drill-down shows their clients + assessments with checkboxes → "Move selected to coach…" picker.
  - Single-assessment edit page (admin view) shows the current coach with an inline "Change coach…" picker.

- **Safety:**
  - Pre-flight modal showing exactly which rows will move + count + "irreversible without re-running" warning.
  - Disallow self-assignment loops or moves to non-coach roles (admin/coach OK; client must not become a coach_id target).
  - Wrap each multi-row move in a `BEGIN/COMMIT` and rollback on any single-row update failure.

Cross-references:
- Pairs with `2026-05-07-add-password-reset-account-management-and-admin-invitations.md` — both should land in the same Phase 7 (multi-tenant-auth-ux) batch since they share the admin user-management UI.
- Built on the legacy bulk-assign operation we just ran today (assigning the 18 null-coach assessments to the seed admin) — that was the manual one-shot version of this feature.
- Better-auth's `admin` plugin (already in `src/lib/auth.ts:50-53`) gates these endpoints; reuse rather than re-roll.
