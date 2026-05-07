# Phase 7: Multi-tenant Auth UX — Specification

**Created:** 2026-05-05
**Revised:** 2026-05-07
**Ambiguity score:** 0.19
**Requirements:** 12 locked

## Goal

Re-enable a working client login experience, differentiate the dashboard, sidebar, and invitation flow by role (admin / coach / client), give users a self-service password recovery path, and give admins an in-app surface to view existing users and invite new coaches/admins — completing the deferred client/coach UX from milestone v3.0 and removing the "raw SQL or env-var reset" tax that prod surfaced on 2026-05-07.

## Background

Auth backbone is complete (Phase 2 + Phase 4): Better Auth provides RBAC for `admin | coach | client`, email/password + magic-link sign-in, and a (partial) invitations API. API-side scoping is correct (`admin → all`, `coach → own`, `client → assigned`). The UI layer, however, is still single-role and prod has no recovery paths:

- `src/app/login/page.tsx:13` hard-codes `const mode = 'coach' as AuthMode;` — the entire client-mode UI block is dead code, unreachable from the login page. Comment on the same line: *"Client portal not yet ready — locked to coach mode."*
- `src/app/login/page.tsx:50-86` exposes a public `authClient.signUp.email` form behind a "Create one" link. Combined with the `defaultRole: 'coach'` in `src/lib/auth.ts:51`, anyone on the open internet can self-register as a coach.
- `src/app/login/page.tsx` has no "Forgot password?" link and `src/lib/auth.ts:15-18` does not configure `sendResetPassword` — there is no password reset flow at all. Magic-link IS configured (`auth.ts:54-63`) but is not surfaced on `/login` for coaches/admins.
- `src/app/portal/page.tsx` is a single dashboard for all roles. Conditional differences are limited to a localStorage welcome banner for clients (line 22) and gating the "Invite Client" form to coach/admin (line 254). When an admin logs in, all assessments render in one undifferentiated list.
- `src/components/layout/Sidebar.tsx` shows the same nav (Dashboard / Assessments / Clients / Admin) to every role — including the Admin link, which is reachable by clients.
- `src/app/api/invitations/route.ts:51,58` only ever creates a `client` role user. Admin has no UI path to invite a coach or another admin.
- `src/app/portal/admin/page.tsx:130-145` shows a "User Management — Coming Soon" placeholder card. There is no `/portal/admin/users` page; admins cannot list users, see their tied assessments, or change a user's role without raw SQL.
- The `admin` plugin from better-auth is already installed (`auth.ts:50-53`); its server-side capabilities (role change, user list) are unused from the UI.

This phase replaces all of the above with role-aware UI, a working password recovery flow, and an admin user-management area that matches the API's existing scoping.

## Requirements

1. **Client login re-enabled**: The login page exposes both Coach/Admin and Client login flows.
   - Current: `mode` is hard-coded to `'coach'` on `src/app/login/page.tsx:13`; client UI exists but is unreachable.
   - Target: A visible toggle on `/login` switches between "Coach / Admin" (email + password) and "Client" (magic link in production, email + password in development — preserves the existing dev/prod branch). The toggle defaults to "Coach / Admin".
   - Acceptance: Visiting `/login` shows two visible mode buttons; clicking "Client" reveals the magic-link form (or password form in dev); a client account can complete login and land on `/portal`.

2. **Public coach signup blocked**: Self-service coach registration is removed from the login page.
   - Current: `/login` shows "Don't have an account? Create one" → `authClient.signUp.email` is publicly callable; default role is `coach`.
   - Target: The "Create one" link is removed from `/login`. The Better Auth signup endpoint is either disabled at the API layer or gated so it cannot be called without an authenticated admin session. Existing coach accounts continue to work unchanged.
   - Acceptance: `/login` has no visible signup CTA; an unauthenticated POST to the Better Auth signup endpoint returns an error or is unreachable; existing coach accounts still log in successfully with their current credentials.

3. **Role-based sidebar nav**: The sidebar shows only nav items appropriate to the user's role.
   - Current: `src/components/layout/Sidebar.tsx` renders Dashboard / Assessments / Clients / Admin for every authenticated user, regardless of role.
   - Target:
     - Client → Dashboard, My Assessments
     - Coach → Dashboard, Assessments, Clients
     - Admin → Dashboard, Assessments, Clients, Admin
   - Acceptance: Logging in as each of the three roles renders the exact nav set listed above; the Admin link is not visible in the DOM for non-admin sessions.

4. **Coach-grouped admin dashboard**: When an admin views the dashboard, assessments are grouped by coach with the admin's own clients pinned at the top.
   - Current: Admin dashboard (`src/app/portal/page.tsx`) renders one flat list of all assessments returned by `/api/assessments`.
   - Target: Admin dashboard renders sections in this order: "My clients (you)" (assessments where `coachId === session.user.id`), then one section per other coach (e.g. "Sarah's clients") containing each coach's assessments. Coach name resolves from the `user` table.
   - Acceptance: Logged in as admin with at least one assessment owned by self and at least one owned by another coach, the dashboard shows two visually distinct sections in the specified order; each assessment appears in exactly one section.

5. **Coach dashboard unchanged in shape**: A coach logging in sees their own clients only, presented as today.
   - Current: API already scopes `coachId === session.user.id` for coach role.
   - Target: No structural change to the coach dashboard; it remains a single list of the coach's own clients (no coach-grouping for non-admins).
   - Acceptance: Logged in as a coach, the dashboard renders exactly the assessments where the coach is the owner; no other coach's clients appear; no "My clients (you)" header is rendered (single ungrouped list).

6. **Client read-only assessment view + PDF download**: Clients can browse their own assessments, view the Section 11 report read-only, and download the PDF.
   - Current: A client landing on `/portal/assessment/[id]/section/[num]` has no read-only mode; the existing PDF route (`/api/assessments/[id]/pdf`) already enforces ownership.
   - Target: A client opening one of their own assessments sees a read-only Section 11 report (no editable form fields, no auto-save). The "Download PDF" action remains available and works for clients.
   - Acceptance: Logged in as a client, opening an owned assessment renders Section 11 with no editable inputs and no auto-save indicator; clicking "Download PDF" returns a 200 response and a PDF file; opening another client's assessment URL returns 403.

7. **Client trends dashboard**: When a client has multiple completed assessments, the dashboard surfaces a trends view across them (pulls in v2 ENGE-01).
   - Current: No trends component exists for clients; existing `/portal/clients` uses Recharts but is coach-facing.
   - Target: Client dashboard shows a trends section (Recharts) plotting key metrics (e.g. body composition, marker scores) across each completed assessment in chronological order, when the client has ≥ 2 completed assessments. With < 2 completed, the section is hidden or shows an empty-state message.
   - Acceptance: A client with 2+ completed assessments sees a chart with at least one rendered metric across time; a client with 0 or 1 completed assessment does not see the chart (or sees an empty-state).

8. **Password reset flow**: Authenticated users who forget their password can recover it via email-token + dedicated reset page.
   - Current: `src/lib/auth.ts:15-18` enables email+password but does NOT pass a `sendResetPassword` handler. `/login` has no "Forgot password?" link. There is no `/reset-password` route.
   - Target: `auth.ts` configures `sendResetPassword` using the existing `sendEmailViaSMTP2Go` helper. `/login` exposes a "Forgot password?" link visible in Coach/Admin mode → posts to better-auth's reset request endpoint → user receives an email with a tokenised link. A new `/reset-password` page reads the token, verifies it via better-auth, and renders a "new password + confirm" form. On success, user is redirected to `/login` with a success banner.
   - Acceptance: Triggering "Forgot password?" for an existing account sends an email containing a `/reset-password?token=...` link; opening that link renders the new-password form; submitting a valid new password updates the credential and the user can immediately log in with it; opening the link with an invalid/expired token shows an error state with a way back to `/login`.

9. **Magic-link as secondary recovery on /login**: Coach/Admin mode also exposes a "Email me a sign-in link" CTA as a secondary recovery path.
   - Current: Magic-link is configured server-side (`auth.ts:54-63`) but only surfaced on `/login` in Client mode. Coach/Admin mode has no magic-link affordance.
   - Target: A secondary CTA labelled "Email me a sign-in link" appears under the Coach/Admin password form. Clicking it triggers the existing `authClient.signIn.magicLink` flow with `callbackURL: '/portal'` for the entered email, and shows the same success state used by the Client mode form.
   - Acceptance: With Coach/Admin mode active and a valid email entered, clicking the magic-link CTA shows "Check your email for a login link"; the email arrives via SMTP2GO; clicking the link signs the user in and lands them on `/portal`.

10. **Admin user-management page (read + role edit)**: Admins have a dedicated `/portal/admin/users` page to list users, view tied assessments, and change a user's role.
    - Current: `/portal/admin/users` does not exist. `src/app/portal/admin/page.tsx:130-145` renders a "User Management — Coming Soon" placeholder. Role changes today require raw SQL.
    - Target: A new admin-only page lists every user with email, name, role, banned-status indicator, count of assessments-as-coach, count of assessments-as-client, and last-login timestamp (if available from better-auth). Each row is clickable → drill-down view showing that user's tied assessments (read-only listing only on this page). Each row has an inline role picker (admin / coach / client) that updates the user's role via the better-auth admin plugin and writes an entry to `audit_logs`. The role picker MUST refuse to demote the only remaining admin (returns an error and keeps the prior role). The "User Management — Coming Soon" placeholder card on `/portal/admin/page.tsx` is replaced with a live link to this page.
    - Acceptance: Logged in as admin, `/portal/admin/users` renders the full user list with the columns above; clicking a row reveals their tied assessments; changing a role persists to the DB and writes an `audit_logs` row; attempting to change the only admin's role to coach or client returns an error and the role stays unchanged; logged in as coach or client, requesting `/portal/admin/users` returns 403.

11. **Admin invitation page with role picker (admin / coach / client)**: A dedicated `/portal/admin/invitations` page lets admins invite users at any role and tracks pending invitations.
    - Current: `POST /api/invitations` always sets `role = 'client'` (`route.ts:51,58`); there is no UI path to invite a coach or admin and no listing of past/pending invitations. The "Invite Client" form lives inline on `/portal`.
    - Target: A new `/portal/admin/invitations` page (admin-only) lets admins enter an email + pick role (admin / coach / client) → fires `POST /api/invitations` with the chosen role. The same page lists previously-sent invitations with email, role, sent-at, and accepted-status. The invitations API is extended to accept and validate the `role` parameter: admins may set any role, coaches may only set `role: 'client'` (or omit; default = client), and clients are forbidden (existing 403 behaviour preserved). The existing inline "Invite Client" form on `/portal` continues to work for coaches but always sends `role: 'client'`.
    - Acceptance: Logged in as admin, `/portal/admin/invitations` renders the invite form with a role picker AND a list of past invitations; submitting with `role: 'admin'` creates a user with role `admin` and emails them a sign-in link; submitting with `role: 'coach'` creates a coach; coach POST to `/api/invitations` with `role: 'coach'` or `role: 'admin'` returns 403; coach POST without `role` (or with `role: 'client'`) creates a client as today; logged in as coach, `/portal/admin/invitations` returns 403.

12. **Role-appropriate empty states and welcome content**: Each dashboard renders content that makes sense for its role when data is empty or sparse.
    - Current: Empty state on `/portal` is generic ("No assessments yet" + "Create your first assessment" CTA) — the CTA points to assessment creation, which clients are forbidden from.
    - Target: Client empty state explains "Your coach will set up your first assessment" with no creation CTA. Coach/admin empty state retains "Create your first assessment". The first-login welcome banner (currently localStorage-gated for clients) is reused; coaches/admins do not see it.
    - Acceptance: Logged in as a client with zero assessments, the dashboard shows the client-specific empty message and no creation CTA; logged in as a coach with zero assessments, the existing "Create your first assessment" CTA renders.

## Boundaries

**In scope:**
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

**Out of scope:**
- **Ban / unban user** — better-auth supports it but no UX in this phase; defer to a follow-up. (Reason: scope creep — list+role-edit covers the immediate need to upgrade the prod user.)
- **Delete user** — requires safe handling of orphaned assessments, which depends on reassignment landing first. (Reason: can't ship safely without reassignment; UI placeholder optional but not required.)
- **Admin reassignment of clients/assessments between coaches** — covered by `2026-05-07-admin-reassign-clients-and-assessments-between-coaches.md`; deferred to Phase 8. (Reason: explicit scope cut to keep this phase shippable; raw SQL workaround documented.)
- **ENGE-03 coach notes visible to client** — defer to v2 (separate UI surface, requires schema work).
- **ENGE-04 branded PDF export with coach/business logo** — defer to v2 (requires logo upload + PDF render changes).
- **Multi-tenant data isolation beyond `coachId`** (e.g. business/organisation entity) — current single-business model is sufficient.
- **Mobile native app, video consultation, wearable integrations** — already excluded at the milestone level.
- **Pending-invitation expiry / resend / revoke UX** — listing of past invitations is in scope; lifecycle ops (resend button, expiry visualisation, revoke) are not. (Reason: keeps the invitations page minimal — the email links themselves carry the expiry semantics from better-auth.)
- **Email verification flow for new signups** — not currently used; out of scope.

## Constraints

- **Backwards compatibility:** Existing coach accounts (including the seeded admin) MUST continue to log in unchanged after public signup is disabled. No user-record migration is allowed. Existing assessments with `coach_id = NULL` continue to render to admins as today.
- **Tech stack:** Next.js 16 + React 19 + Tailwind v4 + Better Auth + Drizzle. Trends chart MUST use Recharts (already a project dependency). Password reset and magic-link emails MUST go through the existing `sendEmailViaSMTP2Go` helper — no new email provider.
- **API authority:** All role enforcement MUST remain in the API layer (`src/app/api/*` route handlers). UI-side hiding (sidebar nav, role picker, last-admin guard) is defence-in-depth, not the source of truth. The role-change endpoint MUST re-validate the last-admin invariant server-side.
- **Audit trail:** Role changes MUST write to the existing `audit_logs` table (Phase 4 SECU-02 surface) so admin actions are recoverable post-hoc.
- **No production deploys during phase work:** Per session constraint — verification happens locally; production push is a separate, explicit step.
- **Magic link in production, password in dev (Client mode):** The existing `process.env.NODE_ENV` branch in the client login form is preserved as-is. The Coach/Admin magic-link CTA does NOT depend on `NODE_ENV` — it is always shown.
- **Dev mode: password reset emails:** In dev (`NODE_ENV !== 'production'`), the reset email link must still work end-to-end against `BETTER_AUTH_URL` so the flow can be tested locally.

## Acceptance Criteria

- [ ] `/login` shows a visible Coach/Admin ↔ Client mode toggle; default is Coach/Admin
- [ ] A client account can complete a login (magic link in prod, password in dev) and land on `/portal`
- [ ] `/login` has no "Create one" / public signup link
- [ ] Existing coach accounts log in successfully with their current credentials after the change
- [ ] Sidebar nav for client = Dashboard + My Assessments only (no Clients link, no Admin link)
- [ ] Sidebar nav for coach = Dashboard + Assessments + Clients (no Admin link)
- [ ] Sidebar nav for admin = Dashboard + Assessments + Clients + Admin
- [ ] Admin dashboard renders "My clients (you)" section first, then per-coach grouped sections
- [ ] Coach dashboard renders a single ungrouped list (no "My clients" header)
- [ ] Client opening an owned assessment renders Section 11 read-only with no editable inputs
- [ ] Client clicking "Download PDF" returns a PDF; client requesting another client's assessment returns 403
- [ ] Client with ≥ 2 completed assessments sees a Recharts trends chart on the dashboard
- [ ] Client with 0–1 completed assessments does not see the chart (empty-state instead)
- [ ] `/login` Coach/Admin mode shows a "Forgot password?" link
- [ ] Triggering "Forgot password?" sends an email with a `/reset-password?token=...` link
- [ ] `/reset-password` with a valid token accepts a new password and the user can log in with it immediately
- [ ] `/reset-password` with an invalid/expired token shows an error state, not a silent failure
- [ ] `/login` Coach/Admin mode shows an "Email me a sign-in link" secondary CTA that triggers the magic-link flow
- [ ] `/portal/admin/users` lists users with email, name, role, banned status, # assessments-as-coach, # assessments-as-client, last-login
- [ ] Clicking a user row reveals their tied assessments (read-only)
- [ ] Inline role change on `/portal/admin/users` updates DB and writes an `audit_logs` entry
- [ ] Attempting to change the only admin's role returns an error and the role stays unchanged
- [ ] `/portal/admin/users` returns 403 for coach or client sessions
- [ ] `/portal/admin/invitations` page exists and renders invite form + past-invitations list
- [ ] Admin POST to `/api/invitations` with `role: 'admin'` creates an admin and emails sign-in link
- [ ] Admin POST with `role: 'coach'` creates a coach
- [ ] Coach POST with `role: 'coach'` or `role: 'admin'` returns 403
- [ ] Coach POST without `role` (or with `role: 'client'`) creates a client as today
- [ ] Client dashboard with zero assessments shows "Your coach will set up your first assessment" with no Create CTA
- [ ] The "User Management — Coming Soon" placeholder on `/portal/admin/page.tsx` is replaced with a live link card to `/portal/admin/users`

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                                |
|--------------------|-------|------|--------|--------------------------------------------------------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | 12 reqs locked: 9 from v1 + reset, magic-link CTA, user-mgmt page, invitations page  |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Explicit cut line: ban/delete/reassignment all OOS with reasons                      |
| Constraint Clarity | 0.78  | 0.65 | ✓      | Backwards-compat for existing coaches; SMTP2GO; audit-log requirement                |
| Acceptance Criteria| 0.72  | 0.70 | ✓      | 30 pass/fail criteria covering all 12 requirements                                   |
| **Ambiguity**      | 0.19  | ≤0.20| ✓      | Gate passed                                                                          |

## Interview Log

### v1 (2026-05-05)

| Round | Perspective     | Question summary                                       | Decision locked                                                  |
|-------|-----------------|--------------------------------------------------------|------------------------------------------------------------------|
| 1     | Researcher      | Login UX differentiation (URL vs toggle vs auto)?      | Single URL with mode toggle (re-enable existing dead-coded UI)   |
| 1     | Researcher      | Coach onboarding (open vs invite-only vs pending)?     | Invitation-only by admin; remove public coach signup             |
| 2     | Researcher/Simp | Admin dashboard presentation?                          | Coach-grouped list, "My clients (you)" pinned at top             |
| 2     | Researcher/Simp | Sidebar nav role filtering?                            | Strict role-based nav (client/coach/admin each get distinct set) |
| 3     | Boundary Keeper | Minimum client experience?                             | List + read-only + PDF + trends (pulls ENGE-01 in from v2)       |
| 3     | Boundary Keeper | What's explicitly out of scope?                        | Password reset/recovery flow (later reversed in v2 revision)     |
| 3     | Boundary Keeper | Definition of "done"?                                  | All 3 roles login + invitation E2E + visual polish + empty states|
| 4     | Failure Analyst | ENGE-03 coach notes / ENGE-04 branded PDF in or out?   | Both stay v2 (out of scope for Phase 7)                          |
| 4     | Failure Analyst | How does admin invite a coach (role assignment)?       | Single endpoint with role picker; admin chooses Coach or Client  |
| 4     | Failure Analyst | What happens to existing coach accounts?               | Backwards-compat — existing accounts work, new signups blocked   |

### v2 revision (2026-05-07) — folding in pending todos

| Round | Perspective     | Question summary                                              | Decision locked                                                                            |
|-------|-----------------|---------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| 1     | Researcher      | Which of the four new asks land in this phase?                 | Ideal = all 4. Cut line: defer reassignment to Phase 8; keep reset + user mgmt + invitations |
| 1     | Researcher      | Password recovery UX on /login?                                | Forgot-password link AND magic-link secondary CTA — both visible in Coach/Admin mode       |
| 2     | Simplifier      | User-management UI capabilities?                               | List + role edit + drill-down only. NO ban, NO delete (deferred)                          |
| 2     | Simplifier      | Delete-cascade rule?                                           | N/A — delete is out of scope                                                              |
| 2     | Simplifier      | Where does the invitation UI live?                             | Separate `/portal/admin/invitations` page with pending-invites list                       |

---

*Phase: 07-multi-tenant-auth-ux*
*Spec created: 2026-05-05*
*Spec revised: 2026-05-07 — folded in password reset, admin user-management page, invitations page; deferred reassignment to Phase 8*
*Next step: /gsd-discuss-phase 7 — implementation decisions (where role-routing lives, how to render coach-grouped list, which read-only Section 11 surface to use, which better-auth admin plugin endpoints to wire, etc.)*
