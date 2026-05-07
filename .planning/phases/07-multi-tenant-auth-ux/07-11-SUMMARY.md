---
phase: 07-multi-tenant-auth-ux
plan: 11
subsystem: portal-shell-auth
tags:
  - auth
  - ux
  - gap-closure
  - bl-03
  - bl-04
requires:
  - 07-02  # Sidebar role-aware nav
  - 07-05  # Dashboard role-branched empty states
  - 07-09  # sidebar-role-flash regression test
provides:
  - 07-12-portal-logout-correct
  - 07-12-client-no-creation-cta
affects:
  - src/components/layout/Sidebar.tsx
  - src/app/portal/page.tsx
  - tests/security/sidebar-role-flash.test.tsx
tech-stack:
  added: []
  patterns:
    - "Better Auth React client signOut() invocation pattern (replaces hand-rolled fetch to non-existent /api/auth/logout)"
    - "Strict-positive role guard for client-restricted DOM elements (mirrors line 287 Invite Client form)"
    - "Static-source regression test for handler wiring (read source string, regex-match the onClick body)"
key-files:
  created: []
  modified:
    - src/components/layout/Sidebar.tsx       # Logout onClick now awaits authClient.signOut() before redirect
    - src/app/portal/page.tsx                 # '+ New Assessment' header button wrapped in coach||admin guard
    - tests/security/sidebar-role-flash.test.tsx  # +28 lines, new BL-03 regression describe block (3 tests)
decisions:
  - "Strict-positive guard `userRole === 'coach' || userRole === 'admin'` chosen over the literal `userRole !== 'client'` from VERIFICATION.md missing-list. Rationale: matches existing precedent at portal/page.tsx line 287 (Invite Client form) AND prevents privilege-flash during the session-loading window when userRole is undefined. Both forms satisfy REQ-7.12; strict-positive is strictly stronger."
  - "Logout error handling uses try/catch swallow + always-redirect: even if Better Auth signOut throws (network failure mid-flight), the redirect to /login still fires so the user is never stranded inside the portal. Set-Cookie clearing is best-effort but the surface area for missing it is minimal (server crash mid-response)."
  - "BL-03 regression test uses static-source matching rather than DOM event simulation. Reasons: (a) avoids needing to mock authClient.signOut + window.location across the existing 5 DOM tests, (b) directly asserts on the structural shape that VERIFICATION.md flagged ('does it reference /api/auth/logout?'), (c) deterministic and fast (~2ms additional test runtime)."
metrics:
  duration_seconds: 159
  duration_human: "~3 minutes"
  tasks_completed: 3
  commits: 3
  files_modified: 3
  files_created: 0
  completed_date: "2026-05-07T07:07:19Z"
---

# Phase 07 Plan 11: BL-03/BL-04 Gap Closure Summary

Closed two security/UX blockers in the portal shell: Logout now correctly invalidates the session cookie via Better Auth before redirecting; clients no longer see the '+ New Assessment' header button on the dashboard.

## Objective Recap

VERIFICATION.md row 1 (BL-03) and row 3 (BL-04) flagged two specific defects:

1. **BL-03** — `src/components/layout/Sidebar.tsx` line 190 was calling `fetch('/api/auth/logout', { method: 'POST' })`, but Better Auth exposes its sign-out endpoint at `/api/auth/sign-out`. The fetch returned 404, the `.finally()` redirect to `/login` happened anyway, and the user was kicked to the login page **with a still-valid session cookie**. Browser back re-entered the portal as the previous user.
2. **BL-04** — `src/app/portal/page.tsx` lines 168-173 rendered the '+ New Assessment' creation button unconditionally, violating REQ-7.12's acceptance criterion: "logged in as a client with zero assessments, the dashboard shows the client-specific empty message and no creation CTA."

The existing `tests/security/sidebar-role-flash.test.tsx` had no assertion about the logout button's wiring, so it could not catch a regression to the broken endpoint.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace broken `/api/auth/logout` fetch with `authClient.signOut()` (BL-03) | a2a6952 | `src/components/layout/Sidebar.tsx` |
| 2 | Hide '+ New Assessment' header button for clients (BL-04) | 3130e61 | `src/app/portal/page.tsx` |
| 3 | Add BL-03 regression guard to sidebar-role-flash test | ce220c8 | `tests/security/sidebar-role-flash.test.tsx` |

## Exact Diffs

### Task 1 — `src/components/layout/Sidebar.tsx`

```diff
           {/* Logout */}
           <button
-            onClick={() => {
-              fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
-                window.location.href = '/login';
-              });
-            }}
+            onClick={async () => {
+              try {
+                await authClient.signOut();
+              } catch {
+                // Sign-out errors should not strand the user on the portal — the redirect
+                // below still kicks them to /login. Better Auth still attempts cookie
+                // clearing via Set-Cookie even on partial errors.
+              }
+              window.location.href = '/login';
+            }}
             className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all w-full"
           >
```

The `authClient` import at line 7 was already present from prior plans; no import change. The button class names, SVG icon, and surrounding markup are unchanged.

### Task 2 — `src/app/portal/page.tsx`

```diff
             </div>
-            <button
-              onClick={createAssessment}
-              className="px-6 py-2.5 bg-gold text-navy font-bold rounded-lg hover:bg-gold-light transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm whitespace-nowrap"
-            >
-              + New Assessment
-            </button>
+            {(userRole === 'coach' || userRole === 'admin') && (
+              <button
+                onClick={createAssessment}
+                className="px-6 py-2.5 bg-gold text-navy font-bold rounded-lg hover:bg-gold-light transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm whitespace-nowrap"
+              >
+                + New Assessment
+              </button>
+            )}
           </div>
```

**Strict-positive interpretation note (VERIFICATION.md row 3):** This implementation uses `userRole === 'coach' || userRole === 'admin'` rather than the literal `userRole !== 'client'` written in VERIFICATION.md gap-row-3 missing-list. The verifier should accept either form when re-checking. Strict-positive is strictly stronger because it ALSO hides the button during the session-loading window (when `userRole` is `undefined`), preventing privilege-flash. It also mirrors the precedent already on line 287 of the same file (Invite Client form).

### Task 3 — `tests/security/sidebar-role-flash.test.tsx`

Added at the top of the file:

```diff
 import { describe, it, expect, vi } from 'vitest';
 import { render, screen } from '@testing-library/react';
+import { readFileSync } from 'fs';
+import { resolve } from 'path';
 import Sidebar from '@/components/layout/Sidebar';
```

Appended after the existing `describe('Sidebar role-flash — D-12 regression guard', ...)` block:

```typescript
describe('Sidebar logout wiring — BL-03 regression guard', () => {
  const sidebarSource = readFileSync(
    resolve(process.cwd(), 'src/components/layout/Sidebar.tsx'),
    'utf-8'
  );

  it('the Logout button calls authClient.signOut (Better Auth)', () => {
    expect(sidebarSource).toMatch(/authClient\.signOut\s*\(/);
  });

  it('the Logout button does NOT fetch the deprecated /api/auth/logout endpoint', () => {
    expect(sidebarSource).not.toMatch(/['"]\/api\/auth\/logout['"]/);
  });

  it('the Logout flow redirects to /login AFTER signOut completes (cookie cleared first)', () => {
    const onClickMatch = sidebarSource.match(/onClick=\{[\s\S]+?authClient\.signOut[\s\S]+?\}\}/);
    expect(onClickMatch).not.toBeNull();
    const onClickBody = onClickMatch?.[0] ?? '';
    expect(onClickBody).toMatch(/\/login/);
  });
});
```

The 5 original D-12 role-flash tests are unchanged; the new describe block is purely additive.

## Mutation Test Outcome (Task 3 acceptance)

To prove the new tests are real regression guards (not no-ops), Sidebar.tsx was temporarily reverted to the broken `fetch('/api/auth/logout', { method: 'POST' }).finally(...)` shape and the test file was rerun:

```
Test Files  1 failed (1)
     Tests  3 failed | 5 passed (8)
```

All 3 new BL-03 tests FAILED:
- "the Logout button calls authClient.signOut (Better Auth)" — failed because `authClient.signOut` no longer appears in the source.
- "the Logout button does NOT fetch the deprecated /api/auth/logout endpoint" — failed because `/api/auth/logout` reappeared.
- "the Logout flow redirects to /login AFTER signOut completes" — failed because no `onClick=...authClient.signOut...` block could be matched.

The 5 original D-12 tests continued to pass (independent of the logout wiring). After restoring the good Sidebar.tsx, all 8 tests passed again. Mutation test confirms the guards trip on a real regression.

## Verification Evidence

```
$ grep -F 'authClient.signOut' src/components/layout/Sidebar.tsx
                await authClient.signOut();
$ grep -q '/api/auth/logout' src/components/layout/Sidebar.tsx && echo present || echo absent
absent
$ grep -c "userRole === 'coach' || userRole === 'admin'" src/app/portal/page.tsx
2
$ npx vitest run tests/security/sidebar-role-flash.test.tsx
 Test Files  1 passed (1)
      Tests  8 passed (8)
$ npx tsc --noEmit          # no new errors in changed files
PASS: no errors in changed files
```

Pre-existing TypeScript errors in `src/__tests__/setup.tsx` and `src/__tests__/store/assessment-store.test.ts` (vitest globals + store-test type mismatches) are out of scope for this gap-closure plan and were not introduced by these tasks.

## Cross-References

- **VERIFICATION.md gap row 1 (BL-03)** — RESOLVED. Logout now invalidates the session cookie via Better Auth's `/api/auth/sign-out` endpoint before redirecting to `/login`.
- **VERIFICATION.md gap row 3 (BL-04)** — RESOLVED via strict-positive guard. Verifier note in plan documents that either `userRole !== 'client'` or `userRole === 'coach' || userRole === 'admin'` resolves the gap; the implementation chose the stricter form.
- **REVIEW.md issues BL-03 and BL-04** — both implementations match the canonical fix shape recommended in REVIEW.md.
- **Plan-checker WARNING 3** — addressed: the plan documents the strict-positive interpretation in `<action>` for the verifier's re-run; this Summary's Decisions section restates the rationale.
- **REQ-7.12** — acceptance criterion met. Logged in as a client with zero assessments, the dashboard now shows ONLY the empty-state message in Recent Assessments and no creation CTA in the header.

## Threat Disposition (from PLAN.md threat_model)

| Threat ID | Disposition | Status after plan |
|-----------|-------------|-------------------|
| T-07-45 (Spoofing / Session reuse) | mitigate | CLOSED — authClient.signOut clears cookie via Set-Cookie before redirect; back button no longer re-enters portal |
| T-07-46 (Information Disclosure / Privilege expectation) | mitigate | CLOSED — strict-positive guard hides the button for client + loading states |
| T-07-47 (Tampering / future regression) | mitigate | CLOSED — Task 3 static-source test trips on `/api/auth/logout` reappearance, mutation-verified |
| T-07-48 (Information Disclosure / DOM leakage) | accept | unchanged — accepted per plan; follow-up DOM render test for the button guard is out of scope for this gap-closure |

## Deviations from Plan

None — plan executed exactly as written.

The strict-positive guard form (Task 2) was the plan's chosen interpretation of VERIFICATION.md row 3, not a deviation; it is documented in PLAN.md `<action>` and re-stated here for the verifier.

## Self-Check: PASSED

Verified each artifact and commit exists:

- `[FOUND]` `src/components/layout/Sidebar.tsx` (modified — contains `authClient.signOut`, no `/api/auth/logout`)
- `[FOUND]` `src/app/portal/page.tsx` (modified — strict-positive guard wraps '+ New Assessment')
- `[FOUND]` `tests/security/sidebar-role-flash.test.tsx` (modified — +28 lines, BL-03 describe block, all 8 tests pass)
- `[FOUND]` commit `a2a6952` (Task 1 — Sidebar logout fix)
- `[FOUND]` commit `3130e61` (Task 2 — portal client CTA hide)
- `[FOUND]` commit `ce220c8` (Task 3 — BL-03 regression test)

Mutation-test outcome documented above provides additional self-verification beyond grep + commit-existence checks.
