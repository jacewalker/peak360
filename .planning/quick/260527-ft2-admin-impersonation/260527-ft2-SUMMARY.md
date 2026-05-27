---
phase: quick-260527-ft2
plan: 01
subsystem: portal-admin / auth
tags: [impersonation, admin, better-auth, portal-ui]
requires:
  - "better-auth admin() plugin (server) + adminClient() (client) — pre-existing"
  - "session.impersonatedBy DB column — pre-existing in schema.ts + schema-sqlite.ts"
provides:
  - "Admin 'Log in as' impersonation UI on the People page (desktop + mobile)"
  - "Global ImpersonationBanner with 'Return to your admin account' across the portal"
  - "Reserved AuditAction name user.impersonation.started (uncalled)"
affects:
  - src/components/portal/ImpersonationBanner.tsx
  - src/app/portal/layout.tsx
  - src/app/portal/admin/users/page.tsx
  - src/lib/audit.ts
tech-stack:
  added: []
  patterns:
    - "Local cast to read session.session.impersonatedBy without editing shared AuthSession type"
    - "Better Auth client methods return { data, error }; non-null error == failure"
key-files:
  created:
    - src/components/portal/ImpersonationBanner.tsx
  modified:
    - src/app/portal/layout.tsx
    - src/app/portal/admin/users/page.tsx
    - src/lib/audit.ts
decisions:
  - "Banner uses full-contrast bg-gold-brand text-bg variant for unmissability (per plan)"
  - "Task 3 landed as a zero-risk union-name reservation only (no caller, no route, no hook)"
metrics:
  duration: ~12m
  completed: 2026-05-27
  tasks: 3
  files: 4
---

# Phase quick-260527-ft2 Plan 01: Admin Impersonation UI Wiring Summary

Wired the admin impersonation UI: a "Log in as" action on coach/client rows
(desktop + mobile) switches the admin into that user's session, and a persistent
gold banner across the portal lets them return to their own admin account — all on
top of the pre-existing Better Auth admin plugin (no backend/schema/endpoint changes).

## What was built

### Task 1 — ImpersonationBanner + global render (commit 6b1abe6)
- New `src/components/portal/ImpersonationBanner.tsx`, a `'use client'` component.
  Props `{ name, role }`. Sticky (`sticky top-0 z-40`) full-width `bg-gold-brand
  text-bg` strip reading "Viewing as {name} ({role})" with a "Return to your admin
  account" button. The button calls `authClient.admin.stopImpersonating()` (no args),
  then `router.push('/portal/admin/users')` + `router.refresh()` on success. While the
  call is in flight the button is disabled and shows "Returning…"; on error/throw it
  resets loading and surfaces a small inline `text-danger` note (the banner has no
  Toast context).
- `src/app/portal/layout.tsx` (still a server component): after the existing
  `getValidSession()` guard, reads `impersonatedBy` via a local cast
  (`(session.session as { impersonatedBy?: string | null }).impersonatedBy`) — the
  shared `AuthSession` type is untouched. Renders `<ImpersonationBanner name=...
  role=... />` as the first child of the `lg:pl-56` content column, above `{children}`,
  only when `impersonatedBy` is truthy. (While impersonating the cookie is rotated so
  `session.user` IS the impersonated user — name/role are correct.)

### Task 2 — "Log in as" action on the People page (commit 831a223)
- Computed `isImpersonating` (local cast on `sessionData.session.impersonatedBy`) and
  `currentUserId` next to the existing `userRole`.
- Added `handleImpersonate(userId)` `useCallback` (dep: `router`): calls
  `authClient.admin.impersonateUser({ userId })`; on success `router.push('/portal')` +
  `router.refresh()`; on `error` or thrown exception shows the existing error Toast.
- `UserTable` gained three props — `canImpersonate: boolean`,
  `currentUserId: string | undefined`, `onImpersonate: (userId: string) => void` —
  threaded into all 5 call sites (All users, Admins, per-coach groups, Unassigned
  clients, Coaches without clients) with
  `canImpersonate={userRole === 'admin' && !isImpersonating}`.
- Per-row predicate `showImpersonate = canImpersonate && u.role !== 'admin' && u.id !==
  currentUserId` gates a "Log in as" button in BOTH the desktop row-actions cell and the
  mobile card action group, styled to match the sibling actions.

### Task 3 — Audit action reservation (commit 546a7a3)
- Added `| 'user.impersonation.started'` to the `AuditAction` union in
  `src/lib/audit.ts` with a deferral comment. No caller, no route, no hook, no schema
  change. Landed because it was the trivial zero-risk no-op the plan sanctioned.

## Deviations from Plan

None — plan executed as written. Task 3 (optional/deferrable) was landed as the
sanctioned zero-risk union-name reservation rather than skipped, since it was a
trivial no-op with no caller, route, or schema impact.

## Verification

- `npx tsc --noEmit` (excluding `src/__tests__/`): clean. The only TS errors in the
  repo originate from files under `src/__tests__/` (pre-existing `SimpleMarker` /
  `BloodTests` / `BalancePower` index-signature mismatches) and are out of scope.
- `npm run build`: ✓ Compiled successfully. `/portal/admin/users` and the `/portal`
  layout both compile.
- Wiring greps all pass: `ImpersonationBanner` + `impersonatedBy` in layout,
  `impersonateUser({ userId` + `Log in as` + `showImpersonate` in the People page
  (`onImpersonate` appears 9×, gate is ≥7), `stopImpersonating()` in the banner.
- No auth endpoint, admin plugin config, or DB schema was modified.

## Manual UAT steps (for the user to run)

> Dev server runs on :8080 with `BETTER_AUTH_URL=http://localhost:8080`.
> Admin login: admin@admin.com / password123.

1. **Start impersonating (desktop):** Log in as admin → go to `/portal/admin/users`.
   On a coach or client row, confirm a "Log in as" action appears in the row-actions
   cell. Click it. Expect: you land on `/portal` rendered as that user, and a gold
   banner reads "Viewing as {name} ({role})".
2. **Banner persistence:** Navigate around the portal while impersonating. Confirm the
   gold banner stays pinned at the top of every page.
3. **No "Log in as" on admin/own/while impersonating:** While impersonating, confirm
   the "Log in as" action is gone everywhere. Stop impersonating (step 4), then back on
   the People page confirm "Log in as" is NOT shown on admin rows nor on your own admin
   row, but IS shown on coach + client rows.
4. **Return to admin:** Click "Return to your admin account" in the banner. Expect:
   button shows "Returning…", then you land on `/portal/admin/users` as your admin
   self, banner gone.
5. **Mobile:** Repeat steps 1–4 with a narrow viewport (<768px). Confirm "Log in as"
   appears in the mobile card action group and the banner wraps gracefully.
6. **Failure path:** (Optional) Simulate an impersonate failure (e.g. offline) and
   confirm an error Toast appears and you stay on the People page.

## Self-Check: PASSED

- Files exist: ImpersonationBanner.tsx, portal/layout.tsx, admin/users/page.tsx, audit.ts — all FOUND.
- Commits exist: 6b1abe6, 831a223, 546a7a3 — all FOUND.
