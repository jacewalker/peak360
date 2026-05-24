---
phase: quick-260524-jrm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/portal/clients/page.tsx
autonomous: false
requirements:
  - JRM-01  # Clients render as a list matching the assessments page (not a card grid)
  - JRM-02  # Preserve all functionality: coach filter, select-all, bulk delete, search, per-client nav, selection + hover states
must_haves:
  truths:
    - "Clients on /portal/clients render as a single bordered list container with divided rows (same visual language as /portal/assessments), not a card grid"
    - "Each row shows: select checkbox, avatar initial, client name + email, coach attribution, assessment count, and last-assessment date"
    - "Clicking a row (outside the checkbox) navigates to /portal/clients/[name]"
    - "A selected row is clearly distinguished (gold tint + left gold accent) and hover highlights the row"
    - "Coach filter (admin-only), Select all, bulk Delete, and search all still work exactly as before"
  artifacts:
    - path: "src/app/portal/clients/page.tsx"
      provides: "List-style clients view matching the assessments list"
      contains: "divide-y divide-line"
---

# Quick 260524-jrm — Clients page as a list (match assessments) + frontend-design polish

## Goal

Replace the clients **card grid** with a **list** that matches the assessments
page's pattern, applying the `frontend-design` skill's principles: precision,
refined spacing, tabular numerals, subtle hover/selected micro-interactions —
cohesive with the established navy/gold "quiet luxury" system (do NOT invent a
new clashing aesthetic; elevate within the existing system).

## Reference — assessments list pattern

`src/app/portal/assessments/page.tsx` (~L357–426) is the canonical pattern to mirror:
```tsx
<div className="bg-bg-3 rounded-xl border border-line overflow-hidden">
  <div className="divide-y divide-line">
    {filtered.map((a) => (
      <div className="px-5 py-4 flex items-center justify-between hover:bg-bg-2 transition-colors cursor-pointer group" onClick={…navigate}>
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div onClick={(e) => e.stopPropagation()}><input type="checkbox" … /></div>
          <div className="w-10 h-10 rounded-full bg-bg-2 … group-hover:bg-gold-brand/10 …">{initial}</div>
          <div className="min-w-0"> name + meta line </div>
        </div>
        <div className="flex items-center gap-3 shrink-0"> status pill + actions </div>
      </div>
    ))}
  </div>
</div>
```
Key behaviours to copy: row is the click target (navigates), checkbox sits in a
`stopPropagation` wrapper, avatar tints on `group-hover`, meta uses `text-text-dim`
with `•` separators, numerals use `tabular-nums`.

## Current clients page (what to keep)

`src/app/portal/clients/page.tsx`:
- Hero (PEOPLE · CLIENTS / "Clients" / count line) — KEEP.
- Stats grid (Total clients, Total assessments) — KEEP as-is.
- Toolbar (~L213+): Select all (`selectAllRef`, `toggleSelectAll`), Delete N selected (`setShowDeleteModal`), and the admin-only **Coach filter** `<select>` (inline `style={{ width: '20rem' }}`) — KEEP all.
- Search row — KEEP.
- `ConfirmDeleteModal` at the bottom — KEEP.
- Selection state `selectedNames: Set<string>`, `toggleSelectOne(name)`, `filtered` (search + coach filter), `coachOptions`. KEEP all logic.
- The card grid block (~L283–337) — REPLACE with the list.
- `Client` shape: `{ name, email, gender, dob, assessmentCount, lastAssessment, coaches: string[] }`.
- `UNASSIGNED_COACH = 'Unassigned'`.

## Task 1 — Replace the card grid with an assessments-style list

**File:** `src/app/portal/clients/page.tsx`

**Action:** Replace ONLY the `filtered.map(...)` card-grid block with a list container matching the assessments pattern. For each client `c`:

- **Container:** `<div className="bg-bg-3 rounded-xl border border-line overflow-hidden"><div className="divide-y divide-line"> … </div></div>`.
- **Row:** a `div` (key `c.name`) — `px-5 py-4 flex items-center justify-between transition-colors cursor-pointer group`, with conditional state classes:
  - selected (`selectedNames.has(c.name)`): `bg-gold-brand/5` + a left gold accent — e.g. add `border-l-2 border-gold-brand` (or a `ring`-free left accent). Keep it subtle and legible on dark.
  - not selected: `hover:bg-bg-2`.
  - `onClick={() => router.push('/portal/clients/' + encodeURIComponent(c.name))}` — NOTE: the page currently uses `<Link>` for cards and imports `Link`; switch the row to an onClick navigation using `useRouter` (add `import { useRouter } from 'next/navigation'` and `const router = useRouter()` — mirror assessments). Remove the now-unused `Link` import if nothing else uses it.
- **Left cluster** (`flex items-center gap-3 sm:gap-4 min-w-0`):
  - checkbox in a `<div onClick={(e) => e.stopPropagation()}>` — `type="checkbox"`, `w-5 h-5 rounded border border-line accent-gold-brand`, `checked={selectedNames.has(c.name)}`, `onChange={() => toggleSelectOne(c.name)}`, `aria-label={`Select ${c.name}`}`.
  - avatar: `w-10 h-10 rounded-full bg-bg-2 flex items-center justify-center text-text font-medium text-[13px] group-hover:bg-gold-brand/10 transition-colors shrink-0` → `{(c.name || 'U')[0].toUpperCase()}`.
  - identity (`min-w-0`): name `text-[13px] font-medium text-text truncate`; meta line `text-[13px] text-text-dim` with email (if present) and the coach attribution joined by `•` separators (`text-line-2`). Render the coach value with the existing unassigned styling (`text-text-faint italic` when the only coach is `UNASSIGNED_COACH`).
- **Right cluster** (`flex items-center gap-3 sm:gap-4 shrink-0`):
  - assessment count: small mono label "ASSESSMENTS" + the number in `tabular-nums` (gold-brand), OR a compact pill `N assessments`. Keep it tidy and right-aligned; use `font-mono` + `tabular-nums` for the number.
  - last-assessment date: `text-[13px] text-text-dim` → `Last: {c.lastAssessment}`.
  - a subtle chevron (right-arrow svg, `text-text-faint group-hover:text-gold-brand`) to signal the row is navigable — optional but on-pattern.
- **Empty filtered state:** keep a graceful message (e.g. reuse the existing "no clients match" / empty copy) consistent with the assessments page's empty handling.

**Frontend-design polish (within the existing system):**
- Consistent vertical rhythm; align the right cluster cleanly; use `tabular-nums` for all numerals.
- Subtle, single hover transition (`transition-colors`) — no scattered effects.
- Selected state must be obvious but refined (gold tint + left accent), readable on the dark theme.
- Mobile: keep the row legible — allow the email/coach meta to wrap or truncate; the count/date may collapse under `sm:` if needed. Don't let the row overflow.

**Verify:**
- `npx tsc --noEmit` clean for the file (watch for the removed `Link` import).
- `npx eslint src/app/portal/clients/page.tsx` clean.

## Task 2 — Human verification checkpoint

Coach/admin session on the running dev server: `/portal/clients` shows a list (not cards) matching the assessments look; selecting a client highlights its row + shows Delete; clicking a row opens that client; coach filter + search + select-all + bulk delete all still work.

## Out of scope

- No API changes, no change to data fetching/aggregation, selection logic, coach-filter logic, or the delete flow.
- No change to the assessments page or the client detail page.

## Conventions

Follow `CLAUDE.md` + the assessments list pattern. Navy/gold tokens
(`bg-bg-3`, `bg-bg-2`, `border-line`, `text-text`/`-dim`/`-faint`, `gold-brand`).
`'use client'`, `@/` imports. Apply the `frontend-design` skill's emphasis on
precision, restraint, and cohesive detail — match, don't clash with, the system.
