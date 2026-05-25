---
phase: quick-260525-gga
plan: 01
subsystem: client-login API
tags: [auth, api, client-login, logging, dx]
requires: []
provides:
  - "assessments.clientEmail set on login link"
  - "specific 403 messages for role-client and not-own-client"
  - "structured 403 diagnostic logging"
affects:
  - src/app/api/client-login/route.ts
tech-stack:
  added: []
  patterns: [NextResponse error shape, structured console.warn diagnostics]
key-files:
  created: []
  modified:
    - src/app/api/client-login/route.ts
decisions:
  - "Moved request-body parse + clientName derivation above the role=client check so clientName is available for the role-client 403 log (avoids a const temporal-dead-zone reference; logic otherwise unchanged)."
metrics:
  duration: ~1m
  completed: 2026-05-25
---

# Quick 260525-gga: Store client email on login + clearer 403s + logging Summary

Creating/resending a client login now writes the entered email onto that client's assessments (clientEmail), and both 403 paths return specific, human-readable messages plus a structured console.warn for DO run-log diagnostics.

## What Changed

`src/app/api/client-login/route.ts` (commit `bb2cb63`):

1. **GGA-01 — store email:** the assessment-linking update now uses `.set({ clientId: userId, clientEmail: email })`, keeping the same `or(eq(clientName), eq(clientEmail, email))` WHERE. Rows matched by email already hold it (no-op there); rows matched by name now get the login email written on.
2. **GGA-02 — specific 403 messages:**
   - `role === 'client'` → `"You're signed in as a client account. Sign out and sign in as a coach or admin to manage client logins."`
   - `!canAccess` → `"You can only create a login for a client in your own assessments."`
   - Both surface automatically in the existing client-page dialog toast (`json.error`) — no client change needed.
3. **GGA-03 — diagnostic logging:** `console.warn('[client-login] forbidden', { reason, role, userId, clientName })` immediately before each 403, with `reason` = `'role-client'` and `'not-own-client'`.

Coach scoping (own-clients-only), `createUser`, and the magic-link flow are unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reordered body parse above the role check**
- **Found during:** Task 1
- **Issue:** The role=client 403 log requires `clientName`, but `clientName`/`body` were derived *after* the role check (lines ~64-67). Logging `clientName` there would reference a `const` before its declaration (TS "used before declaration" + runtime TDZ ReferenceError).
- **Fix:** Moved `const body = await request.json()...` and the `clientName` derivation to immediately after `requireSession()`, before the role check. The empty-clientName 400 guard remains after the role check, so validation order is otherwise preserved. No behavior change for valid coach/admin requests.
- **Files modified:** `src/app/api/client-login/route.ts`
- **Commit:** `bb2cb63`

## Verification

- `npx tsc --noEmit` — **no errors reference `client-login/route.ts`** (grep count: 0). The reported tsc errors are all pre-existing failures in `src/__tests__/*` (vitest `vi` globals, test-only type casts) — out of scope per the scope boundary, untouched by this change.
- `npx eslint src/app/api/client-login/route.ts` — **clean** (exit 0).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/app/api/client-login/route.ts (modified, contains `clientEmail: email`)
- FOUND: commit bb2cb63
