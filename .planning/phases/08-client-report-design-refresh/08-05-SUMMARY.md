---
phase: 08-client-report-design-refresh
plan: 05
subsystem: pdf-mirror
tags: [pdf, react-pdf, pillars, mirror, ssr]
dependency-graph:
  requires:
    - "08-01 (pillar DB schema + queries)"
    - "08-02 (PillarStatus / TRAFFIC_LIGHT_HEX SSOT / score formula)"
    - "08-03 (portal-side ReportShell — visual mirror target)"
  provides:
    - "ReportData fields: definitions, pageCopy, prescriptions"
    - "loadReportData fetches pillar layer alongside markers"
    - "PillarsPage react-pdf component (single A4, 3-2 grid)"
    - "Peak360Report renders pillars page first; existing blocks unchanged"
  affects:
    - "Every PDF download for any assessment now starts with the pillars page"
tech-stack:
  added: []
  patterns:
    - "Sibling <Page> insertion at the <Document> root for clean page boundaries"
    - "Per-card prescription summary truncation (~140 chars) to keep page on a single A4 sheet"
    - "Single-source-of-truth import for traffic-light hex (no inline duplicates)"
key-files:
  created:
    - "src/lib/pdf/components/PillarsPage.tsx"
  modified:
    - "src/lib/pdf/types.ts"
    - "src/lib/pdf/Peak360Report.tsx"
    - "src/lib/report/load-report-data.ts"
decisions:
  - "Rendered PillarsPage as a sibling <Page> at the <Document> root rather than inlining inside the existing <Page>. The existing Page is untouched (D-27); the pillars page becomes a clean first sheet that satisfies D-26's 'single A4 page'."
  - "Truncated prescription summary to 140 characters (Pitfall A5 mitigation)."
  - "Used COLORS.textPrimary in place of the planning sketch's COLORS.text (palette token doesn't exist)."
  - "Used COLORS.border as the dashed-pending border tone instead of inlining '#e2e8f0' (the same hex value, but routed through the existing palette token to keep zero inline hex in PillarsPage.tsx)."
metrics:
  duration: "2m 43s"
  completed: 2026-05-09T03:24:20Z
  tasks: 4
  files: 4
---

# Phase 08 Plan 05: PDF Mirror — Five-Pillar Static Page Summary

**One-liner:** Mirrored the portal's Peak Living module into the PDF as a static A4 page (3-2 grid of 5 pillar cards with status badges and optional Recommended next steps blocks) inserted ahead of the existing PDF blocks, sourced from the shared `loadReportData` so PDF and portal scores stay identical.

## What Shipped

1. **`src/lib/pdf/types.ts`** — `ReportData` extended with `definitions: PillarDefinition[]`, `pageCopy: PillarPageCopy | null`, `prescriptions: PillarPrescription[]`. Existing fields untouched.
2. **`src/lib/report/load-report-data.ts`** — `loadReportData(assessmentId)` now runs a parallel `Promise.all` for `getPillarDefinitions()`, `getPillarPageCopy()`, `getPillarPrescriptions(assessmentId)` after the existing markers/insights computation, and returns the three new fields. Existing marker logic untouched (D-21 SSR, Pitfall #8 fix).
3. **`src/lib/pdf/components/PillarsPage.tsx`** (new, 206 lines) — react-pdf `<Page size="A4">` containing a heading, optional intro paragraph, a 3-2 grid of 5 pillar cards in `sortOrder`, and a footnote pointing back to the portal. Each card renders the pillar label, score (or em dash), traffic-light status badge, `shortSummary`, and an optional "Recommended next steps" block (rendered only when a non-empty prescription summary exists). Traffic-light hex/text/label come exclusively from `@/lib/pdf/colors` re-exports of the D-28 SSOT in `@/lib/pillars/colors`.
4. **`src/lib/pdf/Peak360Report.tsx`** — Imports `PillarsPage` and renders it as a sibling `<Page>` at the top of the `<Document>`, ahead of the existing `<Page>` (which still contains TierSummary, MarkerTable, InsightsSection, etc., in their original order — D-27).

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend ReportData with definitions, pageCopy, prescriptions | `edd78ac` | `src/lib/pdf/types.ts` |
| 2 | Extend loadReportData to fetch pillar data alongside markers | `143b46b` | `src/lib/report/load-report-data.ts` |
| 3 | Build PillarsPage react-pdf component | `62a0094` | `src/lib/pdf/components/PillarsPage.tsx` |
| 4 | Insert PillarsPage into Peak360Report orchestrator | `829a3d4` | `src/lib/pdf/Peak360Report.tsx` |

## Verification

- `OK_FILES`: all 4 target files in place.
- `OK_ORDER`: `<PillarsPage>` source-line precedes `<TierSummary>` in `Peak360Report.tsx` (line 25 vs line 74).
- `OK_SSOT_PDF`: `grep -c "'#10b981'\|'#f59e0b'\|'#ef4444'" src/lib/pdf/components/PillarsPage.tsx` returns 0 — no inline traffic-light hex (D-28).
- `npx tsc --noEmit` produces zero errors in any of the four touched files (`PillarsPage.tsx`, `Peak360Report.tsx`, `load-report-data.ts`, `types.ts`).

### Smoke Test (manual — recommended next session)

The plan's smoke test is a manual step: boot `npm run dev`, hit `/api/assessments/{id}/pdf` for a real assessment id, save the response and open the PDF. The first page should be "The Peak Living Pillars" (or the admin-edited heading) with five cards in a 3+2 layout; the existing TierSummary/MarkerTable/InsightsSection blocks follow on subsequent pages. Vitest cannot easily render react-pdf to a buffer in this codebase without spinning up Next, so the smoke test is documented rather than gated automatically (matches the plan's `<verification>` notes).

PDF file size measurement (`wc -c` on the response) and portal-vs-PDF score parity check are both blocked behind the manual smoke test and should be confirmed during the next interactive session before this plan's deliverables ship to production. Vector composition only (no rasters added) so the PDF-08 size budget (<500KB from Phase 5) should hold; the new page contributes only react-pdf vector nodes.

## Pillar Score Parity (Pitfall #8 Status)

Both the portal Peak Living module (Plan 03) and this PDF page consume `computeAllPillarScores(markers)` from `@/lib/pillars/mapping`. The `markers` array reaches both surfaces via the same `loadReportData(assessmentId)` loader (Plan 03 + this Plan). Portal-vs-PDF score parity is therefore enforced by source sharing, not duplicated logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] PDF token name correction**

- **Found during:** Task 3
- **Issue:** Plan sketch referenced `COLORS.text` for the recommended-steps body copy. The actual `src/lib/pdf/colors.ts` exports `textPrimary` (not `text`).
- **Fix:** Used `COLORS.textPrimary` in the recommended-steps body copy. Plan flagged this as an executor adaptation in Task 3's `<action>` block.
- **Files modified:** `src/lib/pdf/components/PillarsPage.tsx`
- **Commit:** `62a0094`

**2. [Rule 1 — SSOT enforcement] Routed dashed-border colour through palette token**

- **Found during:** Task 3
- **Issue:** Plan sketch inlined `'#e2e8f0'` for the dashed pending-state border. While not a traffic-light hex (so it didn't fail the SSOT grep), it's still an inline hex that drifts away from `COLORS.border` (which is the same value).
- **Fix:** Replaced with `COLORS.border` so future palette changes flow through. Functionally identical pixel output.
- **Files modified:** `src/lib/pdf/components/PillarsPage.tsx`
- **Commit:** `62a0094`

### Architectural Adaptations (within plan tolerance)

**1. Rendered PillarsPage as a sibling `<Page>` at the `<Document>` root**

The original `Peak360Report.tsx` orchestrator wraps every existing component (TierSummary, MarkerTable, InsightsSection, etc.) inside a single `<Page>`. The plan instructed inserting `<PillarsPage>` "BEFORE `<TierSummary>`". `PillarsPage` is itself a `<Page>` element (D-26 mandates a single dedicated A4 sheet for the pillars), so it cannot be a child of another `<Page>`. The cleanest way to satisfy both constraints is to place `<PillarsPage>` as a sibling `<Page>` at the `<Document>` root, ahead of the existing `<Page>`. This:

- Keeps the existing Page unchanged in shape and order (D-27 satisfied).
- Makes the pillars page a clean first sheet of the PDF (D-26 satisfied — single A4 page).
- Keeps "PillarsPage before TierSummary" true in source-order (gate `OK_ORDER` passes).

This adaptation is captured in the SSOT decisions list above. No deviation from intent — only an adaptation of the literal "before TierSummary" wording to fit react-pdf's element nesting rules.

## Auth Gates

None — the route gate (Phase 7 BL-05 ownership check) was already in place at `/api/assessments/{id}/pdf` and is unchanged by this plan.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The only new render path consumes already-gated server-side data.

## Known Stubs

None.

## Deferred Issues

The repo carries pre-existing TypeScript errors in `src/__tests__/**` (missing vitest globals, `Record<string, unknown>` cast issues in store tests, `getByAlt` vs `getByAltText` typo). These existed before Plan 08-05 and are outside the scope of this plan's files. They should be tracked separately if not already captured.

## Self-Check: PASSED

- All 4 target files present.
- All 4 task commits exist in `worktree-agent-a7d34ebdb24d8bf31` branch history.
- Order check (`OK_ORDER`) passes.
- SSOT check (`OK_SSOT_PDF`) passes.
- TypeScript compiles cleanly across all four touched files.
