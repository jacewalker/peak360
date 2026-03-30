---
created: 2026-03-29T05:54:06.248Z
title: Report marker range visualization and recommendations
area: ui
files:
  - src/components/sections/Section11.tsx
  - src/lib/normative/insights.ts
  - src/lib/normative/data.ts
---

## Problem

The Section 11 report currently shows each blood/vitamin/metal marker with its value and a tier badge (poor → elite), but doesn't visually show where the reading sits within the normal range. There is also no actionable guidance — if a marker is outside normal range, the report doesn't suggest supplementation, lifestyle changes, or when to refer on to a specialist.

Coaches need at-a-glance range context and practical next steps to discuss with clients.

## Solution

- Add a visual range bar/gauge next to each marker reading in Section 11 showing the value's position within the 5-tier range (poor ← → elite), similar to a lab report reference range bar
- Extend the insights system (`src/lib/normative/insights.ts`) to include:
  - Supplementation recommendations for markers in poor/cautious tiers (e.g., "Consider Vitamin D3 supplementation 2000-4000 IU/day")
  - Referral flags for markers that are critically out of range (e.g., "Refer to GP for further investigation")
  - Lifestyle/dietary suggestions for markers in the cautious tier
- Ensure recommendations are evidence-based and clearly marked as guidance, not medical advice
- Include a disclaimer on the report regarding supplementation recommendations
