# Phase 7: Multi-tenant Auth UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 07-multi-tenant-auth-ux
**Areas discussed:** Account creation rewrite, Role-aware UI gating, Admin dashboard grouping, Client read-only Section 11

---

## Account creation rewrite

### Q1: How should public signup be blocked and account creation rewired?

| Option | Description | Selected |
|--------|-------------|----------|
| Disable signup + admin createUser | `disableSignUp: true` + use `auth.api.createUser` (admin plugin); atomic role assignment | ✓ |
| Keep signup, gate server-side | Leave signup endpoint on, hook rejects unauthenticated calls | |
| Disable signup, keep signUpEmail server-side | `disableSignUp: true` for client surface, server still calls `signUpEmail` and patches role | |

**User's choice:** Disable signup + admin createUser
**Notes:** Cleanest server-trusted path. Atomic `createUser({...,role})` removes the current race window where role is patched after signup. Public signup endpoint returns Better Auth's standard "signup disabled" error.

### Q2: How should the invitations API validate the `role` parameter?

| Option | Description | Selected |
|--------|-------------|----------|
| Strict: admin-any, coach-client-only | Single rule, 403 on coach attempting coach/admin role | ✓ |
| Two endpoints, one per role surface | Coach-only `/api/invitations`, separate `/api/admin/invitations` | |
| Single endpoint, drop unknown roles silently | Coerce unauthorized roles down to `client` without error | |

**User's choice:** Strict: admin-any, coach-client-only
**Notes:** Matches SPEC requirement 11 acceptance verbatim. Single endpoint preserves the existing inline coach "Invite Client" form.

### Q3: Where does the "past invitations" list come from?

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from user table | Use `user.createdAt` as sent-at; `session` row existence = accepted | ✓ |
| New invitations table | Dedicated Drizzle table with email/role/sentBy/sentAt/acceptedAt | |
| Read from audit_logs | Extend audit_logs with `invitation.sent` action | |

**User's choice:** Derive from user table
**Notes:** No schema migration. Trade-off: cannot show invited-but-not-yet-created edge cases. Acceptable for v1; lifecycle ops are explicitly out of scope.

---

## Role-aware UI gating

### Q1: Where should role-aware UI gating live?

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side via useSession | `authClient.useSession()` inside Sidebar/dashboard/empty-state components | ✓ |
| Server-side via layout prop drilling | RSC layout fetches session, passes role via context provider | |
| Hybrid: server-gate Admin link, client-gate the rest | Compromise — sensitive nav flash-free, others client-side | |

**User's choice:** Client-side via useSession
**Notes:** Matches existing pattern in `src/app/portal/page.tsx`. SPEC's authority constraint ensures API still enforces — UI gating is defence-in-depth.

### Q2: What does the sidebar render before the session resolves?

| Option | Description | Selected |
|--------|-------------|----------|
| Render base nav + hide privileged links | Dashboard immediately; role-specific items appear after session resolves | ✓ |
| Skeleton placeholder | Gray rows until session resolves | |
| Render full nav, accept brief flash | All items immediately, trim once session is known | |

**User's choice:** Render base nav + hide privileged links
**Notes:** Critical: SPEC req 3 acceptance criterion is "Admin link is not visible in DOM for non-admin sessions" — only this option satisfies it.

---

## Admin dashboard grouping

### Q1: How should the coach-grouped shape for the admin dashboard be produced?

| Option | Description | Selected |
|--------|-------------|----------|
| Flat API + client groupBy, with coachName included | JOIN user table; group client-side in `/portal/page.tsx` | ✓ |
| API returns pre-grouped shape for admins | Branch response shape on session role | |
| New `/api/admin/dashboard` endpoint | Dedicated admin endpoint with grouped shape | |

**User's choice:** Flat API + client groupBy
**Notes:** Smallest API change. Coach dashboards ignore the new fields. Coach name fallback to "Coach #ABCD" if null (legacy assessments with `coachId = NULL` go to "Unassigned" section).

---

## Client read-only Section 11

### Q1: How should clients access their read-only Section 11 report?

| Option | Description | Selected |
|--------|-------------|----------|
| New `/portal/assessment/[id]/report` route | Renders Section11 without ProgressBar/NavigationButtons/auto-save wiring | ✓ |
| Role-gated `readOnly` prop on existing route | Same `/section/[num]` route detects role, disables inputs + auto-save | |
| Middleware redirect for clients | Middleware rewrites client requests opaquely | |

**User's choice:** New `/portal/assessment/[id]/report` route
**Notes:** Cleanest isolation; no `readOnly` branching pollutes Section11 component. Section 11 is reused as-is.

### Q2: What should happen when a client requests a section route directly?

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect clients to /report | Server-side check redirects role===client to `/report` | ✓ |
| Return 403 for clients | Cleaner security signal but worse UX | |
| Render read-only on /section/[num] as fallback | Reintroduces the readOnly branching avoided in Q1 | |

**User's choice:** Redirect clients to /report
**Notes:** Single canonical URL for clients. Prevents stale auto-save POSTs. API still independently enforces ownership.

---

## Claude's Discretion

- File structure of the role-specific Sidebar (helper function vs inline branch)
- Whether to extract a shared `useRoleNav()` hook or keep role check inline
- Email template HTML for password-reset email (match magic-link aesthetic)
- Layout details of `/portal/admin/users` (table — mirrors existing admin surfaces)
- Layout details of `/portal/admin/invitations` (split-pane vs sequential)
- Whether to factor `/portal/clients/[name]` trends into a shared component or duplicate
- Error/toast/banner copy

## Deferred Ideas

- **Admin reassignment of clients/assessments between coaches** — deferred to Phase 8 (covered by `2026-05-07-admin-reassign-clients-and-assessments-between-coaches.md`); explicit scope cut in SPEC Boundaries.
- Ban/unban user UX
- Delete user UX (depends on reassignment landing first)
- Pending-invitation lifecycle ops: resend, expiry visualisation, revoke
- Email verification flow for new signups
- Audit log retention/archival policy
- Branded PDF export with coach/business logo (ENGE-04 — v2)
- Coach notes visible to client (ENGE-03 — v2)
- `invitedBy` attribution on user creation
