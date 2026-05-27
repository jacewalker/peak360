---
phase: quick-260527-ine
plan: 01
subsystem: client-login + dev-seed
tags: [auth, email, seed, postgres, encryption]
requires:
  - renderBrandedEmail (src/lib/email/template.ts)
  - sendEmailViaSMTP2Go (src/lib/email/send.ts)
  - createOrReuseVersion (src/lib/normative/versioning.ts)
  - encrypt (src/lib/crypto.ts)
  - runMigrations (src/lib/db/index.ts)
provides:
  - mode-aware /api/client-login (welcome | magic-link)
  - two-option client-login Dialog
  - scripts/seed-bob-smith.ts (dev Postgres demo client)
affects:
  - src/app/api/client-login/route.ts
  - src/app/portal/clients/[name]/page.tsx
  - scripts/seed-bob-smith.ts
tech-stack:
  added: []
  patterns: [branded transactional email, mode-branching API, idempotent Postgres seed, decrypt-on-read encryption contract]
key-files:
  created:
    - scripts/seed-bob-smith.ts
  modified:
    - src/app/api/client-login/route.ts
    - src/app/portal/clients/[name]/page.tsx
decisions:
  - "client-login defaults to mode='welcome'; absent/invalid mode never auto-sends a magic link (A1)"
  - "welcome email CTA points at the public /login page, not a magic link (A2)"
  - "seed is Postgres-only and DEV-only; guarded on DATABASE_URL and never runnable from the sandbox"
metrics:
  completed: 2026-05-27
requirements: [CLIENT-LOGIN-MODE, BOB-SEED]
---

# Phase quick-260527-ine Plan 01: Client-login mode choice + Bob Smith seed Summary

Staff now choose between a branded welcome email and a magic sign-on link when creating a client login (default = welcome, never an auto magic link), and a new dev-only Postgres seed produces a report-complete "Bob Smith" demo client.

## What Was Built

### A — Client-login mode choice (deployable)
- `POST /api/client-login` accepts `body.mode: 'welcome' | 'magic-link'`. Any absent/invalid value defaults to `'welcome'` (A1).
- `welcome` (default): sends a branded `renderBrandedEmail` welcome with CTA → `${baseUrl}/login` (the public sign-in page, NOT a magic link).
- `magic-link`: preserves the existing `signInMagicLink` flow verbatim, including the inline fallback email on catch.
- Response now includes `mode`: `{ success, created, linkedCount, mode }`.
- All prior behavior preserved: `requireSession`, role-client 403, clientName/email validation, `canAccess` gating, create-or-resend lookup, `tryUpgradePlaceholderByName` placeholder upgrade, and assessment linking — unchanged.
- The client-detail Dialog (`/portal/clients/[name]`) now offers two email-valid-gated buttons — "Create account + welcome email" (primary gold) and "Create account + send sign-on link" (secondary outline) — plus Cancel. `handleSendLogin(mode)` threads the chosen mode through the POST body and emits mode-specific success Toasts (welcome vs sign-on link, created vs existing). Footer wraps on narrow widths.

### B — Bob Smith seed (dev-only)
- `scripts/seed-bob-smith.ts`: standalone tsx script, Postgres-only, DEV-only, idempotent.
- Guards on `DATABASE_URL` (exits 1 if absent), prints a masked URL, warns if `ENCRYPTION_KEY` is unset, calls `runMigrations()` first.
- Creates/reuses a `role='client'` Bob Smith user, picks a coach/admin/any-user as `coachId`, deletes any prior seeded Bob assessment (cascade), then inserts one `status='completed'` assessment with `normativeVersionId` from `createOrReuseVersion()`.
- Sections 1–10 use the report-markers dataKeys (incl. `clientAge: 41`); sections 3/4/5 pass through `encrypt()` to honor the decrypt-on-read contract; other sections stored as plain JSON. Values chosen to rate normal→elite for a 41yo male so the Section 11 report and all five Peak Living pillars render.

## UAT — Feature A (client-login mode choice)

1. **Welcome email path:** Sign in as a coach/admin, open a client detail page (`/portal/clients/[name]`), click "Client login", enter a valid email, and click **"Create account + welcome email"**. Expect a success Toast naming the email type ("Account created — welcome email sent to …" or "Welcome email sent to …"). In dev (no `SMTP2GO_API_KEY`) the email body logs to the dev-server console — confirm it is the branded welcome whose CTA links to `/login` (NOT a magic link).
2. **Sign-on link path + gating:** In the same Dialog, confirm both action buttons are **disabled until the email is valid**. With a valid email, click **"Create account + send sign-on link"** and expect a Toast naming the sign-on link ("Account created — sign-on link sent to …" / "Sign-on link sent to …") and the dev-console email to be the magic sign-in link.

## Bob Smith seed — exact command for the USER (dev Postgres)

The seed is NOT executed in this environment (the dev DB host is unreachable from here and it must never hit prod). Run it from a machine on the dev LAN (Jaces-Mac-mini.local = 192.168.68.10); `.env.local` already has the dev `DATABASE_URL` you can reuse:

```
DATABASE_URL='postgresql://USER:PASS@192.168.68.10:5432/peak360_dev?sslmode=disable' npx tsx scripts/seed-bob-smith.ts
```

Set `ENCRYPTION_KEY` to the dev app's key (export it or prefix the command) so sections 3/4/5 are stored encrypted and decrypt-on-read succeeds in the report. After it runs, view the report at `/portal/assessment/<printed-assessment-id>/section/11` (log in as `bob.smith@example.com` or impersonate Bob from the People page).

## Deviations from Plan

None — plan executed exactly as written. (One implicit-`any` on a `.find` callback in the seed was typed inline as `{ id: string }` to satisfy `tsc`; this is a Rule 3 blocking-issue fix, not a behavior change.)

## Verification

- `npx tsc --noEmit 2>&1 | grep -v 'src/__tests__/'` — no errors in any production file or the three changed files. The only remaining tsc errors are pre-existing and confined to `src/__tests__/` (vitest `vi` globals, test-only type casts), per the task constraints.
- `npm run build` — exit 0, "Compiled successfully". (Build-time `BetterAuthError: default secret` warnings are a pre-existing local-env condition during prerender and do not fail the build.)
- No dev server started. The seed script was NOT executed.

## Commits

- `6a1cc18` feat(quick-260527-ine-01): add mode (welcome|magic-link) to /api/client-login
- `5afcfe6` feat(quick-260527-ine-01): two-option client-login Dialog (welcome + sign-on link)
- `a608ba9` feat(quick-260527-ine-01): idempotent Postgres Bob Smith seed script

## Self-Check: PASSED
- src/app/api/client-login/route.ts — modified, committed (6a1cc18)
- src/app/portal/clients/[name]/page.tsx — modified, committed (5afcfe6)
- scripts/seed-bob-smith.ts — created, committed (a608ba9)
