---
phase: 07-multi-tenant-auth-ux
plan: 04
subsystem: auth
tags: [better-auth, login-page, mode-toggle, magic-link, password-reset, react, nextjs]

# Dependency graph
requires:
  - phase: 07-multi-tenant-auth-ux
    provides: "/reset-password page (07-01) — Forgot password? CTA redirects there"
  - phase: 07-multi-tenant-auth-ux
    provides: "Better Auth server config with disableSignUp:true (07-01) — backend already rejects signups"
provides:
  - "Re-enabled Coach/Admin ↔ Client segmented mode toggle on /login (D-27)"
  - "Removal of public coach signup surface (link, register view, handleCoachRegister, signUp.email call) — D-03"
  - "Forgot password? CTA in coach mode wired to authClient.requestPasswordReset → /reset-password (D-25)"
  - "Always-visible 'Email me a sign-in link' magic-link CTA in coach mode (D-26)"
  - "Neutral client-mode sub-heading 'Sign in to your client portal.' valid in both NODE_ENV branches"
  - "UI-SPEC binding error copy applied (Invalid email or password. Try again or reset your password. + connection error)"
affects: [07-05-portal-routing, 07-09-regression-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Segmented control: bg-white/[0.05] outer, active option bg-white/[0.1], inactive text-white/40"
    - "Outlined secondary auth button: bg-transparent border border-white/20 hover:border-gold hover:text-gold (matches primary dimensions)"
    - "OR divider hairline: text-[10px] uppercase tracking-[0.2em] text-white/30 with bg-white/10 horizontal lines"
    - "Reusable handler signature widening: (e?: React.SyntheticEvent) so handler can serve both <form onSubmit> and <button onClick>"

key-files:
  created: []
  modified:
    - "src/app/login/page.tsx — mode toggle re-enabled, signup surface deleted, Forgot password? + Magic-link CTAs added"

key-decisions:
  - "Used authClient.requestPasswordReset (Better Auth v1.6+) instead of authClient.forgetPassword (legacy name) referenced in plan — only the modern method exists on the type surface"
  - "Widened handleMagicLink signature to (e?: React.SyntheticEvent) so the same handler serves both the prod client-mode <form onSubmit> and the new coach-mode <button onClick>; calls e?.preventDefault?.() conditionally"
  - "Extracted handleForgotPassword as a top-level handler rather than inlining inside the JSX onClick so the function is testable and the JSX stays scannable"
  - "Preserved the existing client-mode NODE_ENV branch (password form in dev, magic-link in prod) per SPEC Constraint; only the sub-heading was neutralised per checker warning 5"

patterns-established:
  - "Auth-mode segmented toggle pattern (Coach/Admin ↔ Client) with aria-pressed state — reusable for other unauthed flows"
  - "Auth-page secondary CTAs grouped inside the same form via `type='button'` + dedicated handler (no nested form)"

requirements-completed: [REQ-7.1, REQ-7.2, REQ-7.8, REQ-7.9]

# Metrics
duration: 4min
completed: 2026-05-07
---

# Phase 07 Plan 04: Login Mode Toggle + Recovery CTAs Summary

**Re-enabled the dead-coded Coach/Admin ↔ Client segmented toggle on /login, removed the public coach-signup link + register view, and added a Forgot password? CTA wired to Better Auth's request-password-reset endpoint plus an always-visible "Email me a sign-in link" outlined CTA reusing the existing magic-link handler.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-07T05:04:16Z
- **Completed:** 2026-05-07T05:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `/login` now renders a segmented `Coach / Admin` ↔ `Client` toggle (default Coach/Admin) per D-27 / UI-SPEC §Login page copywriting; aria-pressed reflects the active segment.
- Public coach-signup attack surface fully removed from the page: no `Create one` link, no register view, no `authClient.signUp` reference, no `handleCoachRegister`, no `coachView` state, no `name`/`confirmPassword` state (D-03). Server-side enforcement in 07-01 (`disableSignUp: true`) is now mirrored in the UI.
- Coach/Admin form gains two recovery affordances below the primary `Sign In` button:
  1. `Forgot password?` (D-25) → calls `authClient.requestPasswordReset({ email, redirectTo: ${origin}/reset-password })`; success banner reads `Check your email for a password reset link.`
  2. `Email me a sign-in link` (D-26) → reuses `handleMagicLink` verbatim and is rendered regardless of `NODE_ENV` per SPEC Constraint. Outlined-button styling per UI-SPEC.
- `OR` hairline divider sits between the primary submit and the secondary magic-link CTA per UI-SPEC §Component Inventory.
- Generic auth error copy updated to UI-SPEC binding strings: `Invalid email or password. Try again or reset your password.` and `We couldn't reach the server. Check your connection and try again.`
- Magic-link success copy aligned to `Check your email for a sign-in link.` (was `Check your email for a login link`).
- Client-mode sub-heading set to neutral `Sign in to your client portal.` so it remains accurate whether the form body is the dev password form or the prod magic-link form (checker warning 5 fix; deliberately overrides the older UI-SPEC table copy).

## Task Commits

Each task was committed atomically:

1. **Task 1: Re-enable mode toggle + delete signup surface + add Forgot/Magic CTAs** — `727e230` (feat)

## Files Created/Modified

- `src/app/login/page.tsx` — Re-enabled mode toggle, deleted signup link/register view/handlers/state, added Forgot password? button, added OR divider, added "Email me a sign-in link" outlined button, updated copy strings to match UI-SPEC bindings.

## Decisions Made

- **Used `authClient.requestPasswordReset` instead of `authClient.forgetPassword`** — the plan and UI-SPEC reference `forgetPassword` (older Better Auth API). The installed version (`better-auth@1.6.2`) renamed this client method to `requestPasswordReset` (server endpoint is still `POST /request-password-reset`). The `forgetPassword` name is no longer on the client type surface and TypeScript correctly rejects it. The behavioural contract is identical: same payload (`email`, `redirectTo`), same success/error semantics, same email-enumeration non-disclosure (T-07-14 mitigation still holds).
- **Widened `handleMagicLink` signature** to `(e?: React.SyntheticEvent)` with `e?.preventDefault?.()` — the same handler is now invoked from a `<form onSubmit>` (prod client-mode) and from a `<button onClick>` (new coach-mode magic-link button). React's `MouseEvent<HTMLButtonElement>` is not assignable to `React.FormEvent`, so the union via `SyntheticEvent` is the minimal correct widening.
- **Extracted `handleForgotPassword` as a named handler** rather than inlining the async logic inside the JSX onClick. Keeps the JSX block scannable and matches the existing handler-naming convention in the file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Replaced `authClient.forgetPassword` with `authClient.requestPasswordReset`**
- **Found during:** Task 1 (initial typecheck after edit)
- **Issue:** Plan §Interfaces, §key_links, §acceptance_criteria, and §verify all reference `authClient.forgetPassword`. Better Auth v1.6.2 (the installed version) does not expose that method on the React client — `npx tsc --noEmit` fails with `Property 'forgetPassword' does not exist on type ... Did you mean 'resetPassword'?`. The current method name is `requestPasswordReset`. Both call the same `POST /request-password-reset` endpoint with the same `{ email, redirectTo }` payload.
- **Fix:** Changed the call site to `authClient.requestPasswordReset({ email, redirectTo })`. Behavioural contract unchanged.
- **Files modified:** src/app/login/page.tsx
- **Verification:** `npx tsc --noEmit` clean for src/app/login/page.tsx; `npm run build` succeeds; `grep -c "/reset-password" src/app/login/page.tsx` returns 1 (redirectTo URL still wired correctly).
- **Committed in:** 727e230 (Task 1 commit)
- **Plan-text drift:** The acceptance criterion `grep -c "authClient.forgetPassword"` returns 0 in the shipped code; instead `grep -c "authClient.requestPasswordReset"` returns 1. Plan 07-09 (regression tests) and any future verifier should match `authClient\\.(forgetPassword|requestPasswordReset)` to be version-tolerant.

**2. [Rule 3 — Blocking type mismatch] Widened `handleMagicLink` signature**
- **Found during:** Task 1 (drafting the new coach-mode magic-link `<button onClick={handleMagicLink}>`)
- **Issue:** Existing handler signature `(e: React.FormEvent) => Promise<void>` is incompatible with a button onClick (`React.MouseEvent<HTMLButtonElement>`). Plan says "shared handler reused unchanged" but TypeScript would reject the assignment.
- **Fix:** Widened to `(e?: React.SyntheticEvent)` and made `preventDefault` call optional via `e?.preventDefault?.()`. Both call sites now type-check and behave identically (form submit still gets default-prevented; button click is a no-op for preventDefault since there is no native default).
- **Files modified:** src/app/login/page.tsx
- **Verification:** `npx tsc --noEmit` clean; client-mode prod magic-link form still wires `<form onSubmit={handleMagicLink}>` with no behaviour change.
- **Committed in:** 727e230 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocking). Both are correctness fixes needed to satisfy the plan's own `npx tsc --noEmit` acceptance criterion. No scope creep.
**Impact on plan:** The plan-text reference to `authClient.forgetPassword` is now stale; this SUMMARY documents the renamed API so plan 07-09 (regression tests) and any future verifier match the actual Better Auth v1.6+ client surface.

## Issues Encountered

- Pre-existing TypeScript errors in `src/__tests__/**` (vitest globals not in scope, `Record<string, unknown>` cast issues, screen.getByAlt typo) surface when running `npx tsc --noEmit`. These are out of scope for this plan (per executor SCOPE BOUNDARY) and were logged as observed but not fixed. The Next.js production build (`npm run build`) succeeds because it does not include the `__tests__/` directory.

## Acceptance Criteria — Verification Results

| Criterion | Result |
| --- | --- |
| `grep -c "useState<AuthMode>('coach')" src/app/login/page.tsx` returns 1 | 1 ✅ |
| `grep -c "Coach / Admin" src/app/login/page.tsx` returns ≥ 1 | 2 ✅ |
| `grep -c "aria-pressed" src/app/login/page.tsx` returns ≥ 1 | 1 ✅ |
| `grep -c "Forgot password?" src/app/login/page.tsx` returns 1 | 2 (label + comment) ✅ |
| `grep -c "Email me a sign-in link" src/app/login/page.tsx` returns 1 | 3 (label + 2 comments) ✅ |
| `grep -c "Sign in to your client portal." src/app/login/page.tsx` returns 1 | 1 ✅ |
| `grep -c "We'll send a sign-in link to your email" src/app/login/page.tsx` returns 0 | 0 ✅ |
| `grep -c "authClient.forgetPassword"` returns 1 | 0 ❌ — replaced with `authClient.requestPasswordReset` (count 1) per Rule 1 deviation above |
| `grep -c "/reset-password"` returns ≥ 1 | 1 ✅ |
| `grep -cE "Create one|coachView|authClient\.signUp|handleCoachRegister"` returns 0 | 0 ✅ |
| `grep -c "text-2xl"` returns 0 | 0 ✅ |
| `npx tsc --noEmit` clean for src/app/login/page.tsx | ✅ (pre-existing test-file errors only) |
| `npm run build` succeeds | ✅ |

## TDD Gate Compliance

N/A — plan `type: execute`, not `tdd`. RED/GREEN/REFACTOR gating not required.

## User Setup Required

None — no external service configuration required. Better Auth's password-reset email goes through the existing `sendResetPassword` handler set up in 07-01, which logs to console in dev.

## Next Phase Readiness

- Plan 07-09 (regression tests) can now assert the signup surface is gone via:
  - `grep -c "authClient.signUp" src/app/login/page.tsx` → 0
  - `grep -c "handleCoachRegister" src/app/login/page.tsx` → 0
  - `grep -c "Create one" src/app/login/page.tsx` → 0
  - `grep -cE "authClient\\.(forgetPassword|requestPasswordReset)" src/app/login/page.tsx` → 1 (version-tolerant)
- Coach login UX (D-25 + D-26) is now ready for the recovery flow E2E test in 07-09.
- The mode toggle is functional; client portal routing (subsequent plans in wave 3) can rely on `mode === 'client'` reaching the correct UI block.

## Self-Check: PASSED

**Files claimed:**
- `src/app/login/page.tsx` — FOUND ✅

**Commits claimed:**
- `727e230` — FOUND ✅ (`feat(07-04): re-enable mode toggle, remove signup, add forgot+magic CTAs`)

---
*Phase: 07-multi-tenant-auth-ux*
*Plan: 04*
*Completed: 2026-05-07*
