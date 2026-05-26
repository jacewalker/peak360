---
phase: 11-report-marker-detail-coach-insights
plan: 03
subsystem: ui
tags: [admin, nextjs, rbac, optimistic-concurrency, dark-portal, marker-content]

requires:
  - phase: 11-01
    provides: marker_content table + MarkerContent read layer
  - phase: 11-02
    provides: admin GET/PUT + list API the editor fetches
provides:
  - admin marker-content list page (category-grouped, links per marker)
  - per-marker editor (Definition + Impact + 5-tier x Male/Female coach-insight matrix) with optimistic-concurrency PUT + beforeunload dirty guard
  - Marker Content nav card in ADMIN_SECTIONS
affects: [11-04-report-detail-panel]

tech-stack:
  added: []
  patterns:
    - "Admin authoring page cloned from /portal/admin/normative[/[marker]] (SSR gate + client editor)"
    - "Gender-tab affordance reduced to two values (male/female) for the coach-insight matrix"

key-files:
  created:
    - src/app/portal/admin/marker-content/page.tsx
    - src/app/portal/admin/marker-content/[marker]/page.tsx
  modified:
    - src/app/portal/admin/page.tsx

key-decisions:
  - "List groups all REPORT_MARKERS by REPORT_CATEGORIES (97 markers across 5 categories); each links to its editor"
  - "Editor reuses the normative editor's 409-aware optimistic-concurrency PUT (updatedAt) + beforeunload guard verbatim"
  - "D-14 tone guidance text surfaced above the editor body"

patterns-established:
  - "SSR admin gate (auth.api.getSession -> role !== 'admin' redirect) on both pages; API enforces independently (defense in depth)"

requirements-completed: [D-07, D-10, D-14]

duration: ~6min
completed: 2026-05-26
---

# Phase 11 Plan 03: Admin authoring UI — Summary

**Admins can now author every marker's Definition, Impact, and full 5-tier × Male/Female coach-insight matrix from a category-grouped list and a per-marker editor that saves with optimistic concurrency and guards unsaved edits — verified end-to-end in the browser.**

## Performance

- **Tasks:** 3 (2 auto + 1 browser-verify checkpoint)
- **Completed:** 2026-05-26
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- **Marker Content nav card** added to `ADMIN_SECTIONS` on `/portal/admin`, beside Normative Ranges.
- **List page** (`/portal/admin/marker-content`): SSR admin-gated, groups all REPORT_MARKERS by REPORT_CATEGORIES (97 markers: Blood Tests 63, Body Composition 8, Cardiovascular 4, Strength 14, Mobility 8), each linking to its editor.
- **Editor** (`/portal/admin/marker-content/[marker]`): `'use client'`, `use(params)`, fetch-on-mount, Definition + Impact textareas, a 5-tier × Male/Female coach-insight matrix with gender tabs, `beforeunload` dirty guard, 409-aware `handleSave` sending `updatedAt`, D-14 tone guidance text, dark-portal tokens throughout.

## Task Commits

1. **Task 1: Admin marker-content list page + admin index nav card** — `44b3990` (feat)
2. **Task 2: Admin per-marker editor with optimistic concurrency + dirty guard** — `019936d` (feat)
3. **Task 3: Browser round-trip verification** — checkpoint (no code commit). Driven via Playwright by the orchestrator on the user's behalf.

## Files Created/Modified
- `src/app/portal/admin/marker-content/page.tsx` — category-grouped list (SSR admin gate).
- `src/app/portal/admin/marker-content/[marker]/page.tsx` — per-marker editor.
- `src/app/portal/admin/page.tsx` — Marker Content card in ADMIN_SECTIONS.

## Checkpoint Verification (Playwright, live dev server :8080)
- Admin login (admin@admin.com) → admin index shows the Marker Content card. ✓
- List groups 97 markers by category, each linking to its editor. ✓
- Total Testosterone editor loads seeded Definition + Impact + the full Male matrix (Attention/Cautious/Normal/Optimal/Peak); Female tab shows distinct female content for all 5 tiers. ✓
- Edit Definition → Save enabled → PUT success → Save re-disabled; persistence confirmed in Postgres; reverted cleanly (`DEFINITION_CLEAN: true`). ✓
- `audit_logs` gained 2 `marker_content.update` rows from the two saves (D-11 audit on writes). ✓
- Unauthenticated request to `/portal/admin/marker-content` → 307 redirect to `/login` (SSR gate). ✓
- `beforeunload` dirty guard and the 409-conflict path are present in code (executor grep + 11-02 route 409 semantics); not triggered interactively.

## Deviations
- None in code. The card stat reads "98 markers" (a count source slightly above the 97 unique-testKey markers actually listed/seeded) — cosmetic, flagged for optional follow-up.

## Self-Check: PASSED
- `npx tsc --noEmit` clean for all three files.
- Browser round-trip verified against the live dev server + live Postgres (see above).
