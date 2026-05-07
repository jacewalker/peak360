---
phase: 07-multi-tenant-auth-ux
plan: 07
subsystem: admin-portal
tags: [admin, users, role-change, audit-log, banned]
requires:
  - phase 07-06 (StatusPill primitive — extended here with 'banned' variant)
  - src/lib/auth-helpers (requireAdmin)
  - src/lib/audit (logAuditEvent + getRequestContext)
  - Better Auth admin plugin (auth.api.setRole)
provides:
  - GET  /api/admin/users — admin user list with banned + last-active + assessment counts
  - POST /api/admin/users/[userId]/role — role mutation with last-admin guard + post-check rollback
  - /portal/admin/users — admin user-management page
  - <RolePill role="admin|coach|client" /> — UI primitive (UI-SPEC §Color)
  - <Toast variant="success|error" message onDismiss /> — hand-rolled toast (UI-SPEC §Component Inventory)
  - <StatusPill status="banned" /> — banned indicator variant
  - AuditAction extended with 'user.role.changed' and 'user.role.rollback'
affects:
  - src/lib/audit.ts (AuditAction union — additive)
  - src/components/ui/StatusPill.tsx (status union — additive)
tech-stack:
  added: []
  patterns:
    - last-admin guard (pre-check + setRole + post-check rollback)
    - audit-log fire-and-forget
    - client-side admin gating with server source-of-truth
    - hand-rolled toast over library import
key-files:
  created:
    - src/app/api/admin/users/route.ts
    - src/app/api/admin/users/[userId]/role/route.ts
    - src/app/portal/admin/users/page.tsx
    - src/components/ui/RolePill.tsx
    - src/components/ui/Toast.tsx
  modified:
    - src/lib/audit.ts
    - src/components/ui/StatusPill.tsx
decisions:
  - D-21: 4-step role-change handler (auth gate, last-admin pre-check with verbatim error copy, setRole, audit log)
  - D-22: UI disables only-admin row's <select> with verbatim tooltip; defence-in-depth (server is source of truth per D-11)
  - Warning 6 fix: post-check rollback path closes the concurrent-demotion TOCTOU race window; emits 409 + audit row 'user.role.rollback'
  - BLOCKER 1 fix: REQ-7.10 banned-status surfacing wired end-to-end (DB → API → page → StatusPill)
metrics:
  tasks: 3
  files-created: 5
  files-modified: 2
  duration: ~30 minutes
  completed: 2026-05-07
---

# Phase 7 Plan 7: Admin User Management Surface Summary

End-to-end admin user-management page (`/portal/admin/users`) with a role list endpoint, role-mutation endpoint with race-safe last-admin guard, and the supporting `RolePill` / `Toast` / `StatusPill` primitives — closing 07-SPEC REQ-7.10 (read + role edit + last-admin guard + drill-down + banned status surfacing).

## What Shipped

### API

- **`GET /api/admin/users`** (`src/app/api/admin/users/route.ts`) — admin-only list endpoint. Selects every user with `id, email, name, role, banned, banReason, banExpires, createdAt, lastActive, coachCount, clientCount`. `lastActive` is computed via subquery on `session.createdAt`; per-user assessment counts are computed via subqueries on `assessments.coachId` and `assessments.clientId`. Returns `{ success: true, data: AdminUserRow[] }`.
- **`POST /api/admin/users/[userId]/role`** (`src/app/api/admin/users/[userId]/role/route.ts`) — role mutation handler. Implements D-21:
  1. `requireAdmin()` (server source of truth per D-11)
  2. Whitelist-validate `role ∈ {admin, coach, client}` from JSON body
  3. Look up target user
  4. **Last-admin pre-check**: if old role is `'admin'` and new role is not, count remaining admins; if `<= 1`, return HTTP 400 with the verbatim copy `Cannot change the role of the only admin. Promote another user to admin first.`
  5. Call `auth.api.setRole(...)` (Better Auth admin plugin)
  6. **Post-check rollback (warning 6 fix)** — re-count admins after `setRole`. If a concurrent admin demotion left the system at zero admins, call `setRole` again to restore the just-demoted user, write an `audit_logs` row with `action='user.role.rollback'` and `metadata.reason='last-admin-race'`, and return HTTP 409.
  7. On the happy path, write an `audit_logs` row with `action='user.role.changed'` and `metadata={ from, to }`.

### UI

- **`/portal/admin/users` page** (`src/app/portal/admin/users/page.tsx`) — `'use client'` page with:
  - Hero header mirroring `/portal/admin` shell (font-semibold per UI-SPEC 2-weight contract; eyebrow `User management`, H1 `Users`, sub-heading `Manage roles for everyone with portal access.`)
  - Desktop table (`hidden md:block`) and mobile card list (`md:hidden`) sharing the same data source
  - Columns: `Name`, `Email`, `Role`, `Status` (banned indicator), `Joined`, `Last active`, `Assessments`
  - Inline `<select>` per row with `disabled` + `title` tooltip on the only-admin row (D-22)
  - Drill-down `View N assessment(s)` toggling an inline expandable row showing coach/client counts split
  - Toast on success (`Role updated for {name}.`) and error (`Couldn't update the role. Try again.`)
  - 409 race branch refetches the user list and shows the rollback-specific toast: `Couldn't update the role — another admin change happened simultaneously. The previous role was restored. Try again.`
  - `Never signed in` italic null state for users with no session history
  - Client-side admin gate via `authClient.useSession()` redirects non-admins to `/portal` (D-10 defence-in-depth)
- **`<RolePill role="admin|coach|client" />`** (`src/components/ui/RolePill.tsx`) — UI-SPEC §Color §Role-pill colors verbatim: admin=navy, coach=slate, client=white/muted. No gold (reserved per UI-SPEC §Color).
- **`<Toast variant="success|error" message onDismiss />`** (`src/components/ui/Toast.tsx`) — hand-rolled per UI-SPEC §Component Inventory ("Do NOT install a toast library for two toasts"). Fixed bottom-right, 3s auto-dismiss, `border-l-4 border-gold` for success / `border-l-4 border-red-500` for error, `role="status"` / `role="alert"` for a11y.
- **`<StatusPill status="banned" />`** — extended `src/components/ui/StatusPill.tsx`'s status union with `'banned'`. Visual: `bg-red-50 text-red-700 border border-red-200` + small red dot.

### Audit / Types

- **`src/lib/audit.ts`** — `AuditAction` union extended with both `'user.role.changed'` AND `'user.role.rollback'`.

## Threat Mitigations Applied

| Threat | Disposition | Where mitigated |
|--------|-------------|-----------------|
| T-07-27 — Coach calls POST `.../role` to self-promote | mitigate | `requireAdmin()` returns 403 |
| T-07-28 — Last-admin lockout via concurrent demotion race | **mitigate** (was: accept) | Post-check rollback path in role/route.ts: re-count admins after `setRole`, roll back via second `setRole` + audit `user.role.rollback` + 409 |
| T-07-29 — DevTools tampering bypasses UI disable | mitigate | Server-side last-admin pre-check is source of truth (D-11); UI disable is defence-in-depth |
| T-07-30 — Role change without paper trail | mitigate | `logAuditEvent` writes `user.role.changed` with `{from, to}` + ip + UA on success; `user.role.rollback` on race |
| T-07-31 — Body spoofing | mitigate | `requireAdmin()` first, body-null-safe parse, `role` whitelist-checked |
| T-07-32 — `/api/admin/users` list leak | mitigate | `requireAdmin()` returns 403 |
| T-07-33 — Audit log silent failure | accept (by design) | `logAuditEvent` is fire-and-forget per `src/lib/audit.ts:35-38` |
| T-07-44 — Stale banned indicator | accept (read-only this phase) | Refetch on mount + after each role change; ban/unban actions deferred |

## Acceptance Criteria — Status

All `must_haves.truths` from the plan are observable:

- `/portal/admin/users` renders email, name, role, banned, joined-at, last-active, assessment counts (coach + client) — table and mobile cards.
- Banned users show `<StatusPill status="banned" />` in the Status column (REQ-7.10 / BLOCKER 1).
- Drill-down toggles an inline row with coach/client counts.
- Role-change persists via `auth.api.setRole` and writes `audit_logs` row with `action='user.role.changed'` and `metadata={ from, to }`.
- Server-side post-check rollback closes the 0-admin race: rolls back via second `setRole`, writes `user.role.rollback` audit row, returns 409.
- Server-side steady-state last-admin guard returns 400 with the verbatim copy and leaves the role unchanged.
- Only-admin row's `<select>` is disabled with verbatim tooltip.
- Coach/client GET `/portal/admin/users` redirects to `/portal`; coach/client GET `/api/admin/users` or POST `.../role` returns 403.
- Toast renders success (gold left border) and error (red left border) variants and auto-dismisses after 3 seconds.
- `AuditAction` union extends with BOTH `'user.role.changed'` AND `'user.role.rollback'`.

All 6 artifact files exist with the expected `contains` markers (verified by grep gates in the plan). All 3 key links wired (POST onChange → `/api/admin/users/{id}/role`, banned StatusPill render, setRole forward + rollback paths).

## Verification

- `npm run build` succeeds — `/portal/admin/users`, `/api/admin/users`, and `/api/admin/users/[userId]/role` all register in the route manifest.
- `npx tsc --noEmit` clean for the 7 in-scope files. Pre-existing test-file errors (`src/__tests__/...`) are out of scope per Rule scope boundary and were not modified.
- All grep acceptance criteria pass:
  - `'user.role.changed'`, `'user.role.rollback'` present in `audit.ts` (1 each).
  - Verbatim error copy present in `role/route.ts`.
  - `auth.api.setRole` × 2 (forward + rollback), `logAuditEvent` × 3, `status: 409` × 1 in `role/route.ts`.
  - `banned: user.banned` × 1 in `users/route.ts`; `lastActive`, `coachCount`, `clientCount` × 2 each.
  - `font-black` × 0 across all new files (warning 4 defence-in-depth).
  - `text-2xl` × 0 in page.
  - `/api/admin/users` × 2 in page (list + role mutation URL).
  - `StatusPill status='banned'` × 2 in page (desktop + mobile).
  - `adminCount <= 1` × 2 in page (D-22 guard, desktop + mobile).
  - `RolePill` × 3 in page; `Toast` referenced ≥ 2 times.
  - `Role updated for` × 1; `another admin change happened simultaneously` × 1; `res.status === 409` × 1.
  - `bg-navy/10` × 1 in RolePill (admin variant).
  - `border-l-4 border-gold` and `border-l-4 border-red-500` × 1 each in Toast.
  - `role="status"` / `role="alert"` present in Toast (Fragment-style attribute → 1 match because the variable is defined once).
- Manual checks (deferred to plan 07-09 regression tests):
  - Demote-only-admin via UI → select disabled with tooltip; via direct POST → 400 + verbatim error; DB role unchanged.
  - Concurrent demotion race (instrument with `setTimeout` between pre-check and post-check) → second request returns 409, `audit_logs` gets a `user.role.rollback` row, both users end up admins.
  - Seed `banned=true` user → row shows red `Banned` StatusPill in Status column.
  - Coach/client → redirect / 403.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Better Auth `setRole` body type only accepts `'user' | 'admin'`**
- **Found during:** Task 1 (`npx tsc --noEmit` after writing the role route)
- **Issue:** Better Auth's `auth.api.setRole` is typed against the plugin's default role union (`"user" | "admin"`), but Peak360's domain union is `'admin' | 'coach' | 'client'` (configured via `admin({ defaultRole: 'coach', adminRoles: ['admin'] })` in `src/lib/auth.ts`). The runtime accepts our roles but the type-check rejected them.
- **Fix:** Inline `as 'admin'` cast on the `role` value in both `setRole` call sites (forward path uses `newRole as 'admin'`; rollback path passes the literal `'admin'` and is naturally compatible). Comment added explaining the cast.
- **Files modified:** `src/app/api/admin/users/[userId]/role/route.ts`
- **Commit:** `f06323f`

**2. [Rule 1 — Bug] React fragment-in-map missing key**
- **Found during:** Task 3 (post-Write review of the desktop table)
- **Issue:** Used `<>...</>` as the outer node of `users.map(...)` so the parent row + drill-down row were grouped, but `<></>` cannot accept a `key`, which would trigger a React key warning in dev.
- **Fix:** Imported `Fragment` from `react` and replaced the implicit fragment with `<Fragment key={u.id}>...</Fragment>`. Removed the now-redundant `key` on the inner drill-down `<tr>`.
- **Files modified:** `src/app/portal/admin/users/page.tsx`
- **Commit:** `04c9e30`

**3. [Rule 1 — Bug] `font-black` literal token in a code comment defeated the warning-4 defence-in-depth grep**
- **Found during:** Task 3 verification grep
- **Issue:** I left a comment "Uses font-semibold (NOT font-black) per UI-SPEC 2-weight contract." The plan's defence-in-depth gate is `grep -c "font-black" === 0` and treats any occurrence (comment or class) as a violation.
- **Fix:** Reworded the comment to remove the literal `font-black` token while preserving the intent ("Uses font-semibold per UI-SPEC 2-weight contract (warning 4 fix).").
- **Files modified:** `src/app/portal/admin/users/page.tsx`
- **Commit:** `04c9e30`

No CLAUDE.md violations encountered; no architectural changes (Rule 4) needed; schema already had `banned`, `banReason`, `banExpires` columns from the prior Better Auth admin plugin install.

## Authentication Gates

None — task did not require login or external credentials.

## Commits

- `f06323f` — `feat(07-07): add admin role-change route with last-admin guard + rollback`
- `12d0987` — `feat(07-07): add GET /api/admin/users with banned + last-active + assessment counts`
- `04c9e30` — `feat(07-07): /portal/admin/users page + RolePill + Toast + StatusPill banned variant`

## Downstream Hooks

- **Plan 07-08** can wire the `/portal/admin` Users card to this page (already linked at `/portal/admin/users` in `ADMIN_SECTIONS`). The hero typography in this page is already on `font-semibold` so plan 07-08 task 3's typography correction is consistent here without additional work.
- **Plan 07-09** can write regression tests for both the steady-state last-admin guard (pre-check) AND the race-condition rollback path. The audit_logs schema accepts both `user.role.changed` and `user.role.rollback` actions.

## Self-Check: PASSED

Files exist:
- FOUND: src/lib/audit.ts (modified)
- FOUND: src/app/api/admin/users/route.ts
- FOUND: src/app/api/admin/users/[userId]/role/route.ts
- FOUND: src/app/portal/admin/users/page.tsx
- FOUND: src/components/ui/RolePill.tsx
- FOUND: src/components/ui/Toast.tsx
- FOUND: src/components/ui/StatusPill.tsx (modified)

Commits exist:
- FOUND: f06323f
- FOUND: 12d0987
- FOUND: 04c9e30
