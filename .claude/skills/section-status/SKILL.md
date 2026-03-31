---
name: section-status
description: Show completeness checklist of all 11 sections (components, types, normative data, AI mappings)
---

# Section Status

Audit all 11 assessment sections for completeness across the integration points.

## What to check

Read these files and cross-reference:

1. **`src/components/sections/`** — Which section components exist (Section1.tsx through Section11.tsx)
2. **`src/types/assessment.ts`** — Which section interfaces are defined and what fields they contain
3. **`src/lib/normative/data.ts`** — Which fields have normative thresholds defined
4. **`src/components/sections/Section11.tsx`** — Which fields are in REPORT_MARKERS
5. **`src/lib/ai/field-mappings.ts`** — Which fields have AI extraction aliases
6. **`src/lib/normative/insights.ts`** — Which testKeys have insight templates

## Output

Present a table for each data-collecting section (5-10):

```
## Section 5: Blood Tests & Biomarkers

| Field (dataKey)    | In Interface | In Component | Normative Data | Report Marker | AI Mappings | Insight |
|--------------------|:---:|:---:|:---:|:---:|:---:|:---:|
| cholesterolTotal   | yes | yes | yes | yes | yes | yes |
| ldlCholesterol     | yes | yes | yes | yes | yes | yes |
| newField           | yes | yes | NO  | NO  | NO  | NO  |
```

Highlight any field that has:
- A component field but no TypeScript interface entry
- A normative data entry but no report marker
- A report marker but no normative data (and hasNorms: true)
- No AI field mappings (for sections 5 and 6 which support AI extraction)
- No insight template for a marker that has norms

## Summary

At the end, provide:
- Total fields per section
- Fields with complete coverage (all checkmarks)
- Fields missing one or more integration points
- Sections 1-4 and 11: just confirm the component exists (these don't have normative data)
