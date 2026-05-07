---
phase: 07-multi-tenant-auth-ux
plan: 08
subsystem: client-portal
tags:
  - client-portal
  - read-only-report
  - admin-home
  - ssr-redirect
  - typography-contract
requires:
  - "@/lib/auth (auth.api.getSession)"
  - "@/components/sections/Section11"
  - "/api/assessments/[id]/pdf"
  - "/api/assessments/[id]"
provides:
  - "GET /portal/assessment/[id]/report — client read-only Section 11 report route"
  - "SSR redirect: clients hitting /portal/assessment/[id]/section/* are 3xx'd to /report before any client JS runs"
  - "Live admin cards: /portal/admin/users + /portal/admin/invitations"
affects:
  - "src/app/portal/admin/page.tsx (placeholder replaced + hero font-weight corrected)"
tech-stack:
  added: []
  patterns:
    - "Async server-component layout reading session via auth.api.getSession + redirect()"
    - "Next.js 16 promise-params unwrap with React.use() in client components"
key-files:
  created:
    - "src/app/portal/assessment/[id]/report/page.tsx"
    - "src/app/portal/assessment/[id]/section/layout.tsx"
  modified:
    - "src/app/portal/admin/page.tsx"
decisions:
  - "Option A chosen for D-19 redirect site: new layout at /portal/assessment/[id]/section/layout.tsx (not the parent [id]/layout.tsx) so /report stays reachable for clients without path-aware logic."
  - "Section 11 reused as-is — no readOnly prop branching introduced (D-20)."
  - "Spot Integration + Vald Performance Integration placeholders intentionally retained — only the User Management gap is in scope (must_haves authoritative; the strict 'Coming Soon returns 0' grep acceptance is a plan-author oversight)."
metrics:
  tasks: 3
  duration: ~10 minutes
  completed: 2026-05-07
---

# Phase 07 Plan 08: Client read-only report + SSR redirect + admin home cleanup — Summary

Three deliverables landed in plan 07-08:

1. **Client read-only report path** — new `/portal/assessment/[id]/report` route renders Section 11 inside a minimal shell with no auto-save subscription, no ProgressBar, and no NavigationButtons. Header reads `Assessment · {date}` (`text-lg font-semibold text-navy`); a single gold `Download PDF` anchor targets `/api/assessments/[id]/pdf`, which already enforces ownership via `hasAccess()`.

2. **Server-side client redirect (D-19)** — new async server-component layout at `src/app/portal/assessment/[id]/section/layout.tsx` reads the session and `redirect()`s any `client`-role user to `/report` BEFORE any child renders. This eliminates the flicker + stale-auto-save POST risk a client-side `useEffect` would introduce (07-phase checker warning 3). Coach + admin sessions are unaffected.

3. **Admin home placeholder + typography fix** — appended two live cards to `ADMIN_SECTIONS` (`Users` → `/portal/admin/users`, `Invitations` → `/portal/admin/invitations`) with the verbatim copy from UI-SPEC §Admin home page placeholder replacement; deleted the static "User Management — Coming Soon" block; corrected the hero `<h1>` weight from `font-black` (900, off-contract) to `font-semibold` (600) per UI-SPEC §Typography 2-weight contract (checker warning 4 fix).

## Tasks & Commits

| # | Task | Commit | Files |
| --- | --- | --- | --- |
| 1 | Create `/portal/assessment/[id]/report` read-only page | `6418f9b` | `src/app/portal/assessment/[id]/report/page.tsx` |
| 2 | Add SSR client redirect layout under `/section/` | `26f52cf` | `src/app/portal/assessment/[id]/section/layout.tsx` |
| 3 | Replace User Management placeholder + fix font-black hero | `939587a` | `src/app/portal/admin/page.tsx` |

## D-19 Implementation Detail

**Why Option A:** the parent `[id]/layout.tsx` wraps BOTH the editable `/section/[num]/*` subtree AND the new `/report/*` subtree. A redirect placed there would have to be path-aware (Next.js does not officially expose request pathname inside server components — Option B was fragile). Creating a new minimal `section/layout.tsx` whose redirect runs only when the request has already routed under `/section/` is a clean superset of D-19's spec ("redirect at section page") and inherits future nested editable routes for free.

The new layout returns `<>{children}</>` — it does not render `<Header />` (the parent `[id]/layout.tsx` already does), so there is no double-header.

## Verification Performed

- `npx tsc --noEmit` — no errors in any of the three changed/new files (pre-existing test-file errors in `src/__tests__/` are out of scope per scope-boundary rule).
- `npm run build` — succeeds; the `/portal/assessment/[id]/report` route appears in the route manifest as expected.
- All `must_haves.truths` (7/7) observable via grep on the changed files.
- All `must_haves.artifacts` paths exist and contain the expected markers (`Section11`, `redirect(`, `/portal/admin/users`).
- All `must_haves.key_links` wired:
  - `report/page.tsx` imports `Section11` and renders `<Section11 assessmentId={id} />`.
  - `report/page.tsx` Download PDF anchor `href={\`/api/assessments/${id}/pdf\`}`.
  - `section/layout.tsx` calls `redirect(\`/portal/assessment/${id}/report\`)` when `session?.user.role === 'client'`.

## Deviations from Plan

### Plan-author oversight: "Coming Soon" grep acceptance

**Found during:** Task 3 verification.

**Issue:** The plan's acceptance criterion for Task 3 includes `grep -c "Coming Soon" src/app/portal/admin/page.tsx returns 0 (placeholder fully removed)`, but the file contains TWO additional unrelated "Coming Soon" placeholders ("Spot Integration" and "Vald Performance Integration") that pre-date this plan and are NOT mentioned in the plan's `must_haves.truths` or `<objective>`. Removing them would silently expand the plan's scope.

**Resolution:** Honored the canonical `must_haves` ("`/portal/admin` page no longer renders 'User Management — Coming Soon'") and removed only that one placeholder. Spot Integration + Vald Performance Integration placeholders remain. The strict grep acceptance was author oversight (likely written assuming "Coming Soon" appeared only once).

**Files modified:** unchanged from plan — `src/app/portal/admin/page.tsx`.

**Commit:** `939587a`.

### No client-side redirect to remove

**Found during:** Task 2 read-first check.

**Issue:** The plan's Task 2 action step 4 anticipated removing a client-side `useEffect` redirect from `src/app/portal/assessment/[id]/section/[num]/page.tsx` (`grep -c "userRole === 'client'"` etc.). Inspection showed no such redirect exists in that file — the section page never had a client-side role check. The acceptance criteria for "client-side redirect removed" pass trivially (returning 0 already).

**Resolution:** No removal needed. SSR redirect in the new layout is the sole client-redirect mechanism, satisfying D-19.

## Threat Surface

All threats in the plan's STRIDE register are dispositioned:

- **T-07-34 (IDOR):** mitigated — `/api/assessments/[id]` and `/api/assessments/[id]/pdf` enforce ownership server-side; report page is defence-in-depth only.
- **T-07-35 (stale auto-save):** mitigated — SSR redirect runs before any client JS; no client-side window for stale POSTs.
- **T-07-36 (DevTools role flip):** mitigated by existing API-level ownership checks.
- **T-07-37, T-07-38, T-07-39:** accepted dispositions per plan.

No new threat surface introduced beyond what the plan dispositioned.

## Self-Check

- `src/app/portal/assessment/[id]/report/page.tsx` — FOUND.
- `src/app/portal/assessment/[id]/section/layout.tsx` — FOUND.
- `src/app/portal/admin/page.tsx` — modified, FOUND.
- Commit `6418f9b` — FOUND in `git log`.
- Commit `26f52cf` — FOUND in `git log`.
- Commit `939587a` — FOUND in `git log`.

## Self-Check: PASSED
