---
created: 2026-05-07T00:39:44.146Z
title: Add password reset, account management, and admin invitations
area: auth
files:
  - src/lib/auth.ts
  - src/app/login/page.tsx
  - src/app/portal/admin/
  - src/app/api/auth/[...all]/route.ts
  - src/app/api/invitations/route.ts
---

## Problem

The deployed app has no self-service path for users who forget their password and no UI for an admin to manage existing users or invite new admins. Today's `info@strongbodies.com.au` admin login was only recoverable because it was reset via the auto-seed env vars; that's not a path real users can take.

Specific gaps:

1. **No password reset flow.** Better-auth's `emailAndPassword` is enabled (`src/lib/auth.ts:15`) but no "forgot password" handler is wired up — `sendResetPassword` isn't configured. Magic-link signin IS configured (`src/lib/auth.ts:54-63`) using `sendEmailViaSMTP2Go`, but `/login` doesn't expose either of those flows. Login page only renders the email+password form.

2. **No account management area.** There's no admin page for listing existing users, changing their role (admin/coach/client), banning, deleting, or assigning legacy assessments to a coach. The 18 existing assessments in prod all have `coach_id = NULL` and would only be visible to admins until manually updated.

3. **No admin invitation flow.** `src/app/api/invitations/route.ts` exists in the build output but isn't reachable from any UI. Adding additional admins today requires either tweaking `PRIMARY_SEED_ADMIN_USERNAME/PASSWORD` env vars, or running raw SQL.

Surfaced during today's prod firefighting (2026-05-07) when the user wanted to upgrade an existing user but there was no in-app path to do so.

## Solution

Suggested approach (TBD — needs phase planning):

- **Password reset:** wire `sendResetPassword` in `src/lib/auth.ts` using existing `sendEmailViaSMTP2Go`. Add "Forgot password?" link on `/login`. Add `/reset-password` page with token-based reset form. Better-auth handles token issuance and verification.
- **Magic-link option:** since magic-link is already configured server-side, expose it on `/login` as a secondary action ("Email me a sign-in link") — gives users an out even when password reset email isn't received.
- **Account management:** new `/portal/admin/users` route — list users, edit role, ban/unban, delete, view tied assessments. Use better-auth's `admin` plugin (already installed, `src/lib/auth.ts:50-53`) for the privileged ops.
- **Admin invitations:** flesh out `src/app/api/invitations/route.ts`, add UI in `/portal/admin/users` ("Invite admin" button → email form), send a sign-up link via SMTP2GO, gate signup on the token.
- **Legacy assessment ownership:** during user-management work, add a "claim assessment" or bulk-assign-coach UX so the 18 null-`coach_id` rows can be attributed.

Cross-references:
- Better-auth docs for `sendResetPassword` + `admin` plugin
- SMTP2GO is already wired and working (used by magic link)
- Existing /api/invitations endpoint (build output line, not yet inspected) may be partial scaffolding to extend
- Could fold into Phase 7 (multi-tenant-auth-ux), which has SPEC.md but no PLAN yet — this clearly belongs in that phase's scope.
