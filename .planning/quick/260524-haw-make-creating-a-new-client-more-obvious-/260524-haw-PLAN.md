---
phase: quick-260524-haw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/portal/ClientPickerDialog.tsx
  - src/app/portal/page.tsx
  - src/app/portal/assessments/page.tsx
autonomous: true
requirements:
  - HAW-01  # Make "create a new client" obvious in the picker (guidance text)
  - HAW-02  # Dynamic confirm label: "Create Client & Start" for a new (non-existing) name
must_haves:
  truths:
    - "The client picker makes it obvious you can type a brand-new client name (clear placeholder/helper guidance)"
    - "When the typed name does NOT match any existing client, the create-gate confirm button reads 'Create Client & Start'"
    - "When an existing client is selected/matched, the confirm button reads 'Start assessment' (unchanged)"
    - "The Assign dialog is NOT affected by the new-client label (it keeps its own confirmLabel)"
  artifacts:
    - path: "src/components/portal/ClientPickerDialog.tsx"
      provides: "createLabel prop + new-client detection + guidance text"
      contains: "createLabel"
  key_links:
    - from: "src/app/portal/page.tsx"
      to: "ClientPickerDialog"
      via: "passes createLabel for the new-assessment gate"
      pattern: "createLabel"
---

# Quick 260524-haw — Make creating a new client obvious in the picker

## Objective

In `ClientPickerDialog`, make it clear the coach can create a brand-new client
by typing a name, and switch the confirm button label to a create-flavored
label when the entered name is NOT one of the existing clients.

## Current behavior (for reference)

`src/components/portal/ClientPickerDialog.tsx`:
- Props: `confirmLabel` (default `'Start assessment'`), `title` (default `'WHICH CLIENT?'`), `busy`, `existingNames`, `onConfirm`, etc.
- `trimmed = name.trim()`, `canConfirm = trimmed.length > 0 && !busy`.
- `sortedNames` = deduped existing names. The input is a typeahead filter; clicking a row sets `name`.
- Confirm button text: `busy ? 'Working…' : confirmLabel`.
- Placeholder: `"Client name"`. There is already a "No matches — confirm to create a new client." line when the filter has zero matches.

Call sites:
- `src/app/portal/page.tsx` (dashboard create gate) — default labels.
- `src/app/portal/assessments/page.tsx` line ~439 (create gate) — default labels.
- `src/app/portal/assessments/page.tsx` line ~447 (ASSIGN dialog) — `title="ASSIGN TO CLIENT"`, `confirmLabel="Assign"`.

## Tasks

### Task 1 — Add `createLabel` prop + new-client detection + guidance to ClientPickerDialog

**Files:** `src/components/portal/ClientPickerDialog.tsx`

**Action:**
1. Add an optional prop `createLabel?: string` to `ClientPickerDialogProps` and the destructured params (no default, so omitting it preserves current behavior — important for the Assign dialog).
2. Compute `isExisting` = `sortedNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())` and `isNewClient = trimmed.length > 0 && !isExisting`.
3. Confirm button label logic: `busy ? 'Working…' : (isNewClient && createLabel ? createLabel : confirmLabel)`.
4. Make the new-client path obvious:
   - Change the input placeholder to something like `"Search existing or type a new client name"`.
   - Add a short helper line under the input (e.g. text-text-dim, text-[12px]): when `isNewClient`, show e.g. `"New client — “{trimmed}” will be created."`; otherwise show generic guidance like `"Pick an existing client, or type a new name to create one."` Keep it subtle and on-brand (navy/gold tokens, existing type sizes).
   - Keep the existing "No matches — confirm to create a new client." behavior (or fold it into the helper line — avoid duplicate/contradictory messaging).
5. Do NOT close over stale state; keep the existing memo/handler patterns and the project's react-hooks lint rules (no setState-in-effect).

**Verify:** `npx tsc --noEmit` clean for the file; `npx eslint src/components/portal/ClientPickerDialog.tsx` clean.

### Task 2 — Pass `createLabel` at the create gates

**Files:** `src/app/portal/page.tsx`, `src/app/portal/assessments/page.tsx`

**Action:**
- On the two CREATE-gate `<ClientPickerDialog>` usages (the ones whose `onConfirm` is `handleCreateForClient`), add `createLabel="Create Client & Start"`.
- Leave the ASSIGN dialog usage as-is (no `createLabel`) so it keeps showing `"Assign"`. Optionally, for consistency, you may add `createLabel="Create & Assign"` to the assign dialog — only if it reads naturally; otherwise leave it untouched.

**Verify:** `npx tsc --noEmit` clean; the three call sites compile.

**Done when:** Typing a brand-new name in the create gate shows "Create Client & Start"; selecting an existing client shows "Start assessment"; the assign dialog is unchanged; guidance makes the new-client option obvious.

## Out of scope

- No DB/schema changes; still name-based (no clientId).
- No change to the create/seed/navigation logic itself (done in 260524-gre).

## Conventions

Follow `CLAUDE.md`: `'use client'`, `@/` imports, `import type`, camelCase,
navy/gold Tailwind tokens. Use `&` (or "and") consistently — final copy
"Create Client & Start".
