---
phase: 07-multi-tenant-auth-ux
verified: 2026-05-07T00:00:00Z
status: gaps_found
score: 8/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Logout properly invalidates the session cookie"
    status: failed
    reason: "Sidebar POSTs to /api/auth/logout (404 on Better Auth); .finally() redirects to /login but the session cookie is never revoked. Browser back-button re-enters portal as previous user. This is BL-03 from 07-REVIEW.md."
    artifacts:
      - path: "src/components/layout/Sidebar.tsx"
        issue: "Line 190: fetch('/api/auth/logout') — Better Auth exposes sign-out at /api/auth/sign-out; /api/auth/logout does not exist and returns 404. Session cookie is never cleared."
    missing:
      - "Replace the fetch('/api/auth/logout') call with authClient.signOut() from @/lib/auth-client, which handles cookie clearing before redirecting to /login."

  - truth: "minPasswordLength enforced at the API layer matches the UI's 8-character claim"
    status: failed
    reason: "src/lib/auth.ts sets minPasswordLength: 4 while the /reset-password UI enforces 8 characters client-side. Any non-UI caller (curl, direct authClient invocation) can set a 4-character password, bypassing the stated security floor. Milestone constraint: 'blood results and medical screening data require encryption at rest' makes 4-char passwords insufficient. This is BL-01 from 07-REVIEW.md."
    artifacts:
      - path: "src/lib/auth.ts"
        issue: "Line 17: minPasswordLength: 4 — should be 8 to match /reset-password page and the health data sensitivity requirement."
    missing:
      - "Change minPasswordLength: 4 to minPasswordLength: 8 in the emailAndPassword block of src/lib/auth.ts."

  - truth: "Clients do not see the 'New Assessment' creation CTA on the dashboard"
    status: failed
    reason: "The '+ New Assessment' header button (portal/page.tsx lines 168-173) renders unconditionally for ALL roles, including clients. REQ-7.12 acceptance criterion states: 'logged in as a client with zero assessments, the dashboard shows the client-specific empty message and no creation CTA.' The empty-state text in the Recent Assessments card is correctly gated (line 381), but the primary CTA in the page header is not."
    artifacts:
      - path: "src/app/portal/page.tsx"
        issue: "Lines 168-173: <button onClick={createAssessment}> has no role guard. Clients see '+ New Assessment' alongside the correct 'Your coach will set up your first assessment' message in the recent-assessments panel."
    missing:
      - "Wrap the '+ New Assessment' button in {userRole !== 'client' && (...)} so it is absent from the DOM for client sessions."

  - truth: "Last-admin guard rollback is reachable and correctly restores role on concurrent race"
    status: failed
    reason: "The rollback at src/app/api/admin/users/[userId]/role/route.ts lines 74-108 calls auth.api.setRole with the original headers. In the concurrent-demotion race scenario described in BL-02 (07-REVIEW.md), by the time the post-count detects 0 admins, the demoted user's session is no longer admin-privileged. The Better Auth admin plugin's setRole gates on caller being admin, so the rollback setRole call enters the catch{} block silently, the error is swallowed, and the user stays demoted while the response claims 'Previous role restored.' The pre-check at lines 48-56 correctly catches solo-admin self-demotion, but the concurrent-race path with two admins is unprotected."
    artifacts:
      - path: "src/app/api/admin/users/[userId]/role/route.ts"
        issue: "Lines 78-84: rollback via auth.api.setRole is unreachable when the caller's admin status has been concurrently revoked. The catch{} swallows the failure silently."
    missing:
      - "Wrap the admin-count check + role update in a DB transaction so the count and write are atomic. For SQLite use drizzle db.transaction with BEGIN IMMEDIATE; for Postgres use SELECT FOR UPDATE. The rollback path can then be removed since the race cannot occur inside a transaction."
      - "Alternatively, perform the role update directly via db.update(user) inside a transaction and skip auth.api.setRole for the write (only call it for session-invalidation side effects)."

  - truth: "/portal/assessment/[id]/report has an SSR ownership gate preventing clients from viewing other clients' reports"
    status: failed
    reason: "The report page (src/app/portal/assessment/[id]/report/page.tsx) is 'use client' with no SSR ownership check. The API at /api/assessments/${id} enforces ownership (hasAccess helper), so raw data does not leak — but: (1) the page shell renders unconditionally for any authenticated user with any UUID, including the 'Download PDF' button; (2) Section11 fires its own fetches from useEffect whose sub-routes may or may not all check hasAccess; (3) T-07-34 integration test in report-idor.test.ts is an it.skip comment, leaving the integration scenario untested. BL-05 from 07-REVIEW.md."
    artifacts:
      - path: "src/app/portal/assessment/[id]/report/page.tsx"
        issue: "Lines 7-21: no SSR session fetch, no ownership check before rendering. Page shell and Download PDF button appear for any authenticated user requesting any assessment UUID."
      - path: "tests/security/report-idor.test.ts"
        issue: "Lines 79-85: integration test is a comment (it.skip is commented out entirely), so cross-client IDOR on the report page is never exercised."
    missing:
      - "Convert /portal/assessment/[id]/report/page.tsx to a server component (or add a server layout) that calls auth.api.getSession, fetches the assessment, calls hasAccess, and issues notFound() or redirect('/portal') before returning any HTML."
      - "Activate the integration test in tests/security/report-idor.test.ts (un-skip the it.skip and implement using a mock handler or direct route test)."
---

# Phase 07: Multi-Tenant Auth UX — Verification Report

**Phase Goal:** Complete the deferred client and coach experiences from milestone v3.0 — distinct login flows per role, coach dashboard differentiated from admin, invitation flow accepts either coach or admin as inviter, multi-coach data scoping enforced (coach sees own clients only, admin sees all plus own clients), admins inherit coach capabilities, clients read-only on own data.
**Verified:** 2026-05-07T00:00:00Z
**Status:** gaps_found — 4 blockers (including 3 carried from 07-REVIEW.md)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (mapped from 07-SPEC.md requirements REQ-7.1 through REQ-7.12)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | REQ-7.1: Login page shows Coach/Admin and Client mode toggle; client can log in via magic link (prod) or password (dev) | VERIFIED | src/app/login/page.tsx uses useState<AuthMode>('coach') toggle; client mode renders magic-link form in prod, password form in dev; hardcoded `const mode = 'coach'` is removed |
| 2 | REQ-7.2: Public coach signup is blocked; existing accounts continue to work | VERIFIED | src/lib/auth.ts line 18: disableSignUp: true; no "Create one" link in login page; existing coach credentials unaffected by disableSignUp |
| 3 | REQ-7.3: Sidebar nav shows role-appropriate items only (client=Dashboard+MyAssessments; coach=Dashboard+Assessments+Clients; admin=same as coach plus Admin in footer) | VERIFIED | src/components/layout/Sidebar.tsx uses strict positive equality (role==='admin') with useMemo navItems; Admin link in separate footer section, only rendered when `role === 'admin'` |
| 4 | REQ-7.4: Admin dashboard groups assessments by coach with "My clients (you)" pinned first | VERIFIED | src/app/portal/page.tsx lines 28-43: grouped useMemo; lines 400-462: renders myClients group first with gold left border, then byCoach groups; coach name resolved from coachName field or fallback |
| 5 | REQ-7.5: Coach dashboard renders a single ungrouped list (no "My clients" header) | VERIFIED | grouped useMemo returns null when userRole !== 'admin' (line 29); coach sees flat assessment list at lines 463-469 |
| 6 | REQ-7.6: Client read-only Section 11 report + PDF download works; other client's assessment returns 403 | PARTIALLY VERIFIED | SSR redirect at src/app/portal/assessment/[id]/section/layout.tsx correctly redirects clients to /report before any editable section renders. Section11 component has no form inputs (display-only). PDF route enforces hasAccess with 403. BUT: /report page itself has no SSR ownership gate (BL-05) — see gap below |
| 7 | REQ-7.7: Client trends dashboard shows Recharts chart for ≥2 completed assessments, hidden otherwise | VERIFIED | src/app/portal/page.tsx: ClientTrendsSection gated on `userRole === 'client'` (line 475); completedCount < 2 returns empty-state message (line 652); chart uses MetricChart (Recharts AreaChart) |
| 8 | REQ-7.8: Password reset flow works end-to-end (email → /reset-password?token → credential update) | PARTIALLY VERIFIED | sendResetPassword wired in auth.ts (line 19-25); /reset-password page exists with token consumer; BUT minPasswordLength: 4 in auth.ts means API accepts 4-char passwords despite UI claiming 8-char minimum — BL-01 |
| 9 | REQ-7.9: Magic-link secondary CTA in Coach/Admin mode triggers the magic-link flow | VERIFIED | src/app/login/page.tsx lines 219-227: "Email me a sign-in link" button calls handleMagicLink; always shown (not NODE_ENV-gated); shares handleMagicLink with client mode |
| 10 | REQ-7.10: /portal/admin/users lists users with role, banned-status, counts; inline role change updates DB + writes audit_logs; last-admin guard prevents demoting only admin | PARTIALLY VERIFIED | Page exists and renders user list with columns. API route enforces requireAdmin. Role change writes audit_logs (lines 112-121). Pre-check at lines 48-56 correctly blocks solo-admin demotion. BUT: concurrent-demotion race rollback is unreachable (BL-02); /portal/admin/users and /portal/admin/invitations have no SSR admin gate (WR-04) |
| 11 | REQ-7.11: /portal/admin/invitations has invite form with role picker + past invitations list; coach POST with role:'coach' or 'admin' returns 403 | VERIFIED | Page exists with role picker (admin/coach/client); past invitations fetched from /api/admin/invitations; /api/invitations route returns 403 when coach sends role!='client' (line 27-29) |
| 12 | REQ-7.12: Role-appropriate empty states; client empty state has no creation CTA; coach/admin has "Create your first assessment" | FAILED | Empty-state text in Recent Assessments card correctly branches (line 381-396). BUT: the primary "+ New Assessment" button in the page header (lines 168-173) renders unconditionally for ALL roles including clients — a visible creation CTA is present for clients |
| 13 | Logout invalidates the session cookie before redirecting to /login | FAILED | Sidebar POSTs to /api/auth/logout (404). Session cookie never cleared. BL-03. |
| 14 | minPasswordLength enforced at API layer matches the UI 8-char claim | FAILED | auth.ts: minPasswordLength: 4; /reset-password: minLength={8}. BL-01. |

**Score:** 8/12 truths fully verified (REQ-7.6, REQ-7.8, REQ-7.10 partially pass with noted gaps; REQ-7.12 and 2 security controls fail outright)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth.ts` | disableSignUp + sendResetPassword wired | STUB (partial) | disableSignUp: true and sendResetPassword exist; minPasswordLength: 4 is a security defect |
| `src/app/reset-password/page.tsx` | Token-consuming form, glassmorphic shell | VERIFIED | 223 lines; authClient.resetPassword wired; useSearchParams; glassmorphic shell present |
| `src/app/login/page.tsx` | Mode toggle; no signup CTA; forgot-password + magic-link CTAs | VERIFIED | Toggle with coach/client modes; no signup link; forgot password at line 200; magic-link CTA at line 220 |
| `src/components/layout/Sidebar.tsx` | Role-based nav with strict equality | VERIFIED | navItems useMemo; Admin link in footer with role==='admin' guard |
| `src/app/portal/page.tsx` | Admin grouped view, coach flat list, client trends, role-aware empty states | PARTIAL | Admin grouping VERIFIED; coach flat list VERIFIED; trends VERIFIED; header "+ New Assessment" button not client-gated — gap |
| `src/app/portal/assessment/[id]/report/page.tsx` | Client read-only report with SSR ownership gate | STUB | 'use client' with no SSR ownership check; renders for any authenticated user with any UUID |
| `src/app/portal/assessment/[id]/section/layout.tsx` | SSR client redirect | VERIFIED | Correctly redirects client sessions to /report before any section renders |
| `src/app/portal/admin/users/page.tsx` | User list with role edit and last-admin guard | PARTIAL | Page exists; role edit wired; last-admin pre-check works for solo demotion; concurrent rollback path is unreachable (BL-02) |
| `src/app/portal/admin/invitations/page.tsx` | Invite form with role picker + past invitations | VERIFIED | Page exists; role picker (admin/coach/client); invitations list from /api/admin/invitations |
| `src/app/portal/admin/page.tsx` | Live "Users" link replacing "Coming Soon" placeholder | VERIFIED | "Users" card links to /portal/admin/users; "Invitations" card also present |
| `src/app/api/invitations/route.ts` | Role parameter with coach→client-only enforcement | VERIFIED | requestedRole from body; coach+role!='client' returns 403; admin can set any role |
| `src/app/api/admin/users/[userId]/role/route.ts` | Last-admin guard + role change + audit log | PARTIAL | Pre-check VERIFIED; audit log VERIFIED; concurrent rollback BL-02 |
| `src/components/layout/Sidebar.tsx` logout button | Proper session invalidation | FAILED | POSTs to /api/auth/logout (404); session cookie never cleared |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| auth.ts sendResetPassword | sendEmailViaSMTP2Go | import + call | WIRED | Line 20: sendEmailViaSMTP2Go({to: user.email, ...}) |
| /reset-password submit | authClient.resetPassword | authClient.resetPassword({newPassword, token}) | WIRED | Line 100 of reset-password/page.tsx |
| login forgot-password | authClient.requestPasswordReset | authClient.requestPasswordReset | WIRED | Line 78 of login/page.tsx |
| login magic-link CTA | authClient.signIn.magicLink | handleMagicLink | WIRED | Lines 54-61 of login/page.tsx |
| Sidebar logout button | session invalidation | fetch('/api/auth/logout') | NOT_WIRED | Endpoint 404s; should use authClient.signOut() |
| /api/admin/users/[userId]/role | audit_logs | logAuditEvent | WIRED | Lines 112-121 of role/route.ts |
| /api/invitations role guard | 403 for coach+non-client | session.user.role check | WIRED | Lines 27-29 of invitations/route.ts |
| portal/page.tsx admin grouped | coachId === session.user.id | grouped useMemo | WIRED | Lines 28-43 of portal/page.tsx |
| portal/page.tsx client trends | MetricChart (Recharts) | ClientTrendsSection | WIRED | Lines 475-479, 522+, MetricChart.tsx line 4 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| portal/page.tsx (admin grouped) | grouped (myClients, byCoach) | /api/assessments → assessments state | Yes — API queries DB with role-based scoping | FLOWING |
| portal/page.tsx (ClientTrendsSection) | chartData | /api/assessments/${id}/sections/${s} | Yes — DB-backed section data | FLOWING |
| portal/admin/users/page.tsx | users | /api/admin/users | Yes — DB user table with counts | FLOWING |
| portal/admin/invitations/page.tsx | invites | /api/admin/invitations | Yes — user table joined session | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for UI/behavioral tests (requires running server + authenticated sessions). Static checks used instead.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| disableSignUp present in auth.ts | grep "disableSignUp: true" src/lib/auth.ts | 1 match | PASS |
| sendResetPassword wired | grep "sendResetPassword:" src/lib/auth.ts | 1 match | PASS |
| Sidebar logout endpoint | grep "auth/logout\|auth/sign-out\|signOut" src/components/layout/Sidebar.tsx | /api/auth/logout (wrong endpoint) | FAIL |
| minPasswordLength | grep "minPasswordLength" src/lib/auth.ts | minPasswordLength: 4 | FAIL |
| /report page SSR gate | grep "auth.api.getSession\|requireSession\|requireAdmin" src/app/portal/assessment/\[id\]/report/page.tsx | No matches | FAIL |
| Section client redirect SSR | grep "auth.api.getSession" src/app/portal/assessment/\[id\]/section/layout.tsx | Found at line 28 | PASS |
| role guard coach→non-client | grep "role.*coach.*client\|coach.*Forbidden" src/app/api/invitations/route.ts | Line 27-29 present | PASS |
| + New Assessment client guard | grep "userRole.*client\|client.*New Assessment" src/app/portal/page.tsx (header area) | No guard on button lines 168-173 | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| REQ-7.1 | 07-04 | Client login re-enabled | SATISFIED | Login page toggle; client mode renders magic-link/password form |
| REQ-7.2 | 07-01, 07-04 | Public coach signup blocked | SATISFIED | disableSignUp: true; no signup CTA on /login |
| REQ-7.3 | 07-02 | Role-based sidebar nav | SATISFIED | navItems useMemo with strict positive equality |
| REQ-7.4 | 07-03, 07-05 | Coach-grouped admin dashboard | SATISFIED | grouped useMemo; "My clients (you)" pinned first |
| REQ-7.5 | 07-05 | Coach dashboard unchanged (ungrouped) | SATISFIED | grouped returns null for non-admin; flat list rendered |
| REQ-7.6 | 07-08 | Client read-only report + PDF | PARTIALLY BLOCKED | SSR section redirect correct; Section11 is display-only; PDF enforces hasAccess. /report page has no SSR gate (BL-05) |
| REQ-7.7 | 07-05 | Client trends dashboard (Recharts) | SATISFIED | ClientTrendsSection with MetricChart; gated on completedCount >= 2 |
| REQ-7.8 | 07-01, 07-04 | Password reset flow | PARTIALLY BLOCKED | Email sends; /reset-password page works; BUT minPasswordLength: 4 (BL-01) |
| REQ-7.9 | 07-04 | Magic-link secondary CTA | SATISFIED | "Email me a sign-in link" button in coach mode |
| REQ-7.10 | 07-07 | Admin user-management page | PARTIALLY BLOCKED | Page exists; role edit + audit log; last-admin pre-check ok; concurrent rollback unreachable (BL-02) |
| REQ-7.11 | 07-06, 07-07 | Admin invitations page + role picker | SATISFIED | /portal/admin/invitations exists; role enforcement at /api/invitations |
| REQ-7.12 | 07-05 | Role-appropriate empty states; no Create CTA for clients | FAILED | Empty-state text correct; "+ New Assessment" header button not client-gated |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/layout/Sidebar.tsx` | 190 | `fetch('/api/auth/logout')` — endpoint does not exist in Better Auth | Blocker | Session cookie never invalidated; back-button re-enters portal |
| `src/lib/auth.ts` | 17 | `minPasswordLength: 4` — below UI-stated 8-char floor | Blocker | 4-char passwords accepted at API level; health data security requirement not met |
| `src/app/portal/page.tsx` | 168-173 | `+ New Assessment` button with no `userRole !== 'client'` guard | Blocker | Clients see creation CTA; REQ-7.12 acceptance criterion fails |
| `src/app/portal/assessment/[id]/report/page.tsx` | 7-21 | `'use client'` with useEffect fetch; no SSR ownership gate | Blocker | Page shell renders for any authenticated UUID; IDOR defense relies solely on API |
| `src/app/api/admin/users/[userId]/role/route.ts` | 78-84 | Rollback `auth.api.setRole` in catch{}; unreachable in self-demotion race | Blocker | Last-admin race window not actually closed; audit log lies about restore |
| `src/app/portal/admin/users/page.tsx` | 39-43 | Client-only admin gate via useEffect; no server layout | Warning | Admin bundle served to coach sessions; defense-in-depth gap (WR-04) |
| `src/app/portal/admin/invitations/page.tsx` | 35-39 | Client-only admin gate via useEffect; no server layout | Warning | Admin bundle served to coach sessions |

---

### Human Verification Required

#### 1. Client magic-link login end-to-end (REQ-7.1 production path)

**Test:** With `NODE_ENV=production`, visit `/login`, switch to "Client" mode, enter a client account email, click "Send sign-in link". Check email inbox.
**Expected:** Email arrives within 5 minutes containing a magic-link URL; clicking the URL signs in the client and lands on `/portal`.
**Why human:** Requires live SMTP2Go delivery and actual email client verification.

#### 2. Password reset email delivery (REQ-7.8)

**Test:** In Coach/Admin mode on `/login`, enter an existing coach email, click "Forgot password?". Check email inbox.
**Expected:** Email arrives with `/reset-password?token=...` URL; opening URL shows "Set a new password" form; submitting new password allows immediate sign-in.
**Why human:** Requires live SMTP2Go; token is time-bounded.

#### 3. Sidebar logout session invalidation after fix (BL-03)

**Test:** After fixing the logout endpoint, log in as a coach. Click Logout. Then press browser back button.
**Expected:** Pressing back does NOT re-enter the portal; user is redirected to `/login`.
**Why human:** Session cookie behavior requires browser interaction to verify.

#### 4. Admin grouped dashboard visual ordering (REQ-7.4)

**Test:** Log in as admin; ensure at least one assessment owned by the admin user and one owned by a different coach. Load `/portal`.
**Expected:** "My clients (you)" section appears first with gold left border; other coach's section appears below with navy border.
**Why human:** Requires seeded multi-coach data and visual inspection.

---

### Gaps Summary

5 blocker-level gaps found across 4 of 12 requirements:

**BL-01 (auth.ts minPasswordLength: 4):** The health data sensitivity constraint requires passwords stronger than 4 characters. The UI claims 8; the API accepts 4. A one-line fix: change `minPasswordLength: 4` to `minPasswordLength: 8`.

**BL-02 (last-admin rollback unreachable):** The concurrent-race rollback in `/api/admin/users/[userId]/role/route.ts` swallows its own failure. The pre-check correctly blocks single-admin self-demotion, but two concurrent admin demotions can result in 0 admins with a misleading "role restored" response. Requires a DB transaction wrapping the count + role update.

**BL-03 (Sidebar logout 404):** `fetch('/api/auth/logout')` returns 404 (Better Auth endpoint is `/api/auth/sign-out`). The `.finally()` redirect to `/login` happens regardless, but the session cookie is never cleared. Replace with `authClient.signOut()` from `@/lib/auth-client`.

**BL-04 (+ New Assessment button not client-gated):** REQ-7.12 requires no creation CTA for clients. The empty-state message in the Recent Assessments panel is correctly client-aware, but the primary header button at the top of the dashboard page is unconditional. Wrap with `{userRole !== 'client' && <button ...>}`.

**BL-05 (/report page no SSR ownership gate):** The report page renders its shell for any authenticated user with any UUID. The data API enforces `hasAccess`, so PII does not leak, but the page chrome (including a Download PDF button that 403s on click) is visible for unauthorized UUIDs, and Section11's sub-fetches are not independently audited. Convert to a server component or add a server layout that gates on session + ownership before rendering.

Note on T-07-34: the integration test in `tests/security/report-idor.test.ts` exists as a comment (`// it.skip(...)` style), meaning it never runs. The static-source tests pass but do not verify behavioral IDOR protection.

---

*Verified: 2026-05-07T00:00:00Z*
*Verifier: Claude (gsd-verifier)*
