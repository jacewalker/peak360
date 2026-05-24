---
phase: quick-260524-haw
plan: 01
subsystem: portal-ui
tags: [portal, client-picker, ux, copy]
requires: []
provides:
  - "ClientPickerDialog.createLabel prop (dynamic create-flavored confirm label)"
  - "New-client detection + guidance text in the picker"
affects:
  - src/components/portal/ClientPickerDialog.tsx
  - src/app/portal/page.tsx
  - src/app/portal/assessments/page.tsx
tech-stack:
  added: []
  patterns:
    - "Optional prop with no default to preserve existing call-site behavior (assign dialog)"
    - "Derived render-time booleans (no setState-in-effect) for new-client detection"
key-files:
  created: []
  modified:
    - src/components/portal/ClientPickerDialog.tsx
    - src/app/portal/page.tsx
    - src/app/portal/assessments/page.tsx
decisions:
  - "Folded the old 'No matches — confirm to create a new client.' line into a single always-present helper line under the input to avoid duplicate/contradictory messaging; the zero-matches case now just reads 'No matches.'"
  - "createLabel has no default so omitting it (assign dialog) preserves the original confirmLabel-only behavior."
metrics:
  duration: ~6m
  completed: 2026-05-24
---

# Quick 260524-haw: Make creating a new client obvious in the picker — Summary

Made the new-client path in `ClientPickerDialog` obvious and added a dynamic
confirm label: typing a brand-new name at a create gate now shows
"Create Client & Start", while selecting/matching an existing client keeps
"Start assessment". The Assign dialog is unaffected.

## What changed

### Task 1 — `ClientPickerDialog` (commit 4ccfa80)
- Added optional `createLabel?: string` prop (no default — omitting it preserves
  the assign dialog's behavior of always showing its `confirmLabel`).
- Added render-time derivations: `isExisting` (case-insensitive match against
  `sortedNames`), `isNewClient` (`trimmed.length > 0 && !isExisting`), and
  `activeLabel = isNewClient && createLabel ? createLabel : confirmLabel`.
- Confirm button now renders `busy ? 'Working…' : activeLabel`.
- Changed input placeholder to `"Search existing or type a new client name"`.
- Added a subtle helper line (`text-[12px] text-text-dim`) under the input:
  when new, `New client — "{trimmed}" will be created.` (name in `text-gold-brand`);
  otherwise `Pick an existing client, or type a new name to create one.`
- Folded the old zero-matches "confirm to create" line into that helper line to
  avoid duplicate/contradictory copy; the empty-filter state now reads "No matches."
- No setState-in-effect; existing memo/handler patterns preserved.

### Task 2 — Create-gate call sites (commit aa12075)
- `src/app/portal/page.tsx` (dashboard create gate): added
  `createLabel="Create Client & Start"`.
- `src/app/portal/assessments/page.tsx` (create gate, `onConfirm={handleCreateForClient}`):
  added `createLabel="Create Client & Start"`.
- Assign dialog (`title="ASSIGN TO CLIENT"`, `confirmLabel="Assign"`) left
  untouched — still shows "Assign".

## Verification

- `npx tsc --noEmit`: no errors in any of the three modified files. (Pre-existing
  errors exist only in `src/__tests__/**` — vitest globals/type-cast issues
  unrelated to this task and out of scope.)
- `npx eslint` on all three modified files: exit 0, clean.
- Did not start a dev server (one already running, per constraints).

## Must-haves check

- Picker makes the new-client option obvious (placeholder + helper line): yes.
- New (non-matching) name at a create gate → "Create Client & Start": yes.
- Existing client selected/matched → "Start assessment": yes (no createLabel applied).
- Assign dialog unaffected by the new-client label: yes (no createLabel passed).

## Deviations from Plan

None of substance. Per the plan's step 4 latitude, the existing
"No matches — confirm to create a new client." line was folded into the new
always-present helper line (now "No matches.") to prevent duplicate messaging.

## Known Stubs

None.

## Self-Check: PASSED

- src/components/portal/ClientPickerDialog.tsx — FOUND (modified)
- src/app/portal/page.tsx — FOUND (modified)
- src/app/portal/assessments/page.tsx — FOUND (modified)
- Commit 4ccfa80 — FOUND
- Commit aa12075 — FOUND
