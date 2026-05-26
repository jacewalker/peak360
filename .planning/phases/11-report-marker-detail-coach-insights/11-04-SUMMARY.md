---
phase: 11-report-marker-detail-coach-insights
plan: 04
subsystem: ui
tags: [report, modal, master-detail, coach-insights, dark-portal, accessibility]

requires:
  - phase: 11-01
    provides: MarkerContent type + live marker_content data
  - phase: 11-02
    provides: GET /api/marker-content (client-readable, any role)
provides:
  - interactive pillar-modal marker rows -> detail panel (Definition + Impact + tier+gender Coach Insight)
  - D-06 fallback to generatePeak360Insights labelled "Auto-generated"
  - desktop two-pane master/detail + mobile drill-in
  - marker-content map + client gender threaded Section11 -> PillarsDisplay -> PillarsDisplayModal
affects: []

tech-stack:
  added: []
  patterns:
    - "Master/detail modal: role=listbox of role=option marker buttons + in-file MarkerDetailPanel sub-component"
    - "Render-time selection reset (no setState-in-effect) for selectedMarker"

key-files:
  created: []
  modified:
    - src/components/sections/Section11.tsx
    - src/components/report/PillarsDisplay.tsx
    - src/components/report/PillarsDisplayModal.tsx

key-decisions:
  - "Web report only — NO PDF / @react-pdf changes (D-12); diff is exactly the 3 component files"
  - "Coach-insight resolution: authored coachInsights[tier][gender] first, else fall back to generatePeak360Insights (markerKey===testKey) with the 'Auto-generated · no coach insight authored yet' note (D-06)"
  - "Definition/Impact blocks omitted when blank (no fallback per D-06); content rendered as escaped React text (T-11-12)"

patterns-established:
  - "Two-pane grid md:grid-cols-[minmax(280px,38%)_1fr]; mobile single-column drill-in with back control; focus trap / ESC / backdrop / hero / score bar / tier grouping / pillar insights preserved"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-12, D-13, D-14]

duration: ~5min
completed: 2026-05-26
---

# Phase 11 Plan 04: Interactive marker detail panel — Summary

**Clients can now click any marker inside a pillar modal and read what it is, how it affects them, and a coach insight matched to their tier AND gender — desktop two-pane, mobile drill-in — backed by the marker_content store, with no PDF changes.**

## Performance

- **Tasks:** 3 (2 auto + 1 browser-verify checkpoint)
- **Completed:** 2026-05-26
- **Files modified:** 3

## Accomplishments
- **Section11** fetches `/api/marker-content` in `loadReport()`, builds `Map<testKey, MarkerContent>`, and threads it + `gender` (from `info.clientGender`) into `PillarsDisplay`.
- **PillarsDisplay** threads `markerContentMap` + `gender` into `PillarsDisplayModal`.
- **PillarsDisplayModal** is now a master/detail container: a `max-w-[980px]` shell with a `md:grid-cols-[minmax(280px,38%)_1fr]` two-pane grid; marker rows are `role="option"` buttons (`aria-selected`); a `MarkerDetailPanel` renders header + tier pill, "What it is", "How it affects you", and a gold-railed Coach Insight card with a "[Male|Female] · [Tier]" badge or the D-06 auto fallback note. Mobile collapses to a single-column drill-in with a "← {pillar.label}" back control.
- Preserved: focus trap, ESC/backdrop close, body-scroll lock, hero, score breakdown bar, tier grouping, pillar-level "Insights & recommendations" block.

## Task Commits

1. **Task 1: Fetch marker content in Section11 + thread map+gender** — `5a48259` (feat)
2. **Task 2: Two-pane master/detail modal + MarkerDetailPanel + D-06 fallback** — `2ee3408` (feat)
3. **Task 3: Browser round-trip verification** — checkpoint (no code commit). Driven via Playwright by the orchestrator.

## Files Modified
- `src/components/sections/Section11.tsx` — marker-content fetch + map + gender thread-through.
- `src/components/report/PillarsDisplay.tsx` — props extended, thread-through.
- `src/components/report/PillarsDisplayModal.tsx` — master/detail + MarkerDetailPanel + resolution/fallback.

## Checkpoint Verification (Playwright, live report — Robert Holland, male, completed)
- Pillar modal (Cardiometabolic) renders two-pane: marker listbox left, "Select a marker" empty-state right. ✓
- Clicking Total Testosterone (Attention) → detail shows header + 17.9 ng/dL + Attention pill, seeded Definition, seeded Impact, and a Coach Insight card badged **"Male · Attention"** with the authored male/Attention text (tier+gender match). ✓ (D-03/D-05)
- Mobile (390px): tapping a marker drills into a full-width detail with a "← Cardiometabolic" back control; back returns to the list. ✓ (D-02)
- ESC closes the modal; pillar-level "Insights & recommendations" block preserved; 0 console errors. ✓
- D-12: `git diff` for 11-04 contains only the 3 component files — no `src/lib/pdf/*` or `Peak360Report` changes. ✓

### Code-verified (not interactively triggerable with current data)
- Female-specific insight selection — no female *completed* assessment exists in the dev DB; the resolver normalizes gender and indexes `coachInsights[tier].female` (female content confirmed present in the admin editor during 11-03).
- D-06 "Auto-generated · no coach insight authored yet" fallback — all 97 markers are seeded, so the authored path always wins at runtime; the fallback branch + label string are present in code.

## Deviations
- Two lint-driven fixes during build (no behavior change): render-time selection reset instead of setState-in-effect; the marker list is a `role="listbox"` of `role="option"` buttons (preserving `aria-selected`) to satisfy the a11y rule.

## Self-Check: PASSED
- `npx tsc --noEmit` clean for all three files; eslint clean on the report components.
- Live browser round-trip verified (see above).
