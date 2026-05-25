---
phase: quick-260525-gga
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/client-login/route.ts
autonomous: true
requirements:
  - GGA-01  # Store the login email as the client's email (set clientEmail on link)
  - GGA-02  # Specific, human 403 messages (not generic "Forbidden")
  - GGA-03  # Diagnostic logging on 403 paths so DO logs show the reason
must_haves:
  truths:
    - "Creating/resending a client login sets assessments.clientEmail to the entered email on that client's assessments (alongside clientId)"
    - "The role=client 403 returns a clear message explaining the user is signed in as a client"
    - "The coach-not-own-client 403 returns a clear message about own-clients-only scope"
    - "Each 403 path logs a structured console.warn (role, userId, clientName, reason) visible in DO run logs"
  artifacts:
    - path: "src/app/api/client-login/route.ts"
      provides: "clientEmail store + specific 403 messages + diagnostic logging"
      contains: "clientEmail: email"
---

# Quick 260525-gga — Store client email on login + clearer 403s + logging

## Context (confirmed)
The reported "Forbidden after doing it once" was **not an endpoint bug**: the user clicked
the emailed magic link, which logged that browser in **as the client** (role `client`), so the
next send correctly hit the `role === 'client'` 403. Admin always works. Coach scope stays
**restricted to own clients** (user's choice). This task improves the message + logging so the
cause is obvious, and adds the requested email-storing behavior.

The dialog already shows `json.error` in a toast (`src/app/portal/clients/[name]/page.tsx:249`),
so specific endpoint messages surface automatically — **no client change needed**.

## Task 1 — `src/app/api/client-login/route.ts`

**Action:**
1. **Store the email (GGA-01):** in the assessment-linking `db.update(...).set({ clientId: userId })`
   (~L135-138), also set `clientEmail`:
   `.set({ clientId: userId, clientEmail: email })`
   (Keep the same `or(eq(clientName), eq(clientEmail, email))` WHERE. This writes the login email
   onto the client's assessments so it becomes the client's stored email; rows matched by email
   already hold it, so it's a no-op there.)
2. **Specific 403 messages (GGA-02):**
   - role === 'client' branch → return 403 with
     `{ error: "You're signed in as a client account. Sign out and sign in as a coach or admin to manage client logins." }`
   - `!canAccess` branch → return 403 with
     `{ error: 'You can only create a login for a client in your own assessments.' }`
3. **Diagnostic logging (GGA-03):** immediately before each of those two 403 returns, add a
   `console.warn('[client-login] forbidden', { reason, role: session.user.role, userId: session.user.id, clientName })`
   with `reason` = `'role-client'` and `'not-own-client'` respectively. (These print to stdout →
   visible in DO run logs.)
4. Leave the createUser / signInMagicLink / linking logic otherwise unchanged.

**Verify:** `npx tsc --noEmit` clean for the file; `npx eslint src/app/api/client-login/route.ts` clean.

**Done when:** a client login stores the entered email on the client's assessments; the two 403s
return clear, specific messages (shown in the dialog toast); and each 403 logs a structured
warning visible in DO logs.

## Out of scope
- No change to coach scoping (stays own-clients-only).
- No client-page UI change (the dialog already shows `json.error`).
- No change to createUser/magic-link flow.

## Conventions
`@/` imports; NextResponse `{ error }` shape; keep messages plain and user-facing.
