---
created: 2026-03-29T05:54:06.248Z
title: Gender-based blood marker normative ranges
area: normative
files:
  - src/lib/normative/data.ts
  - src/lib/normative/ratings.ts
  - src/types/normative.ts
---

## Problem

Blood markers currently use a single set of normative ranges for all genders. Many biomarkers (e.g., hemoglobin, ferritin, testosterone, iron) have clinically significant differences between male and female healthy ranges. Using unisex ranges can produce inaccurate ratings — flagging normal female values as low or missing elevated male values.

The rating engine (`getPeak360Rating`) already accepts age-bucketed thresholds for some markers but does not yet support gender-specific thresholds.

## Solution

- Add gender-specific threshold entries in `src/lib/normative/data.ts` for markers where male/female ranges differ materially
- Update `getPeak360Rating` in `src/lib/normative/ratings.ts` to accept a `gender` parameter and select the appropriate threshold set
- Propagate gender from Section 1 client info (clientGender field) through to the rating calls in Section 11
- Reference clinical lab standards (e.g., WHO, pathology reference ranges) for male vs female cutoffs
