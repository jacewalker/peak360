---
phase: 07-multi-tenant-auth-ux
plan: 06
subsystem: invitations
tags: [invitations, admin, api, auth]
one_liner: "Admin-aware invitations stack: role-aware POST /api/invitations using auth.api.createUser atomically, new GET /api/admin/invitations user-derived listing, and /portal/admin/invitations page with form + table."
requires:
  - Better Auth admin plugin (auth.api.createUser)
  - Better Auth magic-link plugin (auth.api.signInMagicLink)
  - requireAdmin() helper
  - authClient.useSession() (client-side gating)
provides:
  - "POST /api/invitations accepts optional `role`; admin → any role, coach → client-only, client → 403"
  - "GET /api/admin/invitations: admin-only past-invitations list derived from user ⨝ session"
  - "/portal/admin/invitations page (hero + form + table)"
  - "StatusPill UI primitive (accepted/pending)"
affects:
  - "Coach inline /portal Invite Client form keeps working unchanged (no role field → defaults to 'client')"
  - "Future plan 07-08 may link the admin home page to /portal/admin/invitations"
tech_stack_added: []
tech_stack_patterns:
  - "Atomic user-create via Better Auth admin plugin (replaces signUpEmail + post-hoc db.update(role))"
  - "Magic-link delivery for ALL invite roles via auth.api.signInMagicLink (D-07)"
  - "user.createdAt + accepted=hasSession derivation for invitations listing (no new table — D-08)"
key_files:
  created:
    - src/app/api/admin/invitations/route.ts
    - src/app/portal/admin/invitations/page.tsx
    - src/components/ui/StatusPill.tsx
  modified:
    - src/app/api/invitations/route.ts
decisions:
  - "D-02 atomic createUser: replace signUpEmail + db.update(role) with auth.api.createUser({ role })"
  - "D-05 caller validation: admin invites any role; coach restricted to role='client' (or omit)"
  - "D-06 single endpoint: /api/invitations serves both coach inline form (no role) and admin form (with role)"
  - "D-07 magic-link delivery: ALL invitations use auth.api.signInMagicLink (with SMTP2Go fallback) regardless of target role"
  - "D-08 derive listing from user ⨝ session — no new invitations table"
  - "D-09 ordering: user.createdAt DESC (newest first), no invitedBy tracking"
  - "D-10/D-11 client-side admin gating on /portal/admin/invitations is defence-in-depth; server (/api/admin/invitations + /api/invitations role check) is source of truth"
metrics:
  duration: "~25min"
  completed: "2026-05-07"
  tasks_completed: 3
  files_created: 3
  files_modified: 1
---

# Phase 07 Plan 06: Invitations Stack (admin-aware) Summary

## Outcome

Coaches keep their existing client-only invite flow (no API contract change for them). Admins get a full invitations dashboard at `/portal/admin/invitations`: send a sign-in invitation at any role (admin / coach / client), see who's been invited, and see who has actually signed in (accepted) versus who hasn't (pending). The new contract is enforced server-side: a coach who tries to POST `role: 'admin'` directly via curl gets 403; a non-admin who hits `GET /api/admin/invitations` gets 403.

## Tasks Executed

| Task | Name                                                                              | Commit  | Files                                                |
| ---- | --------------------------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| 1    | Rewrite POST /api/invitations to accept role + use auth.api.createUser atomically | cbd44c3 | src/app/api/invitations/route.ts                     |
| 2    | Create GET /api/admin/invitations returning user-derived invitation list          | 1fc1b98 | src/app/api/admin/invitations/route.ts               |
| 3    | Build /portal/admin/invitations page + StatusPill component                       | fc0cd51 | src/app/portal/admin/invitations/page.tsx, src/components/ui/StatusPill.tsx |

## New / Changed API Contracts

### POST /api/invitations (modified)

**Body:** `{ email: string; name?: string; role?: 'admin' | 'coach' | 'client' }` — `role` defaults to `'client'` when omitted (D-06 backwards compat).

**Authorization:**
- 401 if no session
- 403 if `session.user.role === 'client'`
- 403 if `session.user.role === 'coach'` and `role !== 'client'`
- 400 if `role` is set to anything outside the 3-member union

**Behaviour:**
- New email → `auth.api.createUser({ email, password: crypto.randomUUID(), name, role })` (atomic create with role)
- Existing email → no create; sends sign-in link
- Always sends a magic-link sign-in email via `auth.api.signInMagicLink({ email, callbackURL: '/portal' })` with an inline SMTP2Go fallback if the magic-link API surface is unavailable

**Response:** `{ success: true, message: string }` on success.

### GET /api/admin/invitations (NEW)

**Authorization:** `requireAdmin()` — 401 / 403 inline.

**Response shape:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "email": "...", "name": "...", "role": "admin|coach|client", "createdAt": "...", "accepted": true }
  ]
}
```

`accepted` is `true` iff the user has at least one row in the `session` table (D-08). Sorted by `user.createdAt DESC` (D-09).

## New UI Surface

- `/portal/admin/invitations` — admin-only page (UI gating via `authClient.useSession()`, server gating via the two endpoints above)
  - Hero header: H1 `Invitations`, sub-heading `Invite coaches, admins, or clients. Recipients receive a sign-in link.`, eyebrow `Peak360 › Onboarding`
  - Card 1 `Send an invitation` — email + optional name + role select (default `Client`) + `Send invitation` CTA
  - Card 2 `Past invitations` — desktop table (Email / Name / Role / Sent / Status), mobile card list (md breakpoint), `StatusPill` for accepted vs pending
- `<StatusPill status="accepted|pending" />` — reusable in `src/components/ui/StatusPill.tsx`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] createUser role typing widened via cast**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** Better Auth admin plugin types `role` as `'user' | 'admin' | (...)[]` — narrower than runtime which accepts any configured role string (admin plugin Zod schema is `z.string()`). Direct `role: requestedRole` (where `requestedRole` is `'admin' | 'coach' | 'client'`) caused TS2769.
- **Fix:** Inline cast `role: requestedRole as 'user' | 'admin'`. Runtime validates against `adminRoles` config in `src/lib/auth.ts`; the Zod schema accepts any string.
- **Files modified:** src/app/api/invitations/route.ts
- **Commit:** cbd44c3

**2. [Rule 3 - Blocking] Drizzle row-mapper implicit-any**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `rows.map((r) => …)` flagged TS7006 because Drizzle's `select(...)` return type for `MAX(...)` aggregate had an implicit-any branch on the row callback parameter.
- **Fix:** Added an explicit annotation `r: typeof rows[number]`.
- **Files modified:** src/app/api/admin/invitations/route.ts
- **Commit:** 1fc1b98

### Deferred Items (out of scope)

Pre-existing TypeScript errors in `src/__tests__/*` (vitest globals, type narrowing) are present on baseline `43dfaa0` and not introduced by this plan. Logged in `.planning/phases/07-multi-tenant-auth-ux/deferred-items.md`. `npm run build` (the headline plan acceptance) does NOT typecheck the test directory and passes cleanly.

## Verification Results

| Check                                                                                                          | Result |
| -------------------------------------------------------------------------------------------------------------- | ------ |
| `grep -c "auth.api.createUser" src/app/api/invitations/route.ts` returns 1                                      | PASS (1) |
| `grep -c "requestedRole" src/app/api/invitations/route.ts` returns ≥ 3                                          | PASS (4) |
| `grep -c "session.user.role === 'coach'"` returns ≥ 1                                                            | PASS (1) |
| `grep -cE "auth\.api\.signUpEmail"` returns 0                                                                    | PASS (0) |
| `grep -cE "db\.update\(user\)\.set\(\{ role"` returns 0                                                          | PASS (0) |
| `grep -c "session.user.role === 'client'"` returns ≥ 1                                                           | PASS (1) |
| `test -f src/app/api/admin/invitations/route.ts`                                                                | PASS    |
| `grep -c "leftJoin(session"` returns 1                                                                           | PASS (1) |
| `grep -c "orderBy(desc(user.createdAt))"` returns 1                                                              | PASS (1) |
| `grep -c "accepted:"` returns ≥ 1                                                                                | PASS (1) |
| Both UI files exist                                                                                              | PASS    |
| `grep -c "Send an invitation"` returns 1                                                                         | PASS (1) |
| `grep -c "Past invitations"` returns 1                                                                           | PASS (1) |
| `grep -c "Invite coaches, admins, or clients"` returns 1                                                         | PASS (1) |
| `grep -c "/api/invitations"` returns 1                                                                           | PASS (1) |
| `grep -c "/api/admin/invitations"` returns 1                                                                     | PASS (1) |
| `grep -c "StatusPill"` returns ≥ 2                                                                               | PASS (3) |
| `grep -c "Accepted" src/components/ui/StatusPill.tsx` returns 1                                                  | PASS (1) |
| `grep -c "Pending" src/components/ui/StatusPill.tsx` returns 1                                                   | PASS (1) |
| `grep -c "text-2xl"` returns 0                                                                                   | PASS (0) |
| `grep -c "font-black"` returns 0 (page)                                                                          | PASS (0) |
| `grep -c "font-black"` returns 0 (pill)                                                                          | PASS (0) |
| No relative imports in page                                                                                      | PASS (0) |
| Plan-touched files compile cleanly under `npx tsc --noEmit`                                                      | PASS    |
| `npm run build` succeeds                                                                                         | PASS    |

## Threat Model Disposition

| Threat ID | Disposition | Mitigation present |
| --------- | ----------- | ------------------ |
| T-07-20 (coach → admin invite) | mitigate | `session.user.role === 'coach' && requestedRole !== 'client'` returns 403 BEFORE email validation (route.ts L26-28) |
| T-07-21 (client → /api/invitations) | mitigate | Existing 403 guard preserved (route.ts L17-19) |
| T-07-22 (malformed JSON crashes handler) | mitigate | `request.json().catch(() => null)` + null-safe access (`body?.email`, `body?.role`, `body?.name`) |
| T-07-23 (/api/admin/invitations leaks user list) | mitigate | `requireAdmin()` returns 403 for non-admin (admin/invitations/route.ts L18-19) |
| T-07-24 (audit logging) | accept | Out of scope this phase (reserved for plan 07-07) |
| T-07-25 (mistyped recipient) | accept | 5-min magic-link expiry; admin can re-invite |
| T-07-26 (createUser succeeds, email fails) | accept | Reset-password (07-01) recovery + admin re-trigger via Forgot password |

No high-severity un-mitigated threats remain.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes outside the threat model were introduced.

## Known Stubs

None.

## Self-Check: PASSED

Files created (verified):
- `src/app/api/admin/invitations/route.ts` — FOUND
- `src/app/portal/admin/invitations/page.tsx` — FOUND
- `src/components/ui/StatusPill.tsx` — FOUND

Files modified (verified):
- `src/app/api/invitations/route.ts` — MODIFIED

Commits (verified in git log):
- `cbd44c3` — feat(07-06): rewrite POST /api/invitations — FOUND
- `1fc1b98` — feat(07-06): add GET /api/admin/invitations — FOUND
- `fc0cd51` — feat(07-06): build /portal/admin/invitations + StatusPill — FOUND
