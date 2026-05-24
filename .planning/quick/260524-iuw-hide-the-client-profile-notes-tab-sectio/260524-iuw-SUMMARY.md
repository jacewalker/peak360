---
phase: quick-260524-iuw
plan: 01
subsystem: portal/clients
tags: [auth, role-gating, ui, client-detail]
requires: [authClient.useSession]
provides: [role-gated Notes tab on /portal/clients/[name]]
affects: [src/app/portal/clients/[name]/page.tsx]
tech-stack:
  added: []
  patterns: [strict-positive role equality (D-12, no-flash), lazy-load effect early-bail]
key-files:
  created: []
  modified:
    - src/app/portal/clients/[name]/page.tsx
decisions:
  - Strict coach/admin equality so undefined (loading) and client roles never render Notes
metrics:
  duration: ~6m
  completed: 2026-05-24
---

# Quick 260524-iuw: Role-gate the client-profile Notes tab Summary

Gated the Notes tab on `/portal/clients/[name]` to coach/admin only using `authClient.useSession()` with strict positive role equality, so client-role users and the loading state never see the tab, its content, or trigger the notes fetch.

## What changed

`src/app/portal/clients/[name]/page.tsx`:

1. Added `import { authClient } from '@/lib/auth-client';`.
2. Derived session + capability:
   ```ts
   const { data: sessionData } = authClient.useSession();
   const canViewNotes =
     sessionData?.user?.role === 'coach' || sessionData?.user?.role === 'admin';
   ```
   Strict positive equality — `role === undefined` (session still resolving) and `role === 'client'` both yield `false`, so nothing flashes (matches Sidebar D-12 behaviour).
3. Notes tab **button** now wrapped in `{canViewNotes && ( ... )}`.
4. Notes tab **content** guard changed to `{tab === 'notes' && canViewNotes && ( ... )}` (defensive).
5. Lazy-load **effect** bails early with `if (!canViewNotes || tab !== 'notes' || notesLoaded) return;` so `/api/client-notes` GET never fires for non-coach/admin. Added `canViewNotes` to the effect dependency array.

Assessments and Trends tabs, the API, and broader route-level access control were left untouched.

## Verification

- `npx tsc --noEmit`: exit 1, but **all 19 errors are pre-existing in `src/__tests__/`** (vitest `vi` global not in tsconfig, test-fixture type casts). Zero errors reference the modified file; zero errors outside `src/__tests__`. Out of scope (not caused by this change).
- `npx eslint 'src/app/portal/clients/[name]/page.tsx'`: exit 0, clean. The react-hooks exhaustive-deps rule is satisfied (`canViewNotes` added to the effect deps).
- Did not start a dev server (one is already running).

## Must-haves check

- Notes tab button renders only for coach/admin — yes (`{canViewNotes && ...}`).
- Client-role user and loading state never see tab or content — yes (strict equality; content double-guarded).
- Notes fetch does not fire for non-coach/admin — yes (effect early-bail on `!canViewNotes`).
- Coach/admin behaviour unchanged — yes (canViewNotes true → identical render and effect path).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Commits

- 02ec4cd: feat(quick-260524-iuw): role-gate the client-profile Notes tab

## Self-Check: PASSED

- FOUND: src/app/portal/clients/[name]/page.tsx (modified, contains `useSession` and `canViewNotes`)
- FOUND: commit 02ec4cd
