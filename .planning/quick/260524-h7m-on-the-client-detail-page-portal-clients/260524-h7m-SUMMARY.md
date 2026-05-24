---
phase: quick-260524-h7m
plan: 01
subsystem: portal
tags: [portal, assessments, ux]
requires:
  - "POST /api/assessments"
  - "PUT /api/assessments/[id]/sections/1"
provides:
  - "Start-assessment-for-this-client shortcut on the client detail page"
affects:
  - src/app/portal/clients/[name]/page.tsx
tech-stack:
  added: []
  patterns:
    - "Auto-assigned assessment creation (clientName from route, no picker)"
key-files:
  created: []
  modified:
    - src/app/portal/clients/[name]/page.tsx
decisions:
  - "Mirror handleCreateForClient from portal/page.tsx but source clientName from the route param instead of a picker"
  - "Place the button right-aligned in the hero next to the name block, matching the dashboard's primary gold-brand button styling"
metrics:
  duration: ~1m
  completed: 2026-05-24
---

# Quick 260524-h7m: Start assessment from the client detail page Summary

Added a "Start assessment" button to the client detail page hero
(`/portal/clients/[name]`) that creates a new assessment already assigned to
that client (clientName sourced from the route param), seeds Section 1 with the
name, and navigates to `/portal/assessment/{id}/section/1` — no client picker,
since the client is already known.

## What changed

- Imported `useRouter` alongside the existing `useParams` from `next/navigation`.
- Added `const router = useRouter();` and a `creating` boolean state.
- Added `handleStartAssessment`: POSTs `/api/assessments` with `{ clientName }`,
  PUTs `/api/assessments/{id}/sections/1` with `{ data: { clientName } }` to seed
  Section 1, then `router.push` to section 1. Wrapped in try/finally to reset the
  `creating` flag.
- Rendered a right-aligned "Start assessment" button in the hero `<header>`,
  matching the dashboard's primary gold-brand button (`bg-gold-brand text-bg
  hover:bg-champagne`). The button is disabled and shows "Starting…" while the
  create request is in flight.

## Verification

- `npx tsc --noEmit`: **no errors in `src/app/portal/clients/[name]/page.tsx`**.
  The only `tsc` errors reported are pre-existing failures in `src/__tests__/*`
  test files (missing `vi` global, `SimpleMarker`/`SectionData` index-signature
  casts) — unrelated to this task and out of scope.
- `npx eslint 'src/app/portal/clients/[name]/page.tsx'`: **clean (exit 0)**.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Commits

- c2a4e5a: feat(quick-260524-h7m): start assessment from client detail page

## Self-Check: PASSED

- FOUND: src/app/portal/clients/[name]/page.tsx
- FOUND: commit c2a4e5a
