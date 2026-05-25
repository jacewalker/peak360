---
phase: quick-260525-equ
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/client-login/route.ts
  - src/app/portal/clients/[name]/page.tsx
autonomous: false
requirements:
  - EQU-01  # Endpoint: create-or-resend client login + link assessments by clientName OR email
  - EQU-02  # Client-page button (admin/coach) to trigger it, prefilled email
  - EQU-03  # Linked clients can then view their own assessments (read-only — already enforced)
must_haves:
  truths:
    - "An admin/coach can trigger a client login from /portal/clients/[name] via a button"
    - "Triggering it creates a client-role account if none exists (else resends), and emails a magic-link sign-in from noreply@peak360.com.au via SMTP2Go to the client's email"
    - "All assessments whose clientName matches the client OR whose clientEmail matches the entered email get clientId set to the client's user id"
    - "After linking, that client (logged in) sees those assessments via the existing clientId-filtered GET; writes remain 403 (read-only)"
    - "Coaches can only do this for their own clients; admins for any; client-role users get 403"
  artifacts:
    - path: "src/app/api/client-login/route.ts"
      provides: "POST create-or-resend client login + clientId linking"
      contains: "signInMagicLink"
    - path: "src/app/portal/clients/[name]/page.tsx"
      provides: "Admin/coach 'Client login' button + email dialog + toast"
      contains: "client-login"
  key_links:
    - from: "src/app/portal/clients/[name]/page.tsx"
      to: "/api/client-login"
      via: "POST { clientName, email }"
      pattern: "client-login"
    - from: "src/app/api/client-login/route.ts"
      to: "assessments.clientId"
      via: "UPDATE … SET client_id WHERE client_name = $1 OR client_email = $2"
      pattern: "clientId"
---

# Quick 260525-equ — Client login button + assessment linking

## Locked decisions (from user)
1. **Linking = clientName OR email** (option C): set `clientId` on every assessment where `clientName` matches the client OR `clientEmail` matches the entered email.
2. **Email**: send from `noreply@peak360.com.au` via SMTP2Go (already the default in `sendEmailViaSMTP2Go`) to the client's **prefilled** email address.
3. **Button behavior**: create the client account if none exists → link assessments → send magic-link; if the account already exists → resend the login link.
4. **Read-only**: clients view only. Already enforced server-side (client → 403 on all section/assessment PUT/POST/DELETE; GET gated on `clientId === userId`). No new guard needed.

## Reuse (read these)
- `src/app/api/invitations/route.ts` — the canonical create-or-resend + magic-link flow:
  - existing user → `auth.api.signInMagicLink({ body: { email, callbackURL: '/portal' }, headers: await headers() })`
  - new user → `auth.api.createUser({ body: { email, password, name, role } })` then `signInMagicLink`
  - password = `crypto.randomUUID()` (clients sign in via magic link; password is a placeholder)
  - import `headers` from `next/headers`; `auth` from `@/lib/auth`; `sendEmailViaSMTP2Go` fallback already inside that file's pattern
- `src/app/api/client-notes/route.ts` — the coach `canAccess(session, clientName)` pattern (admin → any; coach → only client names in their own assessments; else false).
- `src/lib/db/schema.ts` — `assessments`, `user` tables; `assessments.clientId`.

## Task 1 — `POST /api/client-login` (create-or-resend + link)

**File:** `src/app/api/client-login/route.ts` (new)

**Action:**
- `requireSession()` first. If `role === 'client'` → 403.
- Body: `{ clientName: string, email: string }`. Validate `clientName` non-empty and `email` against the same regex used in invitations; 400 otherwise.
- `canAccess(session, clientName)` (mirror client-notes): admin → true; coach → true iff an `assessments` row exists with that `clientName` AND `coachId === session.user.id`; else 403.
- Normalize email to lowercase/trim.
- Look up `user` by email:
  - **Exists:** `signInMagicLink` (resend). `created = false`. Use the existing user's id.
  - **Not exists:** `auth.api.createUser({ body: { email, password: crypto.randomUUID(), name: clientName, role: 'client' as ... } })`; then re-query `user` by email to get the new id; `signInMagicLink`. `created = true`. Mirror the invitations error handling (log + 500 on createUser failure).
- **Link assessments:** `UPDATE assessments SET client_id = <userId> WHERE (client_name = <clientName> OR client_email = <email>)`. Use drizzle: `db.update(assessments).set({ clientId: userId }).where(or(eq(assessments.clientName, clientName), eq(assessments.clientEmail, email)))`. Capture how many rows matched (a prior select count, or rely on the update result) for `linkedCount`.
- Wrap the magic-link send in try/catch with the same inline-email fallback as invitations (so a missing magic-link surface still emails the client). In dev (no `SMTP2GO_API_KEY`) the email is logged to console — that's expected.
- Return `{ success: true, created, linkedCount }`.

**Verify:** `npx tsc --noEmit` clean; `npx eslint` clean on the new file.

## Task 2 — Client-page "Client login" button + dialog (admin/coach)

**File:** `src/app/portal/clients/[name]/page.tsx`

**Action:**
- This page already has `authClient.useSession()` (the Notes gate) — reuse `canViewNotes`-style role check; define `const isStaff = role === 'coach' || role === 'admin'`.
- In the hero (next to the existing "Start assessment" button ~L248), add a secondary button **"Client login"** rendered only when `isStaff`. Style as a secondary button (outline / `border-line-2 hover:border-gold-brand`), distinct from the primary gold "Start assessment".
- Clicking it opens a small dialog (reuse the project `Dialog` primitive used by `ClientPickerDialog`, or a lightweight inline modal consistent with the app): a single email input **prefilled** with `clientEmail` (the page already computes `const clientEmail = assessments[0]?.clientEmail || ''`), editable, plus a confirm button "Send login link" (disabled while empty/invalid or in-flight).
- On confirm: `POST /api/client-login` with `{ clientName, email }`. On success show a toast/inline message: created → "Login created — invite sent to {email} ({linkedCount} assessments linked)"; resend → "Login link resent to {email} ({linkedCount} assessments linked)". On error show the error message. Use the existing `Toast` component if present (see admin/users page) or a small inline status line.
- Do not change the Assessments/Trends/Notes tabs or any existing logic.

**Verify:** `npx tsc --noEmit` clean; `npx eslint` clean on the file.

## Task 3 — Human verification checkpoint

On the running dev server (admin session): open a client page → "Client login" → confirm the prefilled email → submit. Then verify (the orchestrator can check the DB / dev console): a `user` row with role `client` exists for that email, the client's assessments now have `clientId` set, and the magic-link email was sent/logged. Optionally sign in via the magic link and confirm the client sees only their assessments and cannot edit.

## Out of scope
- No change to the generic People-page invite flow (this is the client-page-specific path).
- No new read-only guards (already enforced).
- No bulk backfill of historical clientId beyond the matched client.
- No change to assessment/section pages.

## Conventions
Follow `CLAUDE.md`: `@/` imports, `import type`, NextResponse `{ success, data?, error? }`,
navy/gold tokens, `'use client'` for the page. Mirror invitations.ts (auth/magic-link)
and client-notes.ts (coach canAccess) exactly. Magic-link sender stays
`noreply@peak360.com.au` via the existing `sendEmailViaSMTP2Go` default.
