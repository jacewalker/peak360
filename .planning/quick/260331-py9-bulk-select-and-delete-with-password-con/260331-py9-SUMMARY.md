---
phase: quick
plan: 260331-py9
subsystem: assessments, clients, auth
tags: [bulk-delete, password-confirmation, checkboxes, ui]
dependency_graph:
  requires: []
  provides: [bulk-select, bulk-delete, password-confirmation]
  affects: [assessments-page, clients-page]
tech_stack:
  added: []
  patterns: [confirm-delete-modal, bulk-action-toolbar, indeterminate-checkbox]
key_files:
  created:
    - src/components/ui/ConfirmDeleteModal.tsx
    - src/app/api/auth/verify-password/route.ts
    - src/app/api/assessments/bulk-delete/route.ts
  modified:
    - src/app/assessments/page.tsx
    - src/app/clients/page.tsx
decisions:
  - Client deletion maps client names to assessment IDs and deletes all their assessments
  - Selection clears on search change to prevent accidental deletion of hidden items
  - Password verification is one-shot (no session created) for safety gate pattern
metrics:
  duration: 4m 0s
  completed: 2026-03-31
---

# Quick Task 260331-py9: Bulk Select and Delete with Password Confirmation Summary

Bulk select checkboxes with select-all and password-gated bulk delete on both assessments and clients pages.

## What Was Done

### Task 1: Create verify-password and bulk-delete API endpoints (24d536e)
- `verify-password/route.ts`: POST endpoint that checks password against ADMIN_PASSWORD env var, returns 401 on mismatch, no session/cookie created
- `bulk-delete/route.ts`: POST endpoint accepting `{ ids: string[] }`, validates non-empty array, deletes via drizzle `inArray`

### Task 2: Create shared ConfirmDeleteModal component (f0c30aa)
- Reusable modal with password input, auto-focus, escape key dismiss, overlay click dismiss
- Loading state disables inputs, error state shows red text below input
- Calls `/api/auth/verify-password` before invoking `onConfirm` callback
- Accepts `itemCount` and `itemLabel` for flexible "Delete N assessment(s)" / "Delete N client(s)" text

### Task 3: Add bulk select and delete to assessments and clients pages (c043f5a)
- Both pages: checkbox per row, select-all checkbox with indeterminate state via ref, "Delete N selected" red button
- Assessments page: checkbox before avatar in each row, stopPropagation so row click still navigates
- Clients page: checkbox inside Link with preventDefault, maps selected client names to assessment IDs for bulk delete
- Selection state clears when search input changes

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Verification

- `npm run build` passes without errors
- Both API routes appear in build output (`/api/auth/verify-password`, `/api/assessments/bulk-delete`)
- Both pages compile as static content (`/assessments`, `/clients`)

## Self-Check: PASSED
