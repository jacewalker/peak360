---
phase: quick-260524-jrm
plan: 01
subsystem: portal/clients
tags: [frontend, ui, list-redesign, frontend-design]
requires: []
provides: ["List-style clients view matching the assessments list"]
affects: ["src/app/portal/clients/page.tsx"]
tech-stack:
  added: []
  patterns: ["assessments-style divide-y list container", "row click navigation via useRouter().push", "checkbox in stopPropagation wrapper"]
key-files:
  created: []
  modified: ["src/app/portal/clients/page.tsx"]
decisions:
  - "Used a left gold accent (border-l-2 border-gold-brand) + bg-gold-brand/5 tint for selected rows instead of the old ring/border treatment — clearer on the dark theme and on-pattern with the list."
  - "Switched from <Link> to useRouter().push to mirror the assessments page exactly, enabling a div row as the click target with a stopPropagation checkbox wrapper."
metrics:
  duration: "~6 min"
  completed: "2026-05-24"
---

# Quick 260524-jrm: Clients Page as a List Summary

Replaced the clients card grid with an assessments-style bordered `divide-y` list — row-as-click-target navigation via `useRouter`, gold-tinted selected rows with a left accent, tabular numerals — preserving all existing toolbar, coach-filter, search, selection, and bulk-delete logic.

## What Changed

**`src/app/portal/clients/page.tsx`** (only file touched):

1. **Imports:** Replaced `import Link from 'next/link'` with `import { useRouter } from 'next/navigation'`. `Link` was only used by the card grid, so the import was removed.
2. **Hook:** Added `const router = useRouter();` at the top of `ClientsPage` (mirrors assessments page).
3. **List markup:** Replaced the `filtered.map(...)` card grid (`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`) with a single bordered container `bg-bg-3 rounded-xl border border-line overflow-hidden` wrapping `divide-y divide-line` rows.
   - **Row:** `px-5 py-4 flex items-center justify-between transition-colors cursor-pointer group border-l-2`, with `onClick={() => router.push('/portal/clients/' + encodeURIComponent(c.name))}`.
     - Selected (`selectedNames.has(c.name)`): `bg-gold-brand/5 border-gold-brand` (gold tint + left gold accent).
     - Not selected: `border-transparent hover:bg-bg-2`.
   - **Left cluster:** checkbox in a `<div onClick={(e) => e.stopPropagation()}>` (`w-5 h-5 rounded border border-line accent-gold-brand`, same `checked`/`onChange`/`aria-label` as before) → avatar `w-10 h-10 rounded-full bg-bg-2 ... group-hover:bg-gold-brand/10` → identity block: name `text-[13px] font-medium text-text truncate`, meta line `text-[13px] text-text-dim` joining email (when present) and the coach attribution with a `•` (`text-line-2`) separator. The unassigned-only coach value keeps the `text-text-faint italic` styling and `title` tooltip.
   - **Right cluster:** `flex items-center gap-3 sm:gap-4 shrink-0` — mono "ASSESSMENTS" label + count in `font-mono tabular-nums text-gold-brand`; `Last: {c.lastAssessment}` (`text-[13px] text-text-dim tabular-nums`, hidden under `sm:`); a subtle right-chevron svg `text-text-faint group-hover:text-gold-brand` signalling navigability.
   - **Empty filtered state:** unchanged — the existing `No clients match "{search}"` message is preserved.

## Kept Unchanged (per scope)

Hero, stats grid, toolbar (Select all + `selectAllRef` + `toggleSelectAll`, Delete-N-selected + `setShowDeleteModal`, admin-only coach `<select>` with its `style={{ width: '20rem' }}`), search row, `ConfirmDeleteModal`, and ALL state/handlers/aggregation logic (`fetchData`, `byClient` aggregation, `coachOptions`, `filtered`, `toggleSelectOne`, `handleBulkDelete`, selection reset effects). No API, data-fetching, selection, coach-filter, or delete-flow changes.

## Frontend-Design Application

Applied the skill's principles within the established navy/gold "quiet luxury" system (no new clashing aesthetic): precision and restraint (one `transition-colors` hover, no scattered effects), cohesive detail (tabular numerals for all numbers, consistent `•` meta separators, `group-hover` avatar tint), and a refined-but-obvious selected state (subtle gold tint + left accent, legible on dark).

## Verification

- `npx tsc --noEmit` — **no errors for `src/app/portal/clients/page.tsx`** (confirmed via grep). The only tsc errors reported are pre-existing and confined to `src/__tests__/` (missing `vi` global in `setup.tsx`, `SimpleMarker`/`SectionData` test type casts in `normative/data.test.ts` and `store/assessment-store.test.ts`). These are out of scope (unrelated test infra) and were logged to `deferred-items.md`.
- `npx eslint src/app/portal/clients/page.tsx` — **exit 0, clean** (including no unused-import warning for the removed `Link`).
- Post-commit checks: no file deletions, no untracked files left behind.

## Task 2 — Human Verification (CHECKPOINT, not auto-run)

Per the plan (`autonomous: false`) and execution constraints, the dev server was NOT started and the UI was NOT clicked through. A dev server is already running. Verify in a coach/admin session:

1. Visit `/portal/clients` — clients render as a single bordered list (not a card grid), visually matching `/portal/assessments`.
2. Click a client row (outside the checkbox) — navigates to `/portal/clients/[name]`.
3. Tick a row's checkbox — row gets the gold tint + left gold accent; the "Delete N selected" button appears; the row click does NOT navigate when toggling the checkbox.
4. "Select all" selects/clears all filtered rows; the header checkbox shows indeterminate state for partial selection.
5. Bulk Delete opens `ConfirmDeleteModal` and removes the selected clients on confirm.
6. Search filters by name/email; the admin-only Coach filter narrows the list. Both reset the selection.
7. Confirm legibility on the dark theme and that rows don't overflow on mobile (email/coach meta wraps/truncates; `Last:` date hides under `sm:`).

## Deviations from Plan

None — plan executed exactly as written. The selected-state implementation uses `bg-gold-brand/5 border-gold-brand` with `border-l-2` (the plan explicitly offered this left-accent option as preferable to a ring on dark).

## Self-Check: PASSED

- `src/app/portal/clients/page.tsx` — FOUND (modified, committed)
- Commit `3ce0238` — FOUND in git log
