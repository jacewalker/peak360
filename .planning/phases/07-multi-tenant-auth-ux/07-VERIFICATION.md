---
phase: 07-multi-tenant-auth-ux
verified: 2026-05-07T17:16:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/12
  gaps_closed:
    - "BL-01 — minPasswordLength enforced at API matches UI's 8-character claim"
    - "BL-02 — Last-admin guard implemented as atomic db.transaction (race window closed by construction)"
    - "BL-03 — Sidebar logout calls authClient.signOut() (Better Auth) instead of broken /api/auth/logout"
    - "BL-04 — '+ New Assessment' header CTA gated by strict-positive role guard (coach || admin)"
    - "BL-05 — /portal/assessment/[id]/report converted to async server component with auth.api.getSession + hasAccess + redirect/notFound SSR gate"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Client magic-link login end-to-end (REQ-7.1 production path)"
    expected: "With NODE_ENV=production, /login Client mode 'Send sign-in link' → email arrives → click delivers user to /portal authenticated as client"
    why_human: "Requires live SMTP2Go delivery and email-client interaction"
  - test: "Password reset email delivery (REQ-7.8)"
    expected: "Forgot password → email with /reset-password?token=... arrives → submitting new 8-char password allows immediate sign-in"
    why_human: "Requires live SMTP2Go; token is time-bounded"
  - test: "Sidebar logout session invalidation (BL-03 verification)"
    expected: "Log in as coach, click Logout, press browser back → does NOT re-enter portal; redirected to /login because session cookie is cleared"
    why_human: "Browser cookie behavior + back-button interaction must be observed in a live browser"
  - test: "/portal/assessment/[id]/report SSR ownership gate (BL-05 verification)"
    expected: "As client A, request /portal/assessment/{client-B-id}/report → 3xx redirect to /portal observed in DevTools BEFORE any HTML chrome / Download PDF button is sent"
    why_human: "Server-side redirect timing and the absence of page-shell HTML must be observed in a real browser session"
  - test: "Admin grouped dashboard visual ordering (REQ-7.4)"
    expected: "Logged in as admin with one self-owned + one other-coach-owned assessment, /portal renders 'My clients (you)' first with gold border, then other coach's section below with navy border"
    why_human: "Requires seeded multi-coach data and visual inspection of card ordering / colors"
  - test: "Last-admin guard concurrent demotion (BL-02 atomic transaction verification)"
    expected: "With two admin users A and B, simultaneously POST /api/admin/users/{B}/role → coach from A's session AND POST /api/admin/users/{A}/role → coach from B's session: exactly one succeeds; the loser receives 400 'Cannot change the role of the only admin'. Final admin count is exactly 1."
    why_human: "Concurrency race must be exercised against a live server with two active admin sessions; static-source assertions cannot prove transactional isolation behavior"
---

# Phase 07: Multi-Tenant Auth UX — Verification Report (Re-verified after Wave 4)

**Phase Goal:** Complete the deferred client and coach experiences from milestone v3.0 — distinct login flows per role, coach dashboard differentiated from admin, invitation flow accepts either coach or admin as inviter, multi-coach data scoping enforced (coach sees own clients only, admin sees all plus own clients), admins inherit coach capabilities, clients read-only on own data.
**Verified:** 2026-05-07T17:16:00Z
**Status:** human_needed — all 5 wave-4 blockers RESOLVED; remaining items require live-browser / live-SMTP / concurrency verification (deferred from initial verification, unchanged by wave 4).
**Re-verification:** Yes — initial verification was 2026-05-07T00:00:00Z (gaps_found, 8/12).

---

## Wave 4 Gap-Closure Outcome

| Blocker | Original Issue | Wave 4 Plan | Fix Verified | Status |
|---------|---------------|-------------|--------------|--------|
| BL-01 | `minPasswordLength: 4` in `src/lib/auth.ts` violates 8-char UI claim | 07-10 Task 1 | `src/lib/auth.ts:17` reads `minPasswordLength: 8`; `disableSignUp: true` and `sendResetPassword:` unchanged | RESOLVED |
| BL-02 | Last-admin rollback unreachable in concurrent-race | 07-10 Task 2 | `src/app/api/admin/users/[userId]/role/route.ts` lines 53-78 wrap count + role-write in `db.transaction(async (tx) => …)`; `LastAdminError` class throws inside tx; rollback path removed; `auth.api.setRole` called once post-commit for session-invalidation only; `'user.role.rollback'` and `status: 409` absent from file | RESOLVED |
| BL-03 | Sidebar logout fetched 404 endpoint `/api/auth/logout` | 07-11 Task 1 | `src/components/layout/Sidebar.tsx:188-198` onClick is `async () => { try { await authClient.signOut(); } catch {} window.location.href = '/login'; }`; literal `/api/auth/logout` absent | RESOLVED |
| BL-04 | `+ New Assessment` header button rendered for clients | 07-11 Task 2 | `src/app/portal/page.tsx:168-175` wraps button in `{(userRole === 'coach' \|\| userRole === 'admin') && (…)}` — strict-positive guard. 2 occurrences of the guard pattern (this button + line 287 Invite Client form) | RESOLVED |
| BL-05 | `/portal/assessment/[id]/report` was `'use client'` with no SSR gate | 07-12 Task 1 | Page is now `export default async function ReportPage(...)`; reads `auth.api.getSession({ headers: await headers() })`; fetches row via `db.select().from(assessments)`; calls `hasAccess(role, userId, row)`; `redirect('/login')` on no session, `notFound()` on missing row, `redirect('/portal')` on hasAccess failure — all BEFORE any JSX is returned. `'use client'`, `useState`, `useEffect`, client-side `fetch` for assessment data are all absent. | RESOLVED |

---

## Goal Achievement

### Observable Truths (mapped from 07-SPEC.md REQ-7.1 through REQ-7.12 + 5 wave-4 closure truths)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | REQ-7.1: Login page shows Coach/Admin and Client mode toggle; client can log in via magic link (prod) or password (dev) | VERIFIED | Carried forward — `src/app/login/page.tsx` toggle confirmed in initial verification; unchanged in wave 4 |
| 2 | REQ-7.2: Public coach signup is blocked; existing accounts work | VERIFIED | `src/lib/auth.ts:18` `disableSignUp: true` (verified post-Task-1) |
| 3 | REQ-7.3: Sidebar role-appropriate items only | VERIFIED | `src/components/layout/Sidebar.tsx` strict-positive role checks unchanged in wave 4 |
| 4 | REQ-7.4: Admin dashboard groups assessments by coach; "My clients (you)" pinned first | VERIFIED | Carried forward (visual ordering still requires human spot-check, listed below) |
| 5 | REQ-7.5: Coach dashboard renders single ungrouped list | VERIFIED | Carried forward |
| 6 | REQ-7.6: Client read-only Section 11 report + PDF download; cross-client returns 403/redirect | VERIFIED | Section layout SSR redirect (carried) + report page now SSR-gated (BL-05 fixed); PDF route hasAccess unchanged + integration test active in `tests/security/report-idor.test.ts` |
| 7 | REQ-7.7: Client trends dashboard shows Recharts chart for ≥2 completed assessments | VERIFIED | Carried forward |
| 8 | REQ-7.8: Password reset flow end-to-end (now with 8-char API floor) | VERIFIED | `sendResetPassword` wired (carried); `minPasswordLength: 8` (BL-01 fixed) |
| 9 | REQ-7.9: Magic-link secondary CTA in Coach/Admin mode | VERIFIED | Carried forward |
| 10 | REQ-7.10: /portal/admin/users with role edit + atomic last-admin guard | VERIFIED | Pre-check + audit log carried; transactional guard (BL-02 fixed) replaces the unreachable rollback |
| 11 | REQ-7.11: /portal/admin/invitations role picker + 403 enforcement | VERIFIED | Carried forward |
| 12 | REQ-7.12: Role-appropriate empty states; client has NO creation CTA | VERIFIED | Empty-state copy correct (carried) AND header `+ New Assessment` button now gated by strict-positive `coach \|\| admin` guard (BL-04 fixed) |
| 13 | Logout invalidates the session cookie before redirecting to /login | VERIFIED (BL-03) | `authClient.signOut()` is awaited before `window.location.href = '/login'`; broken `/api/auth/logout` literal absent from Sidebar source |
| 14 | minPasswordLength enforced at API layer matches the UI 8-char claim | VERIFIED (BL-01) | `src/lib/auth.ts:17` reads `minPasswordLength: 8`; static-source test in `tests/security/auth-config.test.ts` asserts both `/minPasswordLength:\s*8/` and `not.toMatch(/minPasswordLength:\s*4/)` |

**Score:** 14/14 truths verified.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/auth.ts` | `disableSignUp: true`, `sendResetPassword`, `minPasswordLength: 8` | VERIFIED | All three present on lines 17-25; `disableSignUp` and `sendResetPassword` unchanged from initial verification |
| `src/app/api/admin/users/[userId]/role/route.ts` | Atomic transaction containing count + role-write; verbatim error copy preserved; rollback path removed | VERIFIED | `db.transaction(async (tx: any) => { … })` at line 57; `LastAdminError` thrown when `before <= 1`; `tx.update(user)…where(eq(user.id, userId))`; verbatim "Cannot change the role of the only admin. Promote another user to admin first." preserved. Single `auth.api.setRole` post-commit. `'user.role.rollback'` and `status: 409` absent. |
| `src/components/layout/Sidebar.tsx` | Logout uses `authClient.signOut()`; broken endpoint absent | VERIFIED | `onClick={async () => { try { await authClient.signOut(); } catch {} window.location.href = '/login'; }}` at lines 188-198. `grep -q '/api/auth/logout'` returns 1 (no match). |
| `src/app/portal/page.tsx` | Header `+ New Assessment` gated by strict-positive coach/admin guard | VERIFIED | Lines 168-175 wrap the button in `(userRole === 'coach' \|\| userRole === 'admin')`; identical pattern reused at line 287 Invite Client form. Note: chosen interpretation strictly stronger than VERIFICATION row-3 missing-list literal (`!== 'client'`) — also hides during loading; both forms satisfy REQ-7.12. |
| `src/app/portal/assessment/[id]/report/page.tsx` | Async server component; SSR session + hasAccess + redirect/notFound | VERIFIED | `export default async function ReportPage(...)`; `auth.api.getSession({ headers: await headers() })`; `db.select().from(assessments)`; inlined `hasAccess(role, userId, row)`; `redirect('/login')` on no session, `notFound()` on missing row, `redirect('/portal')` on hasAccess failure. `'use client'`, `useState`, `useEffect`, client-side `fetch` for `/api/assessments/` absent. |
| `tests/security/auth-config.test.ts` | 4 tests including `minPasswordLength: 8` assertion | VERIFIED | 4 tests pass; new test asserts `toMatch(/minPasswordLength:\s*8/)` and `not.toMatch(/minPasswordLength:\s*4/)` |
| `tests/security/last-admin-guard.test.ts` | 7 tests including `db.transaction` shape, no `'user.role.rollback'`, no `status: 409`, single `auth.api.setRole` | VERIFIED | 7 tests pass; rollback assertion removed; transactional-shape assertion present |
| `tests/security/sidebar-role-flash.test.tsx` | 8 tests including BL-03 regression guards (signOut present, /api/auth/logout absent, redirect-after-signOut) | VERIFIED | 8 tests pass; BL-03 describe block adds 3 new assertions on Sidebar source |
| `tests/security/report-idor.test.ts` | 11 tests including BL-05 SSR shape + ordering-lock-in + active 403 integration test | VERIFIED | 11 tests pass; old "no @/lib/db import" assertion rewritten to assert SSR design; active integration test invokes PDF route GET with vi.doMock; ordering-lock-in test asserts `hasAccess(` byte offset precedes `renderToBuffer(` and `loadReportData(` in the PDF route |

---

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| auth.ts sendResetPassword | sendEmailViaSMTP2Go | import + call | WIRED | Carried forward |
| /reset-password submit | authClient.resetPassword | authClient.resetPassword | WIRED | Carried forward |
| login forgot-password | authClient.requestPasswordReset | requestPasswordReset | WIRED | Carried forward |
| login magic-link CTA | authClient.signIn.magicLink | handleMagicLink | WIRED | Carried forward |
| Sidebar logout | Better Auth /api/auth/sign-out | authClient.signOut() | WIRED (BL-03 fixed) | `authClient.signOut()` awaited before redirect; broken `/api/auth/logout` literal absent |
| /api/admin/users/[userId]/role | audit_logs | logAuditEvent | WIRED | Carried forward |
| /api/admin/users/[userId]/role | atomic count + write | db.transaction | WIRED (BL-02 fixed) | Drizzle `db.transaction(async (tx) => …)` wraps count + `tx.update(user)` |
| /api/invitations role guard | 403 for coach+non-client | session.user.role check | WIRED | Carried forward |
| /portal/assessment/[id]/report | server-side ownership gate | auth.api.getSession + hasAccess | WIRED (BL-05 fixed) | Server component reads session, fetches row, checks hasAccess, redirects/notFound BEFORE rendering |
| /portal page createAssessment header CTA | role guard | strict-positive coach/admin | WIRED (BL-04 fixed) | `(userRole === 'coach' \|\| userRole === 'admin')` wraps the button |

---

### Behavioral Spot-Checks

`npm test -- --run tests/security/`:

```
Test Files  6 passed (6)
     Tests  38 passed (38)
```

| Behavior | Check | Result | Status |
| -------- | ----- | ------ | ------ |
| Security regression suite green | `npm test -- --run tests/security/` | 38/38 pass | PASS |
| BL-01 — minPasswordLength | `grep -F 'minPasswordLength: 8' src/lib/auth.ts` | Match | PASS |
| BL-01 — old value gone | `grep -F 'minPasswordLength: 4' src/lib/auth.ts` | No match | PASS |
| BL-02 — atomic transaction | `grep -F 'db.transaction' src/app/api/admin/users/[userId]/role/route.ts` | 2 matches (comment + call) | PASS |
| BL-02 — variable name pinned | `grep -F 'before <= 1' src/app/api/admin/users/[userId]/role/route.ts` | Match | PASS |
| BL-02 — rollback removed | `grep -F 'user.role.rollback' src/app/api/admin/users/[userId]/role/route.ts` | No match | PASS |
| BL-02 — 409 removed | `grep -F 'status: 409' src/app/api/admin/users/[userId]/role/route.ts` | No match | PASS |
| BL-02 — single setRole post-commit | `grep -c 'auth.api.setRole' src/app/api/admin/users/[userId]/role/route.ts` | 1 | PASS |
| BL-03 — signOut wired | `grep -F 'authClient.signOut' src/components/layout/Sidebar.tsx` | Match | PASS |
| BL-03 — broken endpoint gone | `grep -q '/api/auth/logout' src/components/layout/Sidebar.tsx` | No match | PASS |
| BL-04 — strict-positive guard | `grep -c "userRole === 'coach' \|\| userRole === 'admin'" src/app/portal/page.tsx` | 2 (header CTA + Invite Client) | PASS |
| BL-04 — button copy preserved | `grep -c '+ New Assessment' src/app/portal/page.tsx` | 1 | PASS |
| BL-05 — server component | `grep -q "'use client'" src/app/portal/assessment/[id]/report/page.tsx` | No match | PASS |
| BL-05 — SSR session read | `grep -F 'auth.api.getSession' src/app/portal/assessment/[id]/report/page.tsx` | Match | PASS |
| BL-05 — hasAccess gate | `grep -c 'hasAccess(' src/app/portal/assessment/[id]/report/page.tsx` | 4 (signature + call + 3 strategy branches) | PASS |
| BL-05 — no client-side fetch | `grep -q 'useState\|useEffect' src/app/portal/assessment/[id]/report/page.tsx` | No match | PASS |

---

### Anti-Patterns / Tech Debt

The 5 blocker-level anti-patterns from the prior verification are all resolved:

| File | Line (prior) | Pattern | Severity | Status |
| ---- | ------------ | ------- | -------- | ------ |
| `src/components/layout/Sidebar.tsx` | 190 (was) | `fetch('/api/auth/logout')` 404 endpoint | Blocker | RESOLVED — `authClient.signOut()` awaited |
| `src/lib/auth.ts` | 17 (was) | `minPasswordLength: 4` below UI floor | Blocker | RESOLVED — now 8 |
| `src/app/portal/page.tsx` | 168-173 (was) | `+ New Assessment` button no role guard | Blocker | RESOLVED — strict-positive coach/admin guard |
| `src/app/portal/assessment/[id]/report/page.tsx` | 7-21 (was) | `'use client'` with useEffect fetch; no SSR gate | Blocker | RESOLVED — full server-component conversion |
| `src/app/api/admin/users/[userId]/role/route.ts` | 78-84 (was) | Unreachable rollback `setRole` in catch{} | Blocker | RESOLVED — replaced by atomic db.transaction |

**Warnings carried forward (not introduced by wave 4, intentionally out-of-scope):**

| File | Pattern | Severity | Note |
| ---- | ------- | -------- | ---- |
| `src/app/portal/admin/users/page.tsx` | Client-only admin gate via useEffect; no server layout | Warning (WR-04) | Defense-in-depth gap; admin bundle still served to coach sessions before redirect — out of scope for wave 4 gap closure |
| `src/app/portal/admin/invitations/page.tsx` | Client-only admin gate via useEffect | Warning (WR-04) | Same as above |
| `src/app/portal/assessment/[id]/report/page.tsx` | hasAccess() inlined (duplicates PDF route) | Info | Documented follow-up: extract to `src/lib/access.ts` |
| Postgres last-admin guard | `SELECT … FOR UPDATE` not added | Info | Documented limitation: SQLite serializes per-process; multi-admin Postgres deployment would need row-level lock — deferred follow-up |

**Pre-existing test failures (NOT regressions from this phase):**

The user explicitly noted ~22 unrelated failing tests in `src/__tests__/components/layout.test.tsx`, `src/__tests__/sections/sections.test.tsx`, `src/__tests__/pages/home.test.tsx`, `src/lib/backup.test.ts`. These pre-date wave 4 (confirmed at commit `f1b4c0c`) and do NOT affect phase 7 sign-off. Treated as existing tech debt.

---

### Requirements Coverage (REQ-7.1 through REQ-7.12 — locked in 07-SPEC.md)

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| REQ-7.1 | 07-04 | Client login re-enabled with mode toggle | SATISFIED | Carried forward; magic-link production path needs human verification |
| REQ-7.2 | 07-01, 07-04 | Public coach signup blocked | SATISFIED | `disableSignUp: true` + no signup CTA on /login |
| REQ-7.3 | 07-02 | Role-based sidebar nav | SATISFIED | Strict-positive equality |
| REQ-7.4 | 07-03, 07-05 | Coach-grouped admin dashboard | SATISFIED | Visual ordering needs human verification |
| REQ-7.5 | 07-05 | Coach dashboard ungrouped | SATISFIED | grouped useMemo returns null for non-admin |
| REQ-7.6 | 07-08, **07-12** | Client read-only Section 11 report + PDF + cross-client 403 | SATISFIED | Section-layout SSR redirect (carried) + **report-page SSR ownership gate (BL-05 fixed)** + PDF route hasAccess + active integration test |
| REQ-7.7 | 07-05 | Client trends dashboard | SATISFIED | Carried forward |
| REQ-7.8 | 07-01, 07-04, **07-10** | Password reset flow with 8-char API floor | SATISFIED | sendResetPassword wired + **minPasswordLength: 8 (BL-01 fixed)** |
| REQ-7.9 | 07-04 | Magic-link secondary CTA | SATISFIED | Carried forward |
| REQ-7.10 | 07-07, **07-10** | Admin user-management with atomic last-admin guard | SATISFIED | Pre-check + audit log + **atomic db.transaction (BL-02 fixed)** |
| REQ-7.11 | 07-06, 07-07 | Admin invitations + role picker + 403 | SATISFIED | Carried forward |
| REQ-7.12 | 07-05, **07-11** | Role-appropriate empty states; no client creation CTA | SATISFIED | Empty-state copy + **header CTA gated (BL-04 fixed)** |

12/12 requirements SATISFIED in static analysis. 5 items deferred to human verification (live SMTP, browser cookie behavior, visual ordering, concurrency).

---

### Human Verification Required

#### 1. Client magic-link login end-to-end (REQ-7.1 production path)
**Test:** With `NODE_ENV=production`, visit `/login`, switch to "Client" mode, enter a client account email, click "Send sign-in link". Check email inbox.
**Expected:** Email arrives within 5 minutes containing a magic-link URL; clicking signs in the client and lands on `/portal`.
**Why human:** Live SMTP2Go delivery + email-client interaction.

#### 2. Password reset email delivery (REQ-7.8)
**Test:** In Coach/Admin mode on `/login`, enter an existing coach email, click "Forgot password?". Check inbox; reset to a NEW 8-character password.
**Expected:** Email arrives with `/reset-password?token=...`; 8-char password accepted; immediate sign-in works. (Try a 7-char password — should be rejected by the API now that `minPasswordLength: 8`.)
**Why human:** Live SMTP2Go; token is time-bounded.

#### 3. Sidebar logout session invalidation (BL-03 verification)
**Test:** Log in as coach. Click Logout in sidebar. Press browser back button.
**Expected:** Back does NOT re-enter portal; user is on `/login`. DevTools Network tab shows POST `/api/auth/sign-out` with 200 + Set-Cookie clearing the session cookie.
**Why human:** Browser cookie behavior + back-button must be observed live.

#### 4. /portal/assessment/[id]/report SSR ownership gate (BL-05 verification)
**Test:** As client A, navigate to `/portal/assessment/{client-B-id}/report` (substituting a UUID owned by client B).
**Expected:** A 3xx redirect to `/portal` is observed in DevTools BEFORE any HTML body / Download PDF button is sent. (Compare to `/portal/assessment/{own-id}/report` — page chrome renders normally.)
**Why human:** SSR redirect happens before any HTML; must be observed in network panel.

#### 5. Admin grouped dashboard visual ordering (REQ-7.4)
**Test:** Log in as admin; ensure at least one assessment owned by the admin user and one owned by a different coach. Load `/portal`.
**Expected:** "My clients (you)" section appears first with gold left border; other coach's section below with navy border.
**Why human:** Seeded multi-coach data + visual inspection of card ordering and colors.

#### 6. Last-admin guard concurrent demotion (BL-02 atomic transaction verification)
**Test:** With two admin users A and B, simultaneously fire two POSTs:
- POST `/api/admin/users/{B}/role` with `{role: 'coach'}` from A's session
- POST `/api/admin/users/{A}/role` with `{role: 'coach'}` from B's session

**Expected:** Exactly one succeeds (200, role demoted, audit log entry). The other returns `400 {error: 'Cannot change the role of the only admin. Promote another user to admin first.'}`. Final admin count is exactly 1.
**Why human:** Concurrency race against a live server; static-source assertions cannot prove transactional isolation behavior. (Note: on Postgres without `SELECT ... FOR UPDATE`, this race is theoretically still possible — the limitation is documented.)

---

### Gaps Summary

**Zero gaps remaining from the BL-01..BL-05 checklist.**

All five blockers identified in the initial 2026-05-07T00:00:00Z verification are RESOLVED in the codebase, the security regression suite (38/38) catches each one if regressed, and mutation tests (per 07-10/11/12 SUMMARYs) confirmed the new test assertions are real guards rather than no-ops.

The phase score is 14/14 must-haves verified. Status is `human_needed` rather than `passed` solely because:

1. Visual / UX verification of the admin grouped dashboard ordering is unchanged from initial verification — no automated alternative.
2. Browser cookie + back-button behavior for the BL-03 fix needs a live browser session.
3. SSR redirect timing for the BL-05 fix needs DevTools network panel observation.
4. Live SMTP2Go delivery for magic-link + password reset cannot be exercised in the static suite.
5. The BL-02 transactional fix is provable by code shape (the static test pins `db.transaction` and asserts `auth.api.setRole` count <= 1) but actual concurrency-race correctness on a live server is best confirmed empirically before declaring the phase done.

These 6 human-verification items are the same 4 from the initial verification PLUS 2 new items (BL-02 concurrent-demotion, BL-05 SSR network observation) added in re-verification because the wave-4 fixes' behavioral correctness merits a live check.

---

*Re-verified: 2026-05-07T17:16:00Z*
*Verifier: Claude (gsd-verifier)*
*Initial verification: 2026-05-07T00:00:00Z (gaps_found, 8/12)*
*Re-verification result: 14/14 verified; 6 items routed to human verification*
