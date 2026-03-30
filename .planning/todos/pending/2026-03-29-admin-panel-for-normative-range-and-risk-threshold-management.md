---
created: 2026-03-29T05:56:00.000Z
title: Admin panel for normative range and risk threshold management
area: admin
files:
  - src/lib/normative/data.ts
  - src/lib/db/schema.ts
---

## Problem

All normative ranges (blood markers, fitness tests, body composition) and risk/concern thresholds are currently hardcoded in `src/lib/normative/data.ts`. To adjust a range or add a new marker, a developer must edit code and redeploy. Coaches and administrators need the ability to:

- View and edit the 5-tier normative ranges (poor → elite) for every marker
- Weight certain markers as "red flag" indicators that trigger stronger warnings in the report
- Set risk/concern thresholds for all assessment questions (readiness scores, medical screening flags, etc.)
- Persist these settings long-term so they survive deployments

## Solution

- Create an `/admin` route with a management UI for normative thresholds
- Move normative data from hardcoded TypeScript to database-backed configuration (new `normative_ranges` table)
- Admin UI should allow:
  - Browsing all markers grouped by category (blood, body comp, cardio, strength, mobility, balance)
  - Editing min/max values for each tier per marker
  - Flagging markers as "red flag" with configurable weight/severity
  - Setting risk thresholds for readiness and medical screening questions
  - Preview of how changes affect a sample reading
- Fall back to hardcoded defaults if no DB overrides exist (graceful migration)
- Protect admin routes behind authentication
