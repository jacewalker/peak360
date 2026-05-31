---
number: 002
title: Portal - marker management, auth, dashboard & data capture
status: pending
area: portal
priority: med
created: 2026-05-31
source: capture
---

# TODO-002: Portal - marker management, auth, dashboard & data capture

Feature and UX work for the coach/client portal (not bugs - see TODO-003 for the
Section 8/9/10/11 data-flow bugs). Captured from a review session.

## Context
- Marker admin: `src/app/portal/admin/markers/`, `src/lib/markers/`.
- Auth: better-auth (`src/lib/auth.ts`); "remove passwords" = passwordless (magic link / OTP) - needs a decision on method.
- Dashboard: `src/app/portal/page.tsx`; report is Section 11 (`/portal/assessment/[id]/report`).
- Body comp (Evolt 360) is Section 6; strength is Section 8.

## Acceptance
- [ ] Passwordless auth - remove password login (decide: magic link vs OTP)
- [ ] Ability to **Edit** a Marker and **Delete** a Marker (admin markers UI)
- [ ] Edit Marker screen: add a "Formula" field to run a mathematical equation + a final unit (e.g. Newtons -> kg = value x 9, e.g. for IMTP)
- [ ] Dashboard: large "Your results are available - click here" banner linking straight to the Section 11 report
- [ ] Evolt 360 Body Scan segmental analysis: capture additional left/right arm, left/right leg, torso, and ab circumference
- [ ] Add CMJ (Left) and (Right) inputs
