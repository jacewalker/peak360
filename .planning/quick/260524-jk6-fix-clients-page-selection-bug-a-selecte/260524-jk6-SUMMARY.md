---
phase: quick-260524-jk6
plan: 01
subsystem: portal-clients-ui
tags: [ui, tailwind, selection-state, dark-theme]
requires: []
provides:
  - "Conditional selected-state styling on /portal/clients client cards"
affects:
  - src/app/portal/clients/page.tsx
tech-stack:
  added: []
  patterns:
    - "Conditional Tailwind className via template literal keyed on selectedNames.has(c.name)"
key-files:
  created: []
  modified:
    - src/app/portal/clients/page.tsx
decisions:
  - "Moved `border` into shared classes; only the border colour (and ring/tint) is conditional — avoids a double `border` utility."
  - "Selected state replaces `bg-bg-3` with the subtle `bg-gold-brand/5` tint plus a gold border and `ring-1 ring-gold-brand/40` for clear emphasis on the dark theme."
metrics:
  duration: ~4m
  completed: 2026-05-24
---

# Quick 260524-jk6: Clients page selection visual fix Summary

Selected client cards on `/portal/clients` now have a clear gold border, ring, and subtle gold tint, and the selection checkbox is enlarged to 20px with a visible border — so coaches can tell at a glance which clients are selected. No selection/delete logic was touched.

## What Changed

**`src/app/portal/clients/page.tsx` (card render, ~L285–298):**

1. The card `<Link>` className is now conditional on `selectedNames.has(c.name)`:
   - **Selected:** `border-gold-brand ring-1 ring-gold-brand/40 bg-gold-brand/5`
   - **Unselected:** `bg-bg-3 border-line hover:border-gold-brand/40` (unchanged look + existing hover behaviour preserved)
   - Shared classes: `block rounded-xl border p-6 transition-colors` — `border` lives in the shared part, only the colour is conditional (no double `border` utility).
2. The selection checkbox was bumped from `w-4 h-4` to `w-5 h-5` and given a visible `border border-line` while keeping `accent-gold-brand`.

## Out of Scope / Untouched (as required)

- Selection state (`selectedNames` Set), `toggleSelectOne`, and delete logic — unchanged.
- `onClick preventDefault` wrapper and checkbox `aria-label` — unchanged.
- Coach filter, select-all, search, list/grid layout, and card content — unchanged.

## Verification

- `npx tsc --noEmit`: exit 1, but **all** errors are pre-existing in `src/__tests__/*` files (test setup / type-cast issues unrelated to this change). **Zero** errors in `src/app/portal/clients/page.tsx`; zero non-test errors. Logged to `deferred-items.md`.
- `npx eslint src/app/portal/clients/page.tsx`: exit 0, clean.

## Deviations from Plan

None — plan executed exactly as written.

## Deferred Issues (out of scope)

Pre-existing `tsc --noEmit` errors in test files (not caused by this task, not fixed per scope boundary): `src/__tests__/components/layout.test.tsx`, `src/__tests__/normative/data.test.ts`, `src/__tests__/setup.tsx`, `src/__tests__/store/assessment-store.test.ts`. See `deferred-items.md`.

## Commits

- `23a4791`: fix(quick-260524-jk6-01): add selected-state styling to client cards

## Self-Check: PASSED

- `src/app/portal/clients/page.tsx` exists and contains the conditional `selectedNames.has(c.name)` styling.
- Commit `23a4791` exists in git history.
