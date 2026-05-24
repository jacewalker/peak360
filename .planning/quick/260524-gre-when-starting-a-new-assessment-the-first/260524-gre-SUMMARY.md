---
phase: quick-260524-gre
plan: 01
subsystem: portal
tags: [portal, assessments, clients, ux]
status: awaiting-human-verify
requires:
  - "ui/Dialog primitive"
  - "ui/MonoEyebrow primitive"
  - "POST /api/assessments (accepts clientName)"
  - "PUT /api/assessments/[id] (partial merge)"
  - "PUT /api/assessments/[id]/sections/1 (seed Section 1 blob)"
provides:
  - "ClientPickerDialog — reusable name-based client picker"
  - "Client gate on every Start-new-assessment entry point"
  - "Per-row Assign action for unassigned assessments"
affects:
  - src/app/portal/page.tsx
  - src/app/portal/assessments/page.tsx
tech-stack:
  added: []
  patterns:
    - "Name-based client model (no clientId / no DB table)"
    - "Parent-owned Dialog open state; child clears input on close/confirm"
key-files:
  created:
    - src/components/portal/ClientPickerDialog.tsx
  modified:
    - src/app/portal/page.tsx
    - src/app/portal/assessments/page.tsx
decisions:
  - "Reset picker input via close/confirm handlers, not a setState-in-effect (project react-hooks lint forbids the effect form)"
  - "Assign button is always visible on unassigned rows (not opacity-0) so the affordance is obvious"
metrics:
  duration: ~12m
  tasks: 3 of 3 auto tasks (Task 4 is a human-verify checkpoint — paused)
  files: 3
  completed: 2026-05-24
requirements: [GRE-01, GRE-02]
---

# Quick Task 260524-gre: New-assessment client gate + assign unassigned Summary

Every "Start new assessment" button now opens a reusable name-based client picker before any assessment is created, and unassigned (legacy null-name) assessments can be assigned to a client from the assessments list.

## What Was Built

**Task 1 — `ClientPickerDialog` (`src/components/portal/ClientPickerDialog.tsx`, commit 53d479c)**
A `'use client'` default-export component wrapping `@/components/ui/Dialog`. Props: `{ open, onClose, existingNames, onConfirm, title?, confirmLabel?, busy? }`. It renders a `MonoEyebrow` heading, a `data-autofocus` text input (navy/gold tokens), and — when `existingNames` is non-empty — a scrollable, deduped (case-insensitive), sorted list of name buttons that doubles as a typeahead (filtered by the current input). Confirm is disabled until `name.trim()` is non-empty (or while `busy`); it trims whitespace and a typed name matching an existing one case-insensitively is treated the same as picking it. The parent owns `open`, so the dialog does not self-close on confirm failure.

**Task 2 — Gate all create entry points + seed Section 1 (`src/app/portal/page.tsx` + `src/app/portal/assessments/page.tsx`, commit b3305fb)**
Replaced the one-click `createAssessment` (which POSTed `{}`) in both pages with `handleCreateForClient(name)`: POST `/api/assessments` with `{ clientName }`, then PUT `/api/assessments/{id}/sections/1` with `{ data: { clientName } }` to seed Section 1 (so the name renders pre-filled and auto-save can't blank it), then navigate to Section 1. Every create button (dashboard hero, dashboard empty-state, admin/coach recent-empty text buttons, assessments-list hero, assessments-list empty-state) now opens the picker via `setPickerOpen(true)`. `existingNames` is derived client-side from the already-loaded assessments. The old `createAssessment` definition was removed from both files.

**Task 3 — Per-row Assign action (`src/app/portal/assessments/page.tsx`, commit 2e48529)**
Unassigned rows (`!a.clientName`) now render as "Unassigned" (faint italic) and show an always-visible gold-accent "Assign" button beside Delete (with `stopPropagation` so it doesn't trigger row navigation). Clicking it opens a second `ClientPickerDialog` instance (`title="ASSIGN TO CLIENT"`, `confirmLabel="Assign"`). `handleAssign` PUTs `{ clientName }` to `/api/assessments/{id}`, then on success clears the target and calls `fetchAssessments()` so the row refreshes and the Assign button disappears.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced setState-in-effect with close/confirm reset in ClientPickerDialog**
- **Found during:** Lint check after Task 3 (`npm run lint`).
- **Issue:** The plan specified resetting the picker's local `name` via `useEffect(() => { if (open) setName(''); }, [open])`. The project's ESLint config enforces `react-hooks/set-state-in-effect`, which treats that as an error — so the plan's exact form would fail the required lint gate (CLAUDE.md mandates lint passes).
- **Fix:** Removed the effect (and the now-unused `useEffect` import). Added a `handleClose` that clears `name` then calls `onClose` (wired into the Dialog `onClose` and the Cancel button), and clear `name` after a successful `onConfirm`. Net behavior is identical — the input is empty on each open — without the lint violation.
- **Files modified:** src/components/portal/ClientPickerDialog.tsx
- **Commit:** 2e48529 (the lint fix was bundled into the Task 3 commit since it touched the same component)

## Verification

- **`npx tsc --noEmit`:** 0 errors on all three changed files (`ClientPickerDialog.tsx`, `portal/page.tsx`, `portal/assessments/page.tsx`). The repo has ~19 pre-existing errors confined to `.next/types` (audit-logs validator) and `src/__tests__/*` (vitest `vi` globals, store/normative test type casts) — none related to this task (out of scope).
- **`npx eslint` (3 changed files):** clean, exit 0. No unused `createAssessment`, no relative imports (all `@/`).
- **Tests (`npx vitest run`):** 32 pre-existing failures, none touching this task's files. No test references `ClientPickerDialog`, `portal/page`, or `portal/assessments`. The failures are stale assertions against Phase 9-redesigned UI (e.g. `home.test.tsx` imports `@/app/page` and expects pre-redesign text like "Complete Longevity Assessment"; `normative.test.ts` expects tier label "Poor" but the current label is "Attention"; sidebar/section/layout label drift). These predate this task and are out of scope per the executor SCOPE BOUNDARY.
- **No new npm dependency**; Dialog primitive reused. No DB schema change; POST/PUT contracts unchanged.

## Known Stubs

None. All UI is wired to live API calls (`POST /api/assessments`, `PUT /sections/1`, `PUT /api/assessments/[id]`) and `existingNames` is derived from loaded data.

## Human Verification Required (Task 4 — checkpoint:human-verify)

This plan is non-autonomous; the executor stopped at the checkpoint without starting a dev server. A human should verify (a coach session against the running dev server / remote Postgres):

1. `/portal` dashboard — click "Start new assessment": a "WHICH CLIENT?" dialog appears BEFORE any assessment is created; the confirm button is disabled until a name is entered.
2. Type a NEW name and confirm — you land on Section 1 with the Full Name field already filled with that name; reload Section 1 and the name persists (no blanking).
3. Start another assessment and PICK an EXISTING name from the list — same pre-fill behavior.
4. Repeat the gate check from the `/portal/assessments` hero button and the empty-state button.
5. `/portal/assessments` — find an unassigned assessment (shows "Unassigned"). Click "Assign", choose/type a client name, confirm — the row refreshes to show the name and the Assign button disappears.

## Self-Check: PASSED

- FOUND: src/components/portal/ClientPickerDialog.tsx
- FOUND: src/app/portal/page.tsx
- FOUND: src/app/portal/assessments/page.tsx
- FOUND commit: 53d479c (Task 1)
- FOUND commit: b3305fb (Task 2)
- FOUND commit: 2e48529 (Task 3 + lint fix)
