---
phase: 07-multi-tenant-auth-ux
plan: 02
subsystem: ui-shell
tags:
  - sidebar
  - role-gating
  - auth-ui
  - useSession
requires:
  - src/lib/auth-client.ts (authClient.useSession from better-auth/react)
provides:
  - Role-derived Sidebar nav (Dashboard / Assessments / Clients / Admin / My Assessments)
  - Defence-in-depth UI gating pattern reusable by 07-05 dashboard grouping and 07-08 admin home placeholder
affects:
  - src/components/layout/Sidebar.tsx
tech_stack:
  added: []
  patterns:
    - "useSession() role derivation with strict equality (role === 'admin')"
    - "useMemo-derived per-role nav array; loading state defaults to safest subset (Dashboard only)"
key_files:
  created: []
  modified:
    - src/components/layout/Sidebar.tsx
decisions:
  - id: D-12
    text: "Privileged nav items (Admin) MUST NOT flash for non-admins. Implemented via strict equality `role === 'admin'` so the loading state (role === undefined) never renders privileged items."
  - id: D-13
    text: "Per-role nav mapping. Client → [Dashboard, My Assessments→/portal]; Coach → [Dashboard, Assessments, Clients]; Admin → [Dashboard, Assessments, Clients, Admin]."
  - id: D-11
    text: "UI gating is defence-in-depth only; server enforces authority on /api/admin/* (out of scope for this plan, addressed in 07-07)."
metrics:
  completed: 2026-05-07
  duration_minutes: 8
  tasks: 1
  files_modified: 1
requirements:
  - REQ-7.3
---

# Phase 07 Plan 02: Role-Based Sidebar Nav Summary

**One-liner:** Refactored `Sidebar.tsx` so its nav items are derived from `authClient.useSession()` role at render time, with strict-equality role gating that prevents the Admin link from flashing during the initial useSession() loading window.

## What Changed

`src/components/layout/Sidebar.tsx` was refactored end-to-end:

1. The module-scope `NAV_ITEMS` constant was decomposed into four named per-item constants (`DASHBOARD_ITEM`, `ASSESSMENTS_ITEM`, `MY_ASSESSMENTS_ITEM`, `CLIENTS_ITEM`) at module scope. Icons, `matchExact`, and `matchPaths` are preserved verbatim from the previous implementation.
2. Inside the component, `authClient.useSession()` is called once and `role = sessionData?.user?.role` is extracted (matching the pattern already used in `src/app/portal/page.tsx`).
3. A `useMemo`-derived `navItems` array is computed from `role`:
   - `client` → `[Dashboard, My Assessments]` where "My Assessments" `href` is `/portal` per D-13 (client dashboard already lists their owned assessments).
   - `coach` → `[Dashboard, Assessments, Clients]`.
   - `admin` → `[Dashboard, Assessments, Clients]` (Admin link rendered separately in the footer block).
   - `undefined` (loading) → `[Dashboard]` only.
4. The Admin link in the footer block is now wrapped in `{role === 'admin' && (...)}` — strict positive equality, never `role !== 'client'`, because the loading state would silently slip through a negative check (D-12 acceptance criterion).
5. Visual classes (`px-3 py-2.5`, `bg-gold/15`, active dot, `shadow-[inset_0_0_0_1px_rgba(245,166,35,0.15)]`) are preserved literally per UI-SPEC §Spacing executor instruction.
6. Logo, mobile drawer, ESC handling, hamburger button, and Logout button are unchanged.

## Pattern Established (reused downstream)

The role-derivation idiom established here is the canonical pattern for the rest of phase 07:

```ts
const { data: sessionData } = authClient.useSession();
const role = sessionData?.user?.role;
{role === 'admin' && <PrivilegedBlock />}  // D-12: strict positive equality only
```

Plans 07-05 (dashboard role grouping) and 07-08 (admin home placeholder) reuse this exact import + check.

## Verification

| Acceptance criterion | Result |
|----------------------|--------|
| `grep -c "authClient.useSession" Sidebar.tsx` ≥ 1 | 1 |
| `grep -c "role === 'admin'" Sidebar.tsx` ≥ 1 | 3 |
| `grep -cE "role !== 'client'" Sidebar.tsx` = 0 | 0 |
| `grep -c "My Assessments" Sidebar.tsx` ≥ 1 | 2 |
| `grep -c "px-3 py-2.5" Sidebar.tsx` ≥ 1 | 3 |
| `npx tsc --noEmit` exits 0 for Sidebar.tsx | clean (only pre-existing __tests__ errors remain, unrelated) |
| `npm run build` succeeds | "Compiled successfully in 3.4s" |

## Threats Dispositioned

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-07-07 (info disclosure via role-flash) | mitigated | Strict positive equality `role === 'admin'`; loading state renders Dashboard only. |
| T-07-08 (DOM tampering to access Admin link) | accepted | Server enforces `/api/admin/*` and `/portal/admin/*` server-side in plan 07-07. UI hiding is cosmetic. |
| T-07-09 (browser extension forces role state) | accepted | Server re-validates via `auth.api.getSession({ headers })` and returns 403 on /api/admin/*. |

## Deviations from Plan

None — plan executed exactly as written. The `role !== 'client'` grep initially returned 1 due to a comment that included the literal string for explanatory purposes; the comment was reworded to "negative checks are forbidden" so the grep correctly returns 0. This is a documentation tweak, not a functional change.

## Build / TypeScript Notes

`npx tsc --noEmit` reports pre-existing errors in `src/__tests__/` (Vitest `vi` global typing, `Record<string, unknown>` vs `SectionData` mismatches in store tests). All are unrelated to Sidebar.tsx and out of scope per the executor scope-boundary rule. Production build compiles cleanly.

## Self-Check: PASSED

- File `src/components/layout/Sidebar.tsx` exists and contains `authClient.useSession`, `role === 'admin'`, `useMemo`-derived `navItems`, and "My Assessments" with `href: '/portal'`.
- Commit `b65af8c` (`feat(07-02): role-derived Sidebar nav via useSession()`) is present in the worktree branch git log.
- All 5 must_haves.truths from the plan frontmatter are observable in the code.
