---
name: test-ratings
description: Validate normative rating thresholds for gaps, overlaps, and completeness
argument-hint: [testKey]
---

# Test Ratings

Validate the normative rating data in `src/lib/normative/data.ts` to catch errors in tier definitions.

## What to validate

If `$ARGUMENTS` specifies a testKey, validate only that marker. Otherwise, validate ALL markers.

Read `src/lib/normative/data.ts` and `src/types/normative.ts`, then check every marker for:

### 1. All 5 tiers present
Every marker (or every gender/age bucket within a marker) must have exactly these tiers: `poor`, `cautious`, `normal`, `great`, `elite`.

### 2. No gaps between tiers
Each tier's `max` should connect to the next tier's `min` without gaps. The tiers should be ordered from worst to best values. For markers where lower is better (e.g., cholesterol, body fat), poor has the highest values. For markers where higher is better (e.g., grip strength, VO2max), poor has the lowest values.

Check that the ranges form a continuous spectrum with no unreachable values between tiers.

### 3. No overlapping ranges
No value should fall into more than one tier. Check that `max` of one tier does not exceed `min` of the adjacent tier (allowing for equal boundaries at transition points).

### 4. Valid min/max within each tier
- `min` must be less than or equal to `max` for every tier
- No negative values unless the marker legitimately allows them

### 5. Reasonable boundary values
Flag any suspiciously extreme values (e.g., a max of 999 or 9999) — these might be placeholders.

### 6. Unit consistency
Check that `unit` is defined for every marker (unless it's a count or ratio).

### 7. Gender/age bucket completeness
For gendered markers: both `male` and `female` must be present.
For age-bucketed markers: all expected age groups must be present and consistent between genders.

## Output

Present results as a table:

```
| Marker | Issue | Details |
|--------|-------|---------|
| hdl | GAP | Gap between cautious.max (39) and normal.min (41) |
| vo2max.male.26-35 | MISSING_TIER | Missing 'elite' tier |
```

If all markers pass, confirm: "All N markers validated successfully. No issues found."

Also report summary stats:
- Total markers checked
- Markers by type (simple/gendered/gendered-age)
- Markers by category
