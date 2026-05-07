# Phase 7: Multi-tenant Auth UX - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-enable a working client login experience, differentiate the dashboard, sidebar, and invitation flow by role (admin / coach / client), give users a self-service password recovery path, and give admins an in-app surface to view existing users and invite new coaches/admins. Completes the deferred client/coach UX from milestone v3.0 and removes the "raw SQL or env-var reset" tax that surfaced in prod on 2026-05-07.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**12 requirements are locked.** See `07-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `07-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Re-enable client login mode toggle on `/login` (uses existing dead-coded UI block)
- Block public self-service coach signup; existing coach accounts keep working
- Role-based sidebar nav filtering (client vs coach vs admin)
- Coach-grouped admin dashboard with "My clients" pinned first
- Read-only Section 11 report rendering for clients
- PDF download enabled for clients on owned assessments
- Multi-assessment trends chart on client dashboard (Recharts)
- Password reset flow: `sendResetPassword` wired in `auth.ts`, "Forgot password?" link on `/login`, `/reset-password` page consuming the token
- Magic-link secondary CTA on Coach/Admin login form
- Admin user-management page `/portal/admin/users`: list, drill-down to tied assessments, inline role edit (with last-admin guard)
- Admin invitations page `/portal/admin/invitations`: invite-with-role form (admin/coach/client) + listing of past invitations
- Invitations API extended to accept `role` parameter with role-based authorization (admin → any, coach → client only)
- Replace the "User Management — Coming Soon" placeholder on `/portal/admin/page.tsx` with a live link
- Role-appropriate empty states and welcome content
- Audit logging on role changes via the existing `audit_logs` table

**Out of scope (from SPEC.md):**
- Ban / unban user (deferred)
- Delete user (depends on reassignment landing first)
- Admin reassignment of clients/assessments between coaches (Phase 8)
- ENGE-03 coach notes visible to client (v2)
- ENGE-04 branded PDF export with coach/business logo (v2)
- Multi-tenant data isolation beyond `coachId`
- Mobile native app, video consultation, wearable integrations
- Pending-invitation expiry / resend / revoke UX
- Email verification flow for new signups

</spec_lock>

<decisions>
## Implementation Decisions

### Account creation rewrite
- **D-01:** Disable Better Auth's email/password signup at the config layer: `emailAndPassword: { ..., disableSignUp: true }` in `src/lib/auth.ts`. Public POSTs to the signup endpoint return Better Auth's standard "signup disabled" error.
- **D-02:** Rewrite `/api/invitations` to use the admin plugin's `auth.api.createUser` (instead of the current `signUpEmail` + post-hoc `db.update(...).set({ role })`). `createUser` accepts `role` atomically — no second DB write, no race window where a freshly-created account is unset.
- **D-03:** The "Create one" link is removed from `/login`. The existing inline coach handler (`handleCoachRegister` in `src/app/login/page.tsx`) is deleted along with its register view.
- **D-04:** Backwards compat: existing coach accounts (login, password) continue to work — `disableSignUp` only blocks creation, not authentication.

### Invitations API role parameter
- **D-05:** `/api/invitations` accepts an optional `role` field in the JSON body. Validation rule:
  - `session.user.role === 'admin'` → any of `'admin' | 'coach' | 'client'` allowed; default `'client'` if omitted.
  - `session.user.role === 'coach'` → only `'client'` allowed (or omitted → `'client'`); `'coach'` or `'admin'` returns **403**.
  - `session.user.role === 'client'` → 403 (existing behaviour preserved).
- **D-06:** Single endpoint (no separate `/api/admin/invitations`). Coach inline "Invite Client" form on `/portal` keeps working unchanged because coaches already POST without a `role` field.
- **D-07:** Admin invitations always send a sign-in link (magic-link delivery) regardless of role — the existing magic-link infrastructure in `auth.ts:54-63` is reused. Role is fixed at the moment of `createUser`; the recipient sets a password later via the password-reset flow if they want one.

### "Past invitations" listing source
- **D-08:** No new `invitations` table. The list on `/portal/admin/invitations` is derived from the `user` table:
  - **Sent at:** `user.createdAt` (already present from Better Auth schema)
  - **Accepted status:** `true` if a row exists in `session` for that user; `false` otherwise (= invited but never logged in)
  - **Role:** `user.role`
- **D-09:** No `invitedBy` tracking in v1 — the listing shows all users regardless of who invited them, ordered by `createdAt DESC`. (If we later need attribution, the audit log can carry it.)

### Role-aware UI gating
- **D-10:** Role-gating happens **client-side** via `authClient.useSession()` inside the affected components (Sidebar, dashboard, empty states). Matches the existing pattern already used in `src/app/portal/page.tsx:17-18`.
- **D-11:** Security still lives in the API. `/api/admin/*` route handlers MUST `auth.api.getSession({ headers })` and return 403 for non-admin roles regardless of UI gating. Sidebar hiding is defence-in-depth only (per SPEC Constraint).
- **D-12:** Sidebar loading state: render the base nav (Dashboard) immediately; render role-specific items (Assessments / Clients / Admin) only after `useSession()` resolves. Privileged items never flash for non-admins (acceptance criterion: "Admin link is not visible in the DOM for non-admin sessions").
- **D-13:** Sidebar `NAV_ITEMS` becomes a function of `role`: `client → [Dashboard, My Assessments]`, `coach → [Dashboard, Assessments, Clients]`, `admin → [Dashboard, Assessments, Clients, Admin]`. The "My Assessments" link points to `/portal` (their dashboard already lists their owned assessments).

### Admin dashboard grouping
- **D-14:** `/api/assessments` (`GET`) is extended to JOIN the `user` table and include `coachId` + `coachName` on every assessment row. Response shape stays a flat array — no per-role branching at the API. Coach dashboards ignore the new fields.
- **D-15:** Grouping happens in `src/app/portal/page.tsx`, gated by role:
  - `admin` → split into "My clients (you)" (`a.coachId === session.user.id`) pinned first, then one section per other coach (group by `coachId`, label by `coachName`). Legacy assessments with `coachId = NULL` go in a "Unassigned" section at the bottom.
  - `coach` → render flat list as today (no grouping, no header).
  - `client` → render their own (already coach-style flat).
- **D-16:** Coach name fallback: if `coachName` is null/empty, render "Coach" + last 4 chars of `coachId`.

### Client read-only assessment view
- **D-17:** New route `src/app/portal/assessment/[id]/report/page.tsx`. Renders the existing `Section11` component without `ProgressBar`, `NavigationButtons`, or the Zustand auto-save subscription. Owns its own minimal header (assessment date + "Download PDF" button — the existing `/api/assessments/[id]/pdf` route already enforces ownership).
- **D-18:** Client dashboard "View report" links point to `/portal/assessment/[id]/report` (not `/section/11`).
- **D-19:** Server-side guard at `src/app/portal/assessment/[id]/section/[num]/page.tsx`: if `session.user.role === 'client'`, redirect to `/portal/assessment/[id]/report`. Prevents stale auto-save POSTs from a client and gives them a single canonical URL. Coach/admin paths unaffected.
- **D-20:** Section 11 component is reused as-is — no `readOnly` prop branching is introduced inside Section11.tsx. The new route simply omits the editable wrappers.

### Last-admin guard + audit logging (Claude's discretion bounded by SPEC)
- **D-21:** Role changes go through a thin custom route handler (e.g. `POST /api/admin/users/[userId]/role`) that:
  1. Verifies caller is admin (`auth.api.getSession`).
  2. If new role is non-admin AND target user is currently admin: count remaining admins; if ≤ 1, return 400 with error `"Cannot demote the only admin"` and do not call `setRole`.
  3. Calls `auth.api.setRole` (admin plugin) to persist.
  4. Writes an `audit_logs` row: `action='user.role.changed'`, `resource_type='user'`, `resource_id=targetUserId`, `metadata={ from: oldRole, to: newRole }`. Schema already exists from Phase 4 (D-09).
- **D-22:** UI side: the role picker on `/portal/admin/users` is disabled for the row of the currently-only admin (defence-in-depth). The server check is the source of truth.

### Password reset flow
- **D-23:** Configure `emailAndPassword.sendResetPassword` in `auth.ts`, reusing the existing `sendEmailViaSMTP2Go` helper and the same inline email template style as the magic-link config (consistent unauthed UX).
- **D-24:** New page `src/app/reset-password/page.tsx` (sibling to `/login`, NOT under `/portal`). Reads `?token=...` from URL, calls Better Auth's reset-password endpoint with the new password, and on success redirects to `/login` with a success banner. Match the `/login` glassmorphic gradient + glass-card styling for visual consistency on unauthed surfaces.
- **D-25:** "Forgot password?" link rendered under the password field in Coach/Admin mode on `/login`. Posts the entered email to Better Auth's reset-request endpoint, then shows the same success state as magic-link ("Check your email…"). Works in dev too — `BETTER_AUTH_URL` already drives the reset-link host.

### Magic-link secondary CTA
- **D-26:** "Email me a sign-in link" CTA below the password form in Coach/Admin mode. Reuses the existing `authClient.signIn.magicLink({ email, callbackURL: '/portal' })` call already present for Client mode. Always shown — does not depend on `NODE_ENV` (per SPEC Constraint).

### Login mode toggle
- **D-27:** Re-enable the existing dead-coded mode toggle in `src/app/login/page.tsx` by replacing `const mode = 'coach' as AuthMode;` (line 13) with `useState<AuthMode>('coach')`. Render the toggle UI block (currently commented-out at the placeholder around line 140). Default = "Coach / Admin"; client sees the existing magic-link-or-password branch as today.

### Client trends chart
- **D-28:** Reuse the Recharts pattern already in `src/app/portal/clients/[name]/page.tsx` (coach-facing trends). Extract the chart-rendering JSX into a shared component if it's already a clear unit; otherwise inline a similar block on the client dashboard. Show the section only when the client has ≥ 2 completed assessments; otherwise show a one-line empty-state ("Complete more assessments to see trends over time.").

### Empty states & welcome content
- **D-29:** Client empty state: "Your coach will set up your first assessment" (no Create CTA). Coach/admin empty state: existing "Create your first assessment" CTA stays. Both branched off `userRole` from `useSession()` inside `src/app/portal/page.tsx`.
- **D-30:** First-login welcome banner (currently localStorage-gated to clients at `portal/page.tsx:22`) stays as-is — no change needed.

### Claude's Discretion
- Exact file structure of the role-specific Sidebar (helper that returns the items array based on role, vs inline branch).
- Whether to extract a shared `useRoleNav()` hook or keep the role check inline in Sidebar.tsx.
- Email template HTML for the password-reset email (match the magic-link aesthetic).
- Layout details of `/portal/admin/users` (table vs card list — go with table to mirror existing admin surfaces).
- Layout details of `/portal/admin/invitations` (split-pane invite-form + listing, or sequential).
- Whether to factor `/portal/clients/[name]`'s trends chart into a shared component or duplicate the JSX with client-scoped data.
- Error messages and toast/banner copy throughout.

### Folded Todos
- **2026-05-07-add-password-reset-account-management-and-admin-invitations.md** — already folded into SPEC v2 revision (2026-05-07): password reset flow (req 8), admin user-management page (req 10), admin invitations page (req 11). The todo is fully satisfied by this phase's locked SPEC.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements (MUST read first)
- `.planning/phases/07-multi-tenant-auth-ux/07-SPEC.md` — 12 locked requirements, boundaries, acceptance criteria. Locked requirements MUST read before planning.

### Auth system
- `src/lib/auth.ts` — Better Auth config: emailAndPassword, magicLink plugin, admin plugin (`defaultRole: 'coach'`, `adminRoles: ['admin']`)
- `src/lib/auth-client.ts` — Better Auth client (`authClient.useSession`, `authClient.signIn.email`, `authClient.signIn.magicLink`, `authClient.signUp.email`)
- `src/middleware.ts` — Route protection and the landing-gate carve-outs for `/portal` and `/admin`

### Existing endpoints to modify
- `src/app/api/invitations/route.ts` — Current invitations route (lines 51, 58 hardcode `role: 'client'`)
- `src/app/api/assessments/route.ts` — JOIN with `user` to expose `coachName` (D-14)
- `src/app/portal/page.tsx` — Dashboard; role-aware grouping + empty state (D-15, D-29)
- `src/components/layout/Sidebar.tsx` — Role-filtered nav (D-13)
- `src/app/login/page.tsx` — Re-enable mode toggle (D-27), remove signup link (D-03), add Forgot/Magic-link CTAs (D-25, D-26)

### Pages/routes to create
- `src/app/reset-password/page.tsx` — D-24
- `src/app/portal/admin/users/page.tsx` — Admin user-management (SPEC req 10)
- `src/app/portal/admin/invitations/page.tsx` — Admin invitation page with role picker (SPEC req 11, D-08)
- `src/app/portal/assessment/[id]/report/page.tsx` — Client read-only Section 11 view (D-17)
- `src/app/api/admin/users/[userId]/role/route.ts` — Custom role-change handler with last-admin guard + audit log write (D-21)

### Database schema
- `src/lib/db/schema-sqlite.ts` — `user`, `session`, `audit_logs`, `assessments`. Audit logs table at line 54 (created Phase 4).
- `src/lib/db/schema.ts` — Postgres mirror; same shape.

### Email infrastructure
- `src/lib/email/send.ts` — `sendEmailViaSMTP2Go` helper (used for magic-link, will be reused for password reset)

### Existing surfaces to reuse
- `src/components/sections/Section11.tsx` — Reused as-is in the new `/report` route (D-17, D-20)
- `src/app/portal/clients/[name]/page.tsx` — Recharts trends pattern to clone for client dashboard (D-28)
- `src/app/api/assessments/[id]/pdf/route.ts` — PDF download (already enforces ownership; works for clients)

### Prior phase context
- `.planning/phases/02-authentication-ownership/02-CONTEXT.md` — Better Auth choice, magic-link client flow (D-01–D-10)
- `.planning/phases/04-security-client-portal/04-CONTEXT.md` — `audit_logs` schema (D-09); admin actions log writes pattern (D-10)

### Architecture & conventions
- `.planning/codebase/ARCHITECTURE.md` — Three-layer pattern; auto-save loop
- `.planning/codebase/CONVENTIONS.md` — Code style and naming patterns
- `CLAUDE.md` — Tech stack, key patterns, file ID conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `authClient.useSession()` already used in `src/app/portal/page.tsx:17-18` — extend the same pattern for Sidebar and other client components.
- `auth.api.getSession({ headers: await headers() })` pattern already in `src/app/api/invitations/route.ts:11` — reuse for new admin endpoints.
- Better Auth admin plugin (already installed in `auth.ts:50-53`) exposes `auth.api.createUser`, `auth.api.setRole`, `auth.api.listUsers` — wire these from the new server routes.
- Magic-link plugin (already configured in `auth.ts:54-63`) is the delivery mechanism for admin invitations regardless of target role.
- `sendEmailViaSMTP2Go` helper — single email module for magic-link and password-reset.
- `audit_logs` table (Phase 4 D-09) already has the columns needed for role-change tracking: `user_id`, `action`, `resource_type`, `resource_id`, `metadata`, `created_at`.
- Recharts trends component at `/portal/clients/[name]` — pattern to mirror for client dashboard.

### Established Patterns
- API responses: `NextResponse.json({ success: boolean, data?, error? })` with HTTP status codes.
- Role checks in API: `session.user.role === 'admin'` etc. — replicate, don't introduce a new abstraction.
- Drizzle dual-schema (SQLite + Postgres): any DB query change touches both `schema.ts` and `schema-sqlite.ts` only if a NEW column is added. D-08 requires no schema change.
- Glassmorphic unauthed shell on `/login`: full-screen gradient + decorative radial glow + `backdrop-blur-xl` glass card. Mirror for `/reset-password`.
- Client-side branching by role in `/portal/page.tsx` already gates the "Invite Client" form (line 254) — extend the same gating to grouping and empty states.

### Integration Points
- `Sidebar.tsx` is currently a client component with a static NAV_ITEMS array — refactor to derive the array from `useSession()` role.
- `/api/invitations/route.ts` body parsing — add `role` extraction + role-of-caller validation BEFORE existing `email` validation.
- `/api/assessments/route.ts` (GET) — add LEFT JOIN on `user` (alias coach) and project `coachId` + `coachName` into the returned rows. SQLite + Postgres both support the join via Drizzle.
- `src/app/portal/admin/page.tsx:130-145` — replace the "Coming Soon" placeholder card with two link cards pointing to `/portal/admin/users` and `/portal/admin/invitations`.

</code_context>

<specifics>
## Specific Ideas

- Reuse the existing dead-coded mode toggle on `/login` rather than rebuilding — the client UI block (lines 296-403) is already styled and just needs the toggle button surfaced and the `mode` constant turned back into state.
- Keep the inline coach "Invite Client" form on `/portal` exactly as-is — it sends no `role` field and the new validation rule (D-05) treats that as `'client'`, so it keeps working.
- "My clients (you)" header copy on the admin dashboard is taken verbatim from SPEC requirement 4 — don't reword.
- Last-admin guard error message: `"Cannot change the role of the only admin. Promote another user to admin first."` (acceptance criterion: "returns an error and the role stays unchanged" — give the user a path forward).

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **2026-05-07-admin-reassign-clients-and-assessments-between-coaches.md** — Explicitly deferred to Phase 8 in SPEC.md Boundaries (Out of scope). Reason: explicit scope cut to keep this phase shippable; raw SQL workaround documented in the todo file.

### Future Enhancements (logged for backlog)
- Ban/unban user UX (better-auth supports server-side; defer to a follow-up phase)
- Delete user UX (depends on reassignment landing in Phase 8 first)
- Pending-invitation lifecycle ops: resend, expiry visualisation, revoke buttons
- Email verification flow for new accounts
- Audit log retention/archival policy
- Branded PDF export with coach/business logo (ENGE-04 — v2 milestone)
- Coach notes visible to client (ENGE-03 — v2 milestone)
- `invitedBy` attribution on user creation (currently audit_log can carry it if needed)

</deferred>

---

*Phase: 07-multi-tenant-auth-ux*
*Context gathered: 2026-05-07*
