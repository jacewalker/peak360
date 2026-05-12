---
phase: 260512-ru4
plan: 01
type: quick
subsystem: layout
tags: [brand, logo, layout, sidebar, header]
requirements: [RU4-01]
dependency-graph:
  requires:
    - public/landing/peak360-logo.png (1230×367, ~3.35:1)
  provides:
    - Unified landing-brand mark across portal Sidebar and legacy assessment Header
  affects:
    - src/components/layout/Sidebar.tsx
    - src/components/layout/Header.tsx
tech-stack:
  added: []
  patterns:
    - next/image src + width/height tuned to source asset aspect ratio
key-files:
  created: []
  modified:
    - src/components/layout/Sidebar.tsx
    - src/components/layout/Header.tsx
decisions:
  - Sized new mark by preserving each surface's prior rendered height (28 px in sidebar, 32 px in header) and computing width from the new ~3.35:1 aspect ratio (width = round(height × 3.35)). Heights stayed identical so vertical rhythm in the sidebar header block and the h-14 header bar is unchanged.
metrics:
  duration: ~3m
  tasks_completed: 2 of 3 (Task 3 is checkpoint:human-verify — pending visual confirmation)
  files_modified: 2
  completed_date: 2026-05-12
---

# Quick Task 260512-ru4: Swap Portal Logo to Landing Brand Mark Summary

Swapped the portal `Sidebar` and the legacy assessment `Header` from the old square-ish `/logo.png` (1024×683, ≈1.5:1) to the wider landing wordmark `/landing/peak360-logo.png` (1230×367, ≈3.35:1), tuning `width`/`height` props so the new asset renders at the same rendered height on each surface without distortion.

## What Changed

### Sidebar (`src/components/layout/Sidebar.tsx`)
- `src="/logo.png"` → `src="/landing/peak360-logo.png"`
- `width={40}` → `width={94}` (height 28 unchanged → 28 × 3.35 ≈ 94)
- All other markup, classNames, the wrapping `<Link href="/portal">`, the `MonoEyebrow` "PEAK360 / PORTAL", the `<h1>PEAK<span>360</span></h1>` wordmark, the "Longevity" caption, the `px-5 pt-6 pb-8` wrapper padding, and the `flex items-center gap-3 group` Link layout are byte-identical.
- **Commit:** `fb0d403` — `fix(260512-ru4): swap Sidebar logo to landing brand mark`

### Header (`src/components/layout/Header.tsx`)
- `src="/logo.png"` → `src="/landing/peak360-logo.png"`
- `width={48}` → `width={107}` (height 32 unchanged → 32 × 3.35 ≈ 107)
- All other markup, classNames, the `<header className="bg-bg-2 border-b border-line text-text h-14">` shell, the `max-w-6xl` container, the wordmark, the CLIENT eyebrow conditional, and the logout button are byte-identical.
- **Commit:** `be64239` — `fix(260512-ru4): swap Header logo to landing brand mark`

## Verification

### Automated greps (passed)
- `grep -R '"/logo.png"' src/components/layout/` → no matches (old asset path fully removed from layout components).
- `grep -R 'landing/peak360-logo.png' src/components/layout/` → exactly 2 matches (Sidebar.tsx, Header.tsx).
- Per-task greps from the plan returned `OK` for both Task 1 and Task 2.

### Task-level done criteria
- **Task 1 (Sidebar):** `/landing/peak360-logo.png` referenced at `width={94} height={28}`; `/logo.png` removed; surrounding markup unchanged.
- **Task 2 (Header):** `/landing/peak360-logo.png` referenced at `width={107} height={32}`; `/logo.png` removed; surrounding markup unchanged.

### Task 3: Visual verification (PENDING)
Task 3 is a `checkpoint:human-verify` step. Per the orchestrator's constraints, this SUMMARY does not block on it. The user/orchestrator should still perform the documented checks before closing out:

1. `npm run dev` → open `/portal` (or any portal route, e.g. `/portal/clients`). Confirm the sidebar top-left shows the wide landing brand mark to the left of the "PEAK360 / Longevity" wordmark, with `gap-3` spacing and no horizontal/vertical distortion.
2. Open any in-progress assessment URL that renders the legacy `Header` (e.g. `/assessment/{id}/section/1`). Confirm the top-left of the `h-14` header bar shows the same wide mark, crisp and aligned with the wordmark and logout button.
3. Confirm the rendered mark is crisp at both sizes (no upscaling blur — the asset is 1230 px wide so this should be comfortable headroom).
4. Confirm no `next/image` console warnings about `/landing/peak360-logo.png`.

If any surface looks squished, re-tune width using `width = round(rendered_height × actual_aspect)` where `actual_aspect` comes from the decoded image dimensions, not the assumed 3.35.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 auto-fixes were required; the plan's interface block already specified exact prop deltas, the new asset exists at the documented path with the documented dimensions, and both files matched the expected pre-edit shape at the documented line ranges.

## Known Stubs

None.

## Self-Check: PASSED

- File `src/components/layout/Sidebar.tsx` — `grep` confirms `src="/landing/peak360-logo.png"` and `width={94}` present; no `"/logo.png"` references remain.
- File `src/components/layout/Header.tsx` — `grep` confirms `src="/landing/peak360-logo.png"` and `width={107}` present; no `"/logo.png"` references remain.
- Commit `fb0d403` — `git log --oneline` confirms `fix(260512-ru4): swap Sidebar logo to landing brand mark`.
- Commit `be64239` — `git log --oneline` confirms `fix(260512-ru4): swap Header logo to landing brand mark`.
- Final verification grep across `src/components/layout/` returns exactly 2 references to the new asset and zero references to the old asset.
