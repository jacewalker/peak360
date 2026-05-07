---
phase: 07-multi-tenant-auth-ux
reviewed: 2026-05-07T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - src/app/api/admin/invitations/route.ts
  - src/app/api/admin/users/[userId]/role/route.ts
  - src/app/api/admin/users/route.ts
  - src/app/api/assessments/route.ts
  - src/app/api/invitations/route.ts
  - src/app/login/page.tsx
  - src/app/portal/admin/invitations/page.tsx
  - src/app/portal/admin/page.tsx
  - src/app/portal/admin/users/page.tsx
  - src/app/portal/assessment/[id]/report/page.tsx
  - src/app/portal/assessment/[id]/section/layout.tsx
  - src/app/portal/clients/[name]/TrendsTab.tsx
  - src/app/portal/page.tsx
  - src/app/reset-password/page.tsx
  - src/components/charts/MetricChart.tsx
  - src/components/layout/Sidebar.tsx
  - src/components/ui/RolePill.tsx
  - src/components/ui/StatusPill.tsx
  - src/components/ui/Toast.tsx
  - src/lib/audit.ts
  - src/lib/auth.ts
  - src/types/assessment.ts
  - tests/security/auth-config.test.ts
  - tests/security/client-redirect.test.tsx
  - tests/security/invitations-role.test.ts
  - tests/security/last-admin-guard.test.ts
  - tests/security/report-idor.test.ts
  - tests/security/sidebar-role-flash.test.tsx
  - vitest.config.ts
findings:
  blocker: 6
  warning: 11
  total: 17
status: issues_found
---

# Phase 07: Code Review Report — Multi-Tenant Auth UX

**Reviewed:** 2026-05-07
**Depth:** standard
**Files Reviewed:** 30 (29 source + 1 config)
**Status:** issues_found

## Summary

This phase touches the entire multi-tenant security perimeter — role enforcement, last-admin guard, IDOR on assessment routes, sidebar role-flash, password reset, magic-link, audit logging. The architectural skeleton is solid: `requireAdmin`/`requireSession` is centralized, the SSR client-redirect guard correctly avoids the auto-save flicker bug, the sidebar uses strict positive equality (`role === 'admin'`), and the role-change route has a real pre/post race rollback for the last-admin scenario.

However, there are several real defects that materially weaken the threat model:

1. **`emailAndPassword.minPasswordLength: 4`** — far below the 8-char minimum the reset-password UI claims to enforce. Better Auth happily accepts 4-char passwords on the API surface, so any non-UI client (curl, the magic-link sign-in if it triggers password set, etc.) bypasses the UI guard. **BLOCKER.**
2. **Last-admin race rollback runs through Better Auth admin plugin, which does its own admin check via `auth.api.setRole`** — but if the only admin demotes themselves, by the time the rollback executes their session is no longer admin and `setRole` will fail. The "rollback" path is unreachable in the exact scenario it claims to protect against. **BLOCKER.**
3. **`/api/invitations` lets a coach session create an account with an arbitrary `name` field** but more importantly, a coach can invite role=`'client'` for an email that's **already an admin** — the existing-user branch sends them a magic-link sign-in (which is fine), but the role check `requestedRole === 'client'` is gated on the *requested* role only, not on the *target user's existing* role. A coach can therefore trigger a magic-link login flow against any existing admin/coach by knowing their email. While the magic link goes only to the legitimate email owner, this is an unintended invitation UI for any coach to email-bomb arbitrary users (incl. admins). Plus there is **no rate limit**. **WARNING.**
4. **`/portal/admin/users` and `/portal/admin/invitations` flash the page shell during `isPending`** — both correctly `return null` while pending, but `useEffect` fires `router.replace('/portal')` only after the role resolves, which means a hostile network can stall the session fetch and a privileged user's browser window will sit on a blank page that never auto-recovers. More importantly, the *server* never enforces admin-only on these page routes — gating is purely client-side. A direct hit on `/portal/admin/users` with a coach session loads HTML/JS that includes admin-only references; only the API call fails. The actual sensitive data is API-gated, so this is **WARNING**, not blocker, but it's a defense-in-depth gap.
5. **Login page uses `<img>` not `next/image`**, accepts unbounded email length, and the dev-mode client password form silently mounts password login for clients in `NODE_ENV=development` — fine for local dev, but if `NODE_ENV` is ever misset in a deployed env (it has been, historically), clients get password access they shouldn't have. **WARNING.**
6. **`Sidebar` logout calls `/api/auth/logout` with POST** but Better Auth exposes sign-out at `/api/auth/sign-out`. The POST 404s, the `.finally(() => window.location.href = '/login')` redirects regardless, and the **session cookie is not revoked**. The browser still holds a valid session — pressing back goes back into the portal. **BLOCKER.**

Plus a number of code-quality and edge-case issues called out below.

## Blocker Issues

### BL-01: `minPasswordLength: 4` defeats reset-password UI's 8-char policy

**File:** `src/lib/auth.ts:17`
**Issue:** Better Auth is configured with `minPasswordLength: 4`. The `/reset-password` form (`src/app/reset-password/page.tsx:88-91`) and its `minLength={8}` HTML attribute imply an 8-char minimum, but Better Auth's API will accept any password ≥ 4 chars. Any caller that bypasses the UI (`authClient.resetPassword` directly, the email/password sign-up surface even with `disableSignUp: true` because invited users do get accounts) lands a 4-char password. Per the milestone constraint that "blood results and medical screening data require encryption at rest," 4-char passwords are insufficient.
**Fix:**
```ts
emailAndPassword: {
  enabled: true,
  minPasswordLength: 8,   // align with /reset-password UI
  disableSignUp: true,
  ...
}
```
Also add a server-side length check in the reset-password handler if Better Auth's surface doesn't reject; today the reset path silently uses Better Auth's value.

### BL-02: Last-admin self-demotion rollback is unreachable

**File:** `src/app/api/admin/users/[userId]/role/route.ts:62-108`
**Issue:** The rollback path calls `auth.api.setRole(...)` again with the original session's `headers()`. But in the canonical race scenario — two admins demote each other concurrently — by the time the post-check runs, **the caller's own session may itself have just been demoted** by the other concurrent request. The Better Auth admin plugin gates `setRole` on the caller being admin, so the rollback `setRole` call enters its `try { } catch {}` block, the catch swallows the error, and the audit log records "rollback attempted" — but the user is still demoted. The 409 message ("Previous role restored") lies to the user. The contract claimed in the comment ("close the concurrent-demotion race window") is not delivered.
Additionally, the `oldRole === 'admin' && newRole !== 'admin'` is not the only race — promote-and-self-demote, two simultaneous demotions of two different admins, etc. The pre-count + post-count + rollback design is fundamentally racy on a non-transactional path.
**Fix:** Wrap the count + setRole in a database transaction with `SELECT ... FOR UPDATE` (Postgres) / `BEGIN IMMEDIATE` (SQLite) so the count and the role write are atomic. Alternatively, perform the role update via a direct `db.update(user)` inside a transaction, and only call `auth.api.setRole` for the side effects (session invalidation), or accept that Better Auth doesn't support transactional role-change and document this as a known limitation. The current pre/post check + rollback gives false confidence.
```ts
await db.transaction(async (tx) => {
  if (oldRole === 'admin' && newRole !== 'admin') {
    const [{ count }] = await tx.select({ count: sql<number>`count(*)` })
      .from(user).where(eq(user.role, 'admin'));
    if (Number(count) <= 1) {
      throw new LastAdminError();
    }
  }
  await tx.update(user).set({ role: newRole }).where(eq(user.id, userId));
});
```

### BL-03: Sidebar logout 404s and never invalidates the session cookie

**File:** `src/components/layout/Sidebar.tsx:188-194`
**Issue:** The logout button POSTs to `/api/auth/logout`. Better Auth's sign-out endpoint is `/api/auth/sign-out` (not `/logout`). The fetch returns 404, the `.finally()` callback redirects to `/login`, but the session cookie remains valid. Hitting back in the browser, or any cached page, re-enters the portal as the previous user. On a shared machine this is a real account-takeover risk. Also no error handling — even if the endpoint existed and failed, the user is still kicked to /login with a live session.
**Fix:** Use the Better Auth client to sign out, which handles cookie clearing:
```ts
import { authClient } from '@/lib/auth-client';
// ...
onClick={async () => {
  await authClient.signOut();
  window.location.href = '/login';
}}
```
or POST to the correct endpoint `/api/auth/sign-out` and verify the cookie is cleared (Better Auth wipes it via `Set-Cookie` on success).

### BL-04: `/api/invitations` allows redirect/host injection via `BETTER_AUTH_URL` fallback and never rate-limits

**File:** `src/app/api/invitations/route.ts:59-64, 102-113`
**Issue:** Two compounding issues:
1. The fallback email path uses `process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'` and concatenates `/login` into the email body. If `BETTER_AUTH_URL` is unset in production (a real deployment hazard — the fallback would email a `localhost` link to a real user, breaking onboarding silently). Worse, if `BETTER_AUTH_URL` is configurable per-env without validation, any operator misconfiguration emails attacker-controlled hosts.
2. There is **no rate limiting** on `/api/invitations`. A coach session can loop and invite 10,000 emails — each triggers an SMTP2Go send (cost) and Better Auth `createUser` (DB write). Nothing throttles it. This is also an email-bombing vector against arbitrary external recipients.
**Fix:**
- Require `BETTER_AUTH_URL` at boot (`if (!process.env.BETTER_AUTH_URL) throw new Error(...)` in `src/lib/auth.ts`) so misconfig fails loud.
- Add a per-session rate limit (e.g., 20 invitations / hour / coach) using an in-memory store for SQLite or Redis for Postgres deployments. At minimum, log invitation events to `auditLogs` so abuse is traceable.
- Validate `BETTER_AUTH_URL` against an allowlist or strip to origin only.

### BL-05: `/portal/assessment/[id]/report` has no SSR ownership gate; relies on client-side fetch

**File:** `src/app/portal/assessment/[id]/report/page.tsx:7-21`
**Issue:** The report page is `'use client'` and fetches `/api/assessments/${id}` from a `useEffect`. The API does enforce ownership (`hasAccess` in `src/app/api/assessments/[id]/route.ts:10-19`), so the data won't leak. **However:**
1. The page shell renders unconditionally — including the "Download PDF" button — for any authenticated user requesting any UUID. A client guessing another client's UUID will see the page chrome with `Assessment · —` and a Download PDF button that 403s on click.
2. The `/api/assessments/[id]/pdf` route (`src/app/api/assessments/[id]/pdf/route.ts:34-36`) does enforce `hasAccess`, so PDF download is safe — but the report page renders `<Section11 assessmentId={id} />` (line 44) even when assessment is `null`. That component (not in this review's scope) will fire its own fetches. If any sub-fetch in Section11 lacks the same `hasAccess` guard, the rendered page leaks data.
3. Missing IDOR test coverage: `tests/security/report-idor.test.ts` only checks the *PDF route* and the *report page's structure* (does it call `/api/assessments/...`?). It does not assert that Section11's fetches are also gated. The test's `it.skip` for the integration test never runs. **The threat-model item "IDOR on report routes" is partially regression-tested only for PDF, not for the report page's data plane.**

**Fix:**
1. Convert `/portal/assessment/[id]/report/page.tsx` to a server component (or wrap in a server layout) that does `auth.api.getSession`, fetches the assessment, calls `hasAccess`, and `notFound()` or `redirect('/portal')` before any HTML is sent. Then pass server-loaded data as props to a small client component for the Download PDF button.
2. Audit every fetch inside `Section11` to confirm each sub-route enforces `hasAccess`.
3. Make the integration test in `report-idor.test.ts` a real test, not `it.skip`.

### BL-06: `/portal/clients/[name]/TrendsTab.tsx` violates Rules of Hooks and may infinite-loop on render

**File:** `src/app/portal/clients/[name]/TrendsTab.tsx:122-127`
**Issue:**
```tsx
// Auto-generate on mount if no cached result
const hasTriggered = useState(false);
if (!hasTriggered[0] && !assessment && !loading && !error) {
  hasTriggered[1](true);
  generate();
}
```
Calling a setter (`hasTriggered[1](true)`) **during render** is a violation of React's rules. It forces an immediate re-render, triggers `generate()` (which calls `setLoading(true)`), and on every re-render the gate now passes (`hasTriggered[0]` is true) — so it works *most* of the time. But:
1. `generate()` is an async function called from render scope — its `setError`/`setAssessment` calls land outside the React render cycle, which is fine, but the `setCachedAssessment` call writes to localStorage as a side effect of render, also a violation.
2. Calling `setLoading(true)` synchronously after `hasTriggered[1](true)` causes React to throw "Cannot update a component while rendering a different component" in strict mode / dev mode.
3. If `generate()` throws synchronously (e.g., `JSON.stringify` chokes on a circular ref), the component crashes from render.

**Fix:** Use `useEffect`:
```tsx
useEffect(() => {
  if (!assessment && !loading && !error) {
    void generate();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

## Warnings

### WR-01: `/api/invitations` does not validate target user's existing role; coach can re-invite admins

**File:** `src/app/api/invitations/route.ts:43-67`
**Issue:** When a coach POSTs `{ email: 'admin@x', role: 'client' }`, the route hits the existing-user branch (line 47) and triggers a magic-link sign-in — sending a sign-in email to the admin. The admin clicks the magic link and is signed in. Functionally this is fine (the admin keeps their admin role; the invitation can't change it), but it's an unintended pathway for any coach to email-bomb any admin or coach via the system, and the invitation listing UI shows the admin as "invited by coach X" which is misleading.
**Fix:** When the existing user has a higher role than the requested role, refuse with 403 ("user already exists with a different role"). Or simply scope the existing-user re-invite path to admin-only.

### WR-02: Audit log for role rollback writes user.id from `session.user`, but session may already be invalidated

**File:** `src/app/api/admin/users/[userId]/role/route.ts:86-100`
**Issue:** The `logAuditEvent` uses `session.user.id` for the actor, but in the self-demote scenario described in BL-02, by the time we write the audit log the actor's session may not be admin anymore. We're reading the session *snapshot* from the start of the request, which is a stale value. If a different admin demoted the actor mid-request, the audit log records the demoted user as the still-admin actor — wrong.
**Fix:** Re-read the session at the top of every privileged action, or accept the snapshot but document the limitation. Better: pass `actorRoleAtRequestStart` into the audit metadata to make the assumption explicit.

### WR-03: `getRequestContext` parses `x-forwarded-for` without validating proxy chain

**File:** `src/lib/audit.ts:51-55`
**Issue:** Reads `x-forwarded-for[0]` directly. A client on a direct connection (no trusted proxy) can spoof `X-Forwarded-For` headers, polluting the audit log with attacker-supplied IPs. This is a generic Next.js-on-Node deployment hazard but particularly damaging in an audit log context where the IP is forensic evidence.
**Fix:** Document the trust model — only trust `x-forwarded-for` when behind a proxy you control (DigitalOcean App Platform yes, dev mode no). Add a `process.env.TRUST_PROXY` flag and fall back to the connection IP otherwise. Or use `request.headers` only and pair with a deployment-time guarantee that no other proxy is reachable.

### WR-04: `/portal/admin/*` pages have no server-side admin gate

**File:** `src/app/portal/admin/users/page.tsx:38-43, 68`, `src/app/portal/admin/invitations/page.tsx:35-39, 64`
**Issue:** Both pages are `'use client'` and gate via `useSession()` + `router.replace('/portal')`. There is no server layout that checks the session — a coach hitting `/portal/admin/users` directly downloads the full client bundle (which includes the admin UI structure, the `Toast`, `RolePill`, etc.). The actual data is API-gated, so no PII leaks, but:
1. The bundle leaks the *shape* of admin features to coaches (information disclosure).
2. If a future code path reads sensitive data into the bundle (e.g., via Next.js inlining), it's exposed.
3. A 1-second blank page during `isPending` is poor UX.
**Fix:** Add `src/app/portal/admin/layout.tsx` as a server component that calls `auth.api.getSession`, checks `role === 'admin'`, and redirects otherwise. This guarantees admin pages never render their HTML for non-admins. Mirror the pattern from `src/app/portal/assessment/[id]/section/layout.tsx` (which is correctly server-side).

### WR-05: Magic-link expiry of 5 minutes (300s) is aggressive; reset link unspecified

**File:** `src/lib/auth.ts:70`
**Issue:** Magic links expire in 5 minutes. Modern email delivery latency on shared services (SMTP2Go) routinely exceeds 5 minutes during incidents. A new user receiving the invitation may not click in time and have no clear path to recover. The reset-password URL hard-codes "1 hour" in the email copy (line 23) but doesn't enforce it in the auth config (Better Auth default is 1 hour, but it's not pinned, so a config drift could change behaviour).
**Fix:** Bump magic-link expiry to 15 minutes (industry standard for auth links), and pin reset password expiry explicitly:
```ts
emailAndPassword: {
  ...
  resetPasswordTokenExpiresIn: 60 * 60, // 1 hour, matches email copy
}
```

### WR-06: `Sidebar` mobile overlay traps focus poorly; ESC works but focus is not restored

**File:** `src/components/layout/Sidebar.tsx:73-79, 224-246`
**Issue:** The mobile overlay opens but doesn't trap focus or return focus to the hamburger button on close. Accessibility issue — screen-reader users can tab outside the overlay while it's open. Also `<aside onClick={(e) => e.stopPropagation()}>` is not a stable focus boundary.
**Fix:** Use `<dialog>` element or wire `inert` attribute on the page background and restore focus on close.

### WR-07: `MetricChart` Dot renderer returns `<></>` from a function expected to return a SVG element

**File:** `src/components/charts/MetricChart.tsx:157-173`
**Issue:** Recharts' `dot` prop expects a function returning a `ReactElement<SVGElement>`. Returning `<></>` (a Fragment) when `cx == null || cy == null` may render nothing in some Recharts versions but emits a DOM warning in others, and Recharts 3.x is strict about element type. Also `index as number` and `payload as ChartPoint` casts via `Record<string, unknown>` props bypass typing — if the underlying Recharts type changes, this breaks silently.
**Fix:** Return `null` (which Recharts handles) and use the proper Recharts dot-prop types:
```tsx
dot={(props) => {
  const { cx, cy, payload, index } = props as { cx?: number; cy?: number; payload: ChartPoint; index: number };
  if (cx == null || cy == null) return null;
  // ...
}}
```

### WR-08: Login page renders `<img>` instead of `next/image` and ignores ESLint a11y rules

**File:** `src/app/login/page.tsx:109-113`, `src/app/reset-password/page.tsx:31-35`
**Issue:** Direct `<img>` use bypasses Next.js image optimization and CLS protection. ESLint normally flags this; either the rule is disabled for the file or the project tolerates it. Also: no `width`/`height` so the page jumps on logo load.
**Fix:** Use `next/image` with explicit dimensions, matching what `Sidebar.tsx:113-118` already does.

### WR-09: `/api/admin/invitations` GET joins `user` to `session` to compute "accepted" — expensive and wrong on edge cases

**File:** `src/app/api/admin/invitations/route.ts:20-32`
**Issue:** The query LEFT JOINs the `user` table against the `session` table (no LIMIT, no index hint) and groups by `user.id`. On a system with 10k users × N sessions each, this materializes a large intermediate set. More fundamentally: "accepted = has at least one session" is wrong — a user invited via password (created with `auth.api.createUser`, password set to a random UUID) may receive a magic-link sign-in that creates a session even if they later never log in interactively. The `accepted` flag is a proxy, not a truth. The D-08 design note documents this, but the UI treats `accepted` as a guarantee.
**Fix:** Either add an explicit `acceptedAt` timestamp to `user` populated by a Better Auth lifecycle hook on first session creation, or rename the UI label to "has signed in at least once" to match the data semantic.

### WR-10: Dashboard `ClientTrendsSection` fires N parallel fetches per assessment with no error budget

**File:** `src/app/portal/page.tsx:562-616`
**Issue:** For each completed assessment, fetches `[1, ...sectionsNeeded]` in parallel. With 4 sections × 5 assessments = 20 concurrent requests, all hitting `/api/assessments/${id}/sections/${s}`. Each goes through `getValidSession` → DB lookup → assessment ownership check (presumably) → return. No error budget — a single failed fetch silently `catch (() => ({...}))` returns empty data; subtly wrong charts. Also no `AbortController` on the cleanup path — if the user navigates away mid-load, fetches keep firing and try to set state on an unmounted component (the `cancelled` flag does prevent the setState but the fetches still complete).
**Fix:** Add `AbortController`, retry once with backoff for transient failures, and surface a "couldn't load some data" warning when any sub-fetch fails. Out of v1 scope per review rules, but the silent-failure path is a correctness issue, not just performance.

### WR-11: Tests are static-source assertions only — no behavioral coverage of the security paths

**File:** `tests/security/auth-config.test.ts`, `tests/security/last-admin-guard.test.ts`, `tests/security/invitations-role.test.ts`, `tests/security/client-redirect.test.tsx`, `tests/security/report-idor.test.ts`
**Issue:** Every test under `tests/security/` (except `sidebar-role-flash.test.tsx`) uses `readFileSync` + regex assertions on source code. This is fragile and gives false confidence:
- A regex match for `auth.api.setRole` matches a comment containing `auth.api.setRole`.
- The tests don't load the actual code, so a syntax error or wrong import in `route.ts` doesn't fail the test.
- The `report-idor.test.ts` integration test is `it.skip`, so the headline IDOR scenario (client A reads client B's PDF) is never exercised.
- Static checks pass even if the behavior is broken — e.g., the rollback path in BL-02 has the right text patterns but is functionally unreachable.

**Fix:** Convert at least one test per file to a behavioral test that:
- Spins up a Next.js test handler (Vitest + `next/test-utils` or a simple HTTP harness).
- Seeds two users via Better Auth.
- Calls the route handler directly with a mocked session.
- Asserts the response status/body.

The static checks can stay as a regression backstop, but they cannot be the primary coverage for security-critical code.

---

_Reviewed: 2026-05-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
