---
phase: quick-260525-fj2
plan: 01
subsystem: auth
tags: [auth, better-auth, magic-link, login, client-portal]
requires: []
provides:
  - "Functional Client login tab (magic-link default + optional password + set-password)"
  - "magicLink plugin restricted to sign-in only (disableSignUp)"
affects:
  - src/lib/auth.ts
  - src/app/login/page.tsx
tech-stack:
  added: []
  patterns:
    - "authClient.signIn.magicLink({ email, callbackURL }) for passwordless sign-in"
    - "authClient.requestPasswordReset({ email, redirectTo }) for set/reset password"
    - "Neutral 'if an account exists…' responses to avoid account-existence enumeration"
key-files:
  created: []
  modified:
    - src/lib/auth.ts
    - src/app/login/page.tsx
decisions:
  - "Magic link is the default/primary client sign-in; password is opt-in/secondary"
  - "Used core authClient.requestPasswordReset (typed in better-auth 1.6.2) — no forgetPassword fallback needed"
  - "magicLink disableSignUp:true blocks public account minting; invite/client-login createUser paths unaffected"
metrics:
  duration: ~7m
  completed: 2026-05-25
requirements: [FJ2-01, FJ2-02, FJ2-03]
---

# Quick 260525-fj2: Functional Client login (magic-link default + optional password) Summary

Made the login page Client tab functional with magic-link sign-in as the default action plus an opt-in email/password path, and restricted the Better Auth magicLink plugin to sign-in only so public requests cannot mint accounts.

## What was built

**Task 1 — `src/lib/auth.ts`** (commit `6637067`)
- Added `disableSignUp: true` to the `magicLink({ ... })` plugin (alongside `expiresIn: 300`). A public magic-link request can no longer create a new account. The invite (`/api/invitations`) and client-login (`/api/client-login`) flows create the user via `auth.api.createUser` first, so they remain unaffected (FJ2-01).

**Task 2 — `src/app/login/page.tsx`** (commit `650c238`)
- Replaced the "Coming soon" placeholder for `mode === 'client'` with a working two-mode flow.
- New state: `clientMode: 'magic' | 'password'` (default `'magic'`) and `info` for neutral success messages. Mode toggle and inner mode switches clear both `error` and `info`.
- Handlers:
  - `handleMagicLink` → `authClient.signIn.magicLink({ email, callbackURL: '/portal' })`; shows neutral "If an account exists for that email, a secure sign-in link is on its way…" regardless of account existence; does not navigate (FJ2-02).
  - `handleClientPassword` → `authClient.signIn.email({ email, password, callbackURL: '/portal' })`; on `res.error` shows "Invalid email or password.", else `router.push('/portal'); router.refresh()` (FJ2-03).
  - `handleSetPassword` → requires `email`, then `authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })`; shows neutral "If an account exists for that email, we've sent a link to set your password." (FJ2-03).
- UI: magic-link mode is the default with a primary gold "Email me a login link" button and a secondary "Sign in with a password" link. Password mode has a primary "Sign In" button, an "Email me a login link instead" link, and a "Set / reset your password" action. Reused existing `inputClasses`, the gold-brand primary button styling, the danger error block, and `MonoEyebrow` (still used in the hero). Added a matching gold info block for neutral messages. Coach/Admin tab left unchanged.

## Key decisions

- **`requestPasswordReset` over `forgetPassword`:** Verified `better-auth@1.6.2` exposes `/request-password-reset` as a core endpoint (`node_modules/better-auth/dist/api/routes/password.d.mts`), so `authClient.requestPasswordReset` is typed on the client. `npx tsc --noEmit` produced no error on that call, confirming it. No fallback to `forgetPassword` was needed.
- **Privacy:** Both magic-link and set-password responses use identical neutral copy and never branch on whether the account exists, preventing account enumeration.

## Verification

- `npx tsc --noEmit`: **No errors in touched files** (`src/lib/auth.ts`, `src/app/login/page.tsx`) or anywhere under `src/app`/`src/lib`. 19 errors remain, all pre-existing and confined to `src/__tests__/` (test setup `vi` globals, `getByAlt` typo, `SimpleMarker`/`SectionData` cast mismatches) — unrelated to this task and out of scope.
- `npx eslint src/app/login/page.tsx`: **clean (exit 0)**.

## Deviations from Plan

None — plan executed exactly as written. The plan's optional `forgetPassword` fallback was evaluated and not needed (`requestPasswordReset` is typed in the installed version).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/lib/auth.ts (modified — `disableSignUp` present in magicLink plugin)
- FOUND: src/app/login/page.tsx (modified — contains `signIn.magicLink`, `requestPasswordReset`)
- FOUND commit: 6637067 (Task 1)
- FOUND commit: 650c238 (Task 2)

## Next step — Task 3 human-verify checkpoint

Awaiting user verification on the running dev server (see below). Per `autonomous: false`, the executor stops here and does not start a server or sign in.
