---
status: partial
phase: 10-section-11-pdf-brand-language-alignment
source: [10-VERIFICATION.md]
started: 2026-05-17T00:33:00Z
updated: 2026-05-17T00:33:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Section 11 renders as a light card on the dark portal frame
expected: At `/portal/assessment/{id}/section/11`, the page shows the dark portal chrome (sidebar/header/MonoEyebrow "SECTION 11 / 11 · LONGEVITY ANALYSIS") and Section 11 itself appears as a single cream/white rounded card with a subtle shadow. Inside the card: logo on the LEFT, "Complete Longevity Analysis" title in navy ink on the RIGHT, gold-brand divider, then 4-column client meta strip in dim ink labels + ink values. Pillars, tier cards, marker rows, and insights all render normally below.
result: [pending]

### 2. Exported PDF gold accents match in-app Section 11 gold-brand
expected: Click "Export PDF" from Section 11. In the resulting PDF: (1) cover gold accent bar is dull gold-brand (#c9a24a) NOT bright orange (#F5A623); (2) all SectionHeading vertical bars throughout the PDF are dull gold-brand; (3) insight card left-edge stripes + bullet dots are dull gold-brand; (4) 5-tier marker palette (emerald/blue/gray/amber/red) renders identically to the in-app Section 11 tier pills; (5) medical-flag amber callout + referral-flag red callout unchanged (status palette sovereign).
result: [pending]

### 3. Browser-print (Cmd+P) of Section 11 renders without box-shadows
expected: Hit Cmd+P on `/portal/assessment/{id}/section/11`. The print preview should show the report content without box-shadows on the bg-paper card or inner cards.
result: [pending]

### 4. Action button row visual gutter on mobile viewport
expected: Resize to mobile width (<640px). The "Export PDF" and "Save & Complete Assessment" buttons should have visible horizontal breathing room from the card edge.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
