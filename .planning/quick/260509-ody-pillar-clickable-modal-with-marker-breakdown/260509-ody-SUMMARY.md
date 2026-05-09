---
phase: quick
plan: 260509-ody
subsystem: report
tags: [section11, pillars, modal, accessibility]
requires: ["src/components/ui/Dialog.tsx", "src/lib/pillars/mapping.ts", "src/lib/pdf/types.ts", "src/types/normative.ts"]
provides: ["PillarsDisplayModal", "Clickable PillarsDisplay tiles"]
affects: ["src/components/sections/Section11.tsx"]
tech-stack:
  added: []
  patterns: ["Reuse Dialog primitive (no new ESC/focus-trap/backdrop logic)", "markerToPillar classifier reused on the client to keep modal grouping consistent with computeAllPillarScoresLegacy"]
key-files:
  created:
    - src/components/report/PillarsDisplayModal.tsx
  modified:
    - src/components/report/PillarsDisplay.tsx
    - src/components/sections/Section11.tsx
decisions:
  - "Use the shared Dialog primitive (mode='auto') rather than copying PillarModal.tsx — PillarModal requires DB-loaded PillarDefinition/PillarPrescription props Section 11 doesn't have."
  - "Include both primary and supporting markers in the modal — informational view, not score-strict."
  - "Markers without a tier go in a separate 'Pending' group at the end of the order."
  - "Wrap entire pillar tile in a single <button> rather than restructuring; visual chrome stays byte-for-byte identical."
metrics:
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 2
  duration: ~10 min
  completed: 2026-05-09
---

# Quick 260509-ody: Pillar Clickable Modal with Marker Breakdown — Summary

Made each of the five pillars in Section 11's `PillarsDisplay` clickable so they open a section-local modal that lists the markers contributing to that pillar's score, grouped by tier (poor → cautious → normal → great → elite, then Pending).

## What Changed

### New: `src/components/report/PillarsDisplayModal.tsx`

Section-local modal wrapping the shared `Dialog` primitive (`mode="auto"`).

- Header: pillar name + close button (`data-autofocus`, gold focus ring).
- Score row: large mono score (or em-dash when pending) + status badge using `TRAFFIC_LIGHT` colours.
- Blurb: pulled from `PILLARS.find(...)?.blurb`, falls back to `pillar.blurb`.
- Markers: filtered via `markerToPillar(m).pillar === pillar.key` (includes both primary and supporting — informational view), grouped into 6 buckets (`poor`, `cautious`, `normal`, `great`, `elite`, `pending`), rendered in that fixed order with empty groups omitted.
- Each row: label (left), value+unit (or "No data"), tier pill using `TIER_COLORS[tier]` + `TIER_LABELS[tier]` (or neutral grey "Pending" pill).
- Empty state: "No markers classified into this pillar."
- Does NOT add its own ESC handler, focus trap, or backdrop — Dialog already provides them.

### Modified: `src/components/report/PillarsDisplay.tsx`

- Added `useState`, `PillarKey` type, `ReportMarker` type, and `PillarsDisplayModal` imports.
- New optional prop: `markers?: ReportMarker[]` — degrades gracefully to `[]` so the component still renders if a caller forgets to pass it.
- Holds `const [selectedKey, setSelectedKey] = useState<PillarKey | null>(null)`.
- Each `<Pillar>` now receives an `onSelect` callback.
- The outer `<article>` wrapper inside `Pillar` is now a `<button type="button">` with:
  - `onClick={onSelect}`
  - `aria-label={`Open ${pillar.label} pillar details`}`
  - Gold focus ring on `:focus-visible`
  - Subtle `hover:-translate-y-0.5 motion-safe:transition-transform`
  - `rounded-[36px]` so the focus ring matches the capsule shape
- All inner JSX (channel label, glow halo, capsule, HUD corner brackets, tick scale, score readout, status row, name, fraction) is byte-for-byte unchanged.
- Below the pillar grid, `<PillarsDisplayModal open onClose pillar markers={markers ?? []} />` renders conditionally on `selected` truthiness.

### Modified: `src/components/sections/Section11.tsx`

One-line change at the call site:

```diff
-<PillarsDisplay pillars={pillars} />
+<PillarsDisplay pillars={pillars} markers={markers} />
```

The `markers` state variable was already in scope.

## Verification (automated)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` — no new errors in touched files | PASS (only pre-existing test-file errors unrelated to this plan) |
| `import Dialog from '@/components/ui/Dialog'` in modal | 1 |
| `markerToPillar` referenced in modal | 3 (import + filter + grouping path) |
| `data-autofocus` in modal | 1 (Close button) |
| `<PillarsDisplay pillars={pillars} markers={markers} />` in Section11 | 1 |
| `PillarsDisplayModal` referenced in PillarsDisplay | 2 (import + render) |
| `useState` referenced in PillarsDisplay | 2 (import + call) |
| `type="button"` and `onClick={onSelect}` in PillarsDisplay | both present |
| `aria-label={`Open ` in PillarsDisplay | 1 |
| `CornerBrackets` still present | 1 (rendering visual chrome) |
| `tabular-nums` still present | 4 (mono readouts/tick scale/fraction preserved) |

## Outstanding

Task 3 (`checkpoint:human-verify`) is intentionally not executed — the orchestrator/human will perform the visual + interaction walk-through described in the plan (5 pillars, hover lift, focus ring, ESC/backdrop/× close, tier groupings, mobile bottom-sheet vs centred dialog).

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `a72089d` feat(quick-260509-ody): add PillarsDisplayModal component
- `facf227` feat(quick-260509-ody): make pillars clickable, render detail modal

## Self-Check: PASSED

- `src/components/report/PillarsDisplayModal.tsx` — exists
- `src/components/report/PillarsDisplay.tsx` — modified (button wrapper + state + modal render)
- `src/components/sections/Section11.tsx` — modified (markers prop)
- Commits `a72089d` and `facf227` exist in `git log`
