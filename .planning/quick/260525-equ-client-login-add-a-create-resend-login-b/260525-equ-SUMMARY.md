---
phase: quick-260525-equ
plan: 01
subsystem: auth / client-portal
tags: [client-login, magic-link, assessment-linking, better-auth]
requires:
  - src/lib/auth (auth.api.createUser, signInMagicLink)
  - src/lib/auth-helpers (requireSession)
  - src/lib/email/send (sendEmailViaSMTP2Go)
  - src/components/ui/Dialog
  - src/components/ui/Toast
provides:
  - POST /api/client-login (create-or-resend client login + clientId linking)
  - Client-page "Client login" button + email dialog (admin/coach)
affects:
  - assessments.clientId (set on link)
tech-stack:
  added: []
  patterns: [create-or-resend magic-link (invitations.ts), coach canAccess (client-notes.ts), centered Dialog primitive, Toast]
key-files:
  created:
    - src/app/api/client-login/route.ts
  modified:
    - src/app/portal/clients/[name]/page.tsx
decisions:
  - "Linking = clientName OR clientEmail match (drizzle or(eq,eq)); linkedCount from prior select"
  - "Magic-link sender stays noreply@peak360.com.au via sendEmailViaSMTP2Go default (EMAIL_FROM)"
  - "client-role → 403; admin → any client; coach → only own clients (canAccess by clientName + coachId)"
  - "isStaff uses strict positive role equality so the button never flashes while session resolves"
metrics:
  completed: 2026-05-25
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 1
---

# Quick 260525-equ: Client login button + assessment linking Summary

Adds a `POST /api/client-login` endpoint that creates-or-resends a client-role magic-link login and links matching assessments (by `clientName` OR entered `clientEmail`) to that user's id, plus a staff-only "Client login" button + prefilled-email dialog on the client detail page. Tasks 1 and 2 are complete; Task 3 is a human-verify checkpoint (autonomous: false) that the orchestrator/user must run on the live dev server.

## What Was Built

### Task 1 — `POST /api/client-login` (commit 6ebe458)
`src/app/api/client-login/route.ts` (new):
- `requireSession()` first; `role === 'client'` → 403.
- Body `{ clientName, email }`; validates non-empty name and email regex (same as invitations.ts) → 400 otherwise.
- `canAccess(session, clientName)` mirrors `client-notes.ts`: admin → true; coach → true iff an assessment row exists with that `clientName` AND `coachId === session.user.id`; else 403.
- Email normalized to lowercase/trim.
- User lookup by email: exists → resend (`created = false`, reuse id); not exists → `auth.api.createUser({ ... role: 'client' })` with `crypto.randomUUID()` password, then re-query for the new id (`created = true`). createUser failure logs + returns 500 (mirrors invitations.ts, includes `detail` in non-prod).
- Links assessments: a prior `select` over `or(eq(clientName), eq(clientEmail))` yields `linkedCount`, then `db.update(assessments).set({ clientId: userId }).where(or(...))`.
- Magic-link send wrapped in try/catch with the same inline-email fallback as invitations.ts (sender resolves to `noreply@peak360.com.au` via `sendEmailViaSMTP2Go`/`EMAIL_FROM`). In dev (no `SMTP2GO_API_KEY`) the email is logged to the console.
- Returns `{ success: true, created, linkedCount }`.

### Task 2 — Client-page "Client login" button + dialog (commit dce86fd)
`src/app/portal/clients/[name]/page.tsx` (modified):
- Added `isStaff` (strict positive role equality, like `canViewNotes`).
- Hero now wraps both buttons in a flex row; a secondary outline "Client login" button (`border-line-2 hover:border-gold-brand`) renders only when `isStaff`, left of the primary gold "Start assessment".
- Clicking opens a centered `Dialog` (existing primitive) with a single email input **prefilled** with `clientEmail` (`assessments[0]?.clientEmail`), `data-autofocus`, editable; "Send login link" disabled while empty/invalid or in-flight.
- On confirm: `POST /api/client-login { clientName, email }`. Success → `Toast` success: created → "Login created — invite sent to {email} ({n} assessment(s) linked)"; resend → "Login link resent to {email} ({n} assessment(s) linked)". Error → `Toast` error with the server message.
- Assessments/Trends/Notes tabs and all existing logic unchanged.

## Verification Results

- `npx tsc --noEmit`: no errors in either changed/new file, and no errors in any non-test source file. (Pre-existing `src/__tests__/**` errors — `vi` globals, `SimpleMarker`/`SectionData` cast mismatches — are unrelated to this change and out of scope.)
- `npx eslint src/app/api/client-login/route.ts`: clean (exit 0).
- `npx eslint "src/app/portal/clients/[name]/page.tsx"`: clean (exit 0).

## Task 3 — Human verification checkpoint (NOT performed by executor)

A dev server is already running; the executor did not start a server or sign in via magic link. To verify on the live app (admin session):

1. Open `/portal/clients/[some-client-name]`.
2. Click "Client login" → confirm the email is prefilled with the client's email → click "Send login link".
3. Expect a success toast: "Login created — invite sent to … (N assessments linked)" (or "Login link resent to …" if the account already existed).
4. Confirm in the DB / dev console:
   - a `user` row with `role = 'client'` exists for that email,
   - the client's assessments now have `client_id` set (matching by `client_name` OR `client_email`),
   - the magic-link email was sent (or logged to console in dev with no `SMTP2GO_API_KEY`).
5. (Optional) Sign in via the magic link as the client and confirm they see only their own assessments (clientId-filtered GET) and cannot edit (writes remain 403 — already enforced).

Negative checks:
- A coach acting on a client that is NOT in their own assessments → 403.
- A client-role session calling the endpoint → 403.
- Invalid email in the dialog → button disabled; bad email posted directly → 400.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1 and 2 completed; Task 3 is a human-verify checkpoint (autonomous: false) deliberately left for the orchestrator/user.

## Known Stubs

None.

## Commits

- `6ebe458` feat(260525-equ): add POST /api/client-login create-or-resend + link
- `dce86fd` feat(260525-equ): add Client login button + dialog on client page

## Self-Check: PASSED
