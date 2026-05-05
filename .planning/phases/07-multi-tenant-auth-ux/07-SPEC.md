# Phase 7: Multi-tenant Auth UX — Specification

**Created:** 2026-05-05
**Ambiguity score:** 0.16
**Requirements:** 9 locked

## Goal

Re-enable a working client login experience and differentiate the dashboard, sidebar, and invitation flow by role (admin / coach / client), so all three roles land in role-appropriate UIs that are scoped to the data they're allowed to see — completing the deferred client/coach UX from milestone v3.0.

## Background

Auth backbone is complete (Phase 2 + Phase 4): Better Auth provides RBAC for `admin | coach | client`, email/password + magic-link sign-in, and an invitations API. API-side scoping is correct (`admin → all`, `coach → own`, `client → assigned`). The UI layer, however, is still single-role:

- `src/app/login/page.tsx` line 13 hard-codes `const mode = 'coach' as AuthMode;` — the entire client-mode UI block is dead code, unreachable from the login page. Comment on the same line: *"Client portal not yet ready — locked to coach mode."*
- `src/app/portal/page.tsx` is a single dashboard for all roles. Conditional differences are limited to a localStorage welcome banner for clients (line 22) and gating the "Invite Client" form to coach/admin (line 254). When an admin logs in, all assessments render in one undifferentiated list.
- `src/components/layout/Sidebar.tsx` shows the same nav (Dashboard / Assessments / Clients / Admin) to every role — including the Admin link, which is reachable by clients.
- `src/app/api/invitations/route.ts` only ever creates a `client` role user (line 51). Admin has no UI path to invite a coach.
- `/login` exposes a public "Create one" link → `authClient.signUp.email` → default role `coach` (per `src/lib/auth.ts` line 52). Anyone on the open internet can self-register as a coach.

This phase replaces all of the above with role-aware UI that matches the API's existing scoping.

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

8. **Admin invitation with role picker**: A single invite UI lets admins invite either a coach or a client; coaches can only invite clients.
   - Current: `POST /api/invitations` always sets `role = 'client'` (line 51); there is no UI path to invite a coach.
   - Target: The invitation API accepts a `role: 'coach' | 'client'` parameter. Admins see a role picker (default Client) on the invite form; coaches see no picker (always invites client). A coach is forbidden from passing `role: 'coach'`.
   - Acceptance: Admin POST to `/api/invitations` with `role: 'coach'` creates a user with role `coach` and emails them a sign-in link; coach POST with `role: 'coach'` returns 403; coach POST without `role` (or with `role: 'client'`) creates a client as today.

9. **Role-appropriate empty states and welcome content**: Each dashboard renders content that makes sense for its role when data is empty or sparse.
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
- Admin invitation form with role picker (coach or client)
- Coach invitation API extended to accept `role` parameter with role-based authorization
- Role-appropriate empty states and welcome content

**Out of scope:**
- ENGE-03 coach notes visible to client — defer to v2 (separate UI surface, requires schema work)
- ENGE-04 branded PDF export with coach/business logo — defer to v2 (requires logo upload + PDF render changes)
- Password reset / recovery flow — Better Auth supports it but no UI/email flow built; defer until needed for launch
- Multi-tenant data isolation beyond `coachId` (e.g. business/organisation entity) — current single-business model is sufficient
- Mobile native app, video consultation, wearable integrations — already excluded at the milestone level

## Constraints

- **Backwards compatibility:** Existing coach accounts (including the seeded admin) MUST continue to log in unchanged after public signup is disabled. No user-record migration is allowed.
- **Tech stack:** Next.js 16 + React 19 + Tailwind v4 + Better Auth + Drizzle. Trends chart MUST use Recharts (already a project dependency).
- **API authority:** All role enforcement MUST remain in the API layer (`src/app/api/*` route handlers). UI-side hiding (sidebar nav, role picker) is defence-in-depth, not the source of truth.
- **No production deploys during phase work:** Per session constraint — verification happens locally; production push is a separate, explicit step.
- **Magic link in production, password in dev:** The existing `process.env.NODE_ENV` branch in the client login form is preserved as-is.

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
- [ ] Admin invite form has a role picker; POST with `role: 'coach'` creates a coach account
- [ ] Coach POST to `/api/invitations` with `role: 'coach'` returns 403
- [ ] Client dashboard with zero assessments shows "Your coach will set up your first assessment" with no Create CTA

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                      |
|--------------------|-------|------|--------|------------------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | All 4 open roadmap questions resolved                       |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Explicit in/out lists; v2 items called out                  |
| Constraint Clarity | 0.80  | 0.65 | ✓      | Backwards-compat for existing coaches; tech stack pinned    |
| Acceptance Criteria| 0.78  | 0.70 | ✓      | 16 pass/fail criteria covering all 9 requirements           |
| **Ambiguity**      | 0.16  | ≤0.20| ✓      | Gate passed                                                 |

## Interview Log

| Round | Perspective     | Question summary                                       | Decision locked                                                  |
|-------|-----------------|--------------------------------------------------------|------------------------------------------------------------------|
| 1     | Researcher      | Login UX differentiation (URL vs toggle vs auto)?      | Single URL with mode toggle (re-enable existing dead-coded UI)   |
| 1     | Researcher      | Coach onboarding (open vs invite-only vs pending)?     | Invitation-only by admin; remove public coach signup             |
| 2     | Researcher/Simp | Admin dashboard presentation?                          | Coach-grouped list, "My clients (you)" pinned at top             |
| 2     | Researcher/Simp | Sidebar nav role filtering?                            | Strict role-based nav (client/coach/admin each get distinct set) |
| 3     | Boundary Keeper | Minimum client experience?                             | List + read-only + PDF + trends (pulls ENGE-01 in from v2)       |
| 3     | Boundary Keeper | What's explicitly out of scope?                        | Password reset/recovery flow                                     |
| 3     | Boundary Keeper | Definition of "done"?                                  | All 3 roles login + invitation E2E + visual polish + empty states|
| 4     | Failure Analyst | ENGE-03 coach notes / ENGE-04 branded PDF in or out?   | Both stay v2 (out of scope for Phase 7)                          |
| 4     | Failure Analyst | How does admin invite a coach (role assignment)?       | Single endpoint with role picker; admin chooses Coach or Client  |
| 4     | Failure Analyst | What happens to existing coach accounts?               | Backwards-compat — existing accounts work, new signups blocked   |

---

*Phase: 07-multi-tenant-auth-ux*
*Spec created: 2026-05-05*
*Next step: /gsd-discuss-phase 7 — implementation decisions (where role-routing lives, how to render coach-grouped list, which read-only Section 11 surface to use, etc.)*
