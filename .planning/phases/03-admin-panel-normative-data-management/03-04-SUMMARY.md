---
phase: 03-admin-panel-normative-data-management
plan: 04
subsystem: admin-ui
tags: [admin, normative, marker-editor, tier-validation, severity]
dependency_graph:
  requires: [03-01, 03-03]
  provides: [marker-range-editor, marker-crud-api, red-flags-api]
  affects: [normative-browse-page, assessment-reports]
tech_stack:
  added: []
  patterns: [dynamic-route-api, optimistic-locking, beforeunload-guard, tier-validation]
key_files:
  created:
    - src/app/api/admin/normative/[marker]/route.ts
    - src/app/api/admin/red-flags/route.ts
    - src/app/admin/normative/[marker]/page.tsx
  modified: []
decisions:
  - Tier validation enforces both min<max per tier and no gaps between adjacent tiers
  - Optimistic locking uses updatedAt timestamp comparison to prevent lost updates
  - Age-bucketed markers use composite variant keys (e.g., male_20-39) in the editor state
metrics:
  duration: 3m
  completed: 2026-03-30
---

# Phase 03 Plan 04: Marker Range Editor Summary

Marker range editor page with GET/PUT/DELETE API, 5-column tier grid, gender/age variant tabs, severity slider, and inline validation with optimistic locking.

## What Was Built

### API Endpoints (Task 1)
- **GET /api/admin/normative/[marker]**: Returns marker metadata, DB overrides, and hardcoded defaults for comparison. Resolves gender variants by comparing male/female standards against unisex.
- **PUT /api/admin/normative/[marker]**: Accepts array of variants with tiers, validates min<max and adjacent tier continuity, supports optimistic locking via updatedAt comparison (409 on conflict).
- **DELETE /api/admin/normative/[marker]**: Removes DB overrides for a marker (all variants or specific gender/ageGroup), reverting to hardcoded defaults.
- **GET /api/admin/red-flags**: Returns all markers with non-zero severity weights, joined with REPORT_MARKERS for labels.

### Marker Editor Page (Task 2)
- **5-column tier grid** with color-coded headers (Poor red, Cautious amber, Normal gray, Great blue, Elite green) and min/max number inputs per tier.
- **Gender variant tabs** (All/Male/Female) for gendered markers like hemoglobin, hematocrit.
- **Age group dropdown** for age-bucketed markers like body_fat_percent, vo2max, showing age ranges (20-39, 40-59, 60+).
- **Severity weight slider** (0-10) controlling red flag prominence in reports.
- **Inline validation** showing errors for min>=max and gaps between adjacent tiers, with red border highlighting on invalid inputs.
- **Save Changes** button (gold, disabled when clean or invalid) with optimistic locking and conflict detection (409 handling).
- **Reset to Defaults** button with confirmation dialog, deletes all DB overrides.
- **beforeunload guard** preventing accidental navigation with unsaved changes.
- **Responsive layout**: 5-column grid on desktop, stacked on mobile.
- **Loading skeleton** and error handling throughout.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data flows are fully wired to the API endpoints.

## Self-Check: PASSED
