---
number: 003
title: Strength & mobility data-flow fixes (Section 8/9 -> 10/11/PDF)
status: pending
area: portal
priority: high
created: 2026-05-31
source: capture
---

# TODO-003: Strength & mobility data-flow fixes (Section 8/9 -> 10/11/PDF)

Captured assessment fields that are entered but don't propagate to the Strength
Pillar (Section 10), the Section 11 report, or the exported PDF. Plus input
changes. These are correctness bugs - values are captured but lost downstream.

## Context
- Section 8 = Strength testing; Section 9 = Mobility; Section 10 = Balance & Power / Strength Pillar; Section 11 = report.
- Components: `src/components/sections/Section8.tsx`, `Section9.tsx`, `Section10.tsx`, `Section11.tsx`.
- Pillar mapping/report: `src/lib/pillars/`, `src/lib/report/load-report-data.ts`, `src/lib/report-markers.ts`.
- PDF: `src/lib/pdf/`.
- Likely root cause class: fields exist in the section form/types but are missing from REPORT_MARKERS / pillar mapping / PDF marker tables.

## Acceptance
### Section 8 (Strength)
- [ ] CMJ: Jump Height (cm) and Modified RSI display in the Section 10 Strength Pillar AND the exported PDF
- [ ] IMTP: display Left kg, Right kg, and Max Force Asymmetry (not just Max Force) in Section 10 and the exported PDF
- [ ] SL Jump (single leg): left / right / Modified RSI values display in Section 10 and the exported PDF
- [ ] Replace the existing inputs for input #5 "SL Balance Test" with the eyes-closed inputs (leave values empty for now)

### Section 9 (Mobility)
- [ ] FABER test: remove "Left Outcome" and "Right Outcome", keep distance-to-table; ensure distance-to-table shows in Section 11 and the exported PDF

### Cross-cutting
- [ ] Review to ensure ALL Strength items are showing in the Strength Pillar (audit Section 8 fields -> pillar -> report -> PDF end to end)
