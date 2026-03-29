# Phase 1: Clinical Accuracy & Report Quality - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 01-clinical-accuracy-report-quality
**Areas discussed:** Range bar design, Recommendation depth, Referral flag levels, Gender handling
**Mode:** Auto (all areas auto-selected, recommended options chosen)

---

## Range Bar Design

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal segmented bar | Lab report style, 5 color-coded tier segments with value needle | ✓ |
| Radial gauge | Semicircular arc chart via Recharts RadialBarChart | |
| Minimal indicator | Simple dot/line on a thin bar | |

**User's choice:** [auto] Horizontal segmented bar (recommended default)
**Notes:** Matches clinical lab report convention. Recharts available but pure CSS/SVG may render better in PDF.

---

## Recommendation Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Specific with disclaimer | Supplement names, dosage ranges, lifestyle suggestions, clearly marked as guidance | ✓ |
| Generic guidance | "Consider supplementation" without specifics | |
| Evidence-cited | Full citations to clinical studies | |

**User's choice:** [auto] Specific with disclaimer (recommended default)
**Notes:** Coaches need actionable detail. Disclaimer protects against medical advice liability.

---

## Referral Flag Levels

| Option | Description | Selected |
|--------|-------------|----------|
| Two levels (Monitor + Urgent) | Amber "Monitor" for borderline, Red "Urgent Referral" for critical | ✓ |
| Single level | One "Refer to GP" flag for all out-of-range | |

**User's choice:** [auto] Two levels (recommended default)
**Notes:** Graduated severity gives coaches better triage guidance.

---

## Gender Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Biological Sex with note | "Biological Sex" label, male/female, UI note about reference data basis | ✓ |
| Gender label | Use "Gender" label, same male/female options | |
| Sex with non-binary option | Add third option that falls back to unisex ranges | |

**User's choice:** [auto] Biological Sex with clinical note (recommended default)
**Notes:** Clinical accuracy requires biological sex. Null/empty falls back to unisex ranges.

---

## Claude's Discretion

- Recharts vs pure CSS/SVG for range bars (optimize for PDF rendering)
- Exact disclaimer wording
- Specific blood marker list for gender split (follow WHO/pathology standards)
- Range bar layout positioning in Section 11

## Deferred Ideas

- Admin panel (Phase 3)
- Client portal (Phase 2/4)
