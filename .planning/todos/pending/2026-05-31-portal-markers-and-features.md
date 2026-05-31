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
Section 8/9/10/11 data-flow bugs). Captured from a review session and refined
against the 2026-05-31 meeting transcript.

## Context
- Marker admin: `src/app/portal/admin/markers/`, `src/lib/markers/`.
- Auth: better-auth (`src/lib/auth.ts`); "remove passwords" = passwordless (magic link / OTP) - needs a decision on method.
- Dashboard: `src/app/portal/page.tsx`; report is Section 11 (`/portal/assessment/[id]/report`).
- Body comp (Evolt 360) is Section 6; strength is Section 8.
- PDF: `src/lib/pdf/`. AI extraction pipeline: `src/app/api/ai/extract/route.ts`, `src/lib/ai/`.

## Acceptance
- [ ] Passwordless auth - remove password login (decide: magic link vs OTP)
- [ ] Ability to **Edit** a Marker and **Delete** a Marker (admin markers UI)
- [ ] Edit Marker screen: add a "Formula" field to run a mathematical equation + a final unit.
  - **We build the formula SYSTEM; the coaches (Kevin/Jack) author the actual formulas.** Our job is to make the formula engine + UI exist and work for them.
  - Applies to markers measured in Newtons: **IMTP Max Force** and **Overhead Shoulder Press ISO**. CMJ does **not** need a conversion.
  - Conversion is Newtons -> kg, divisor **9.8** (not 9 - corrected in meeting).
  - Display **both** the raw input (Newtons) and the calculated output (kg) to the coach, not a silent conversion.
- [ ] Dashboard: large "Your results are available - click here" banner linking straight to the Section 11 report. **Remove/push down the existing dashboard stat boxes** so the banner is the dominant element when results are ready (not just added alongside).
- [ ] Evolt 360 Body Scan segmental analysis - capture + display:
  - [ ] Capture additional segmental fields: left/right arm, left/right leg, torso, and ab circumference
  - [ ] Add a **dedicated segmental analysis page to the exported PDF**: full-page body silhouette/diagram (stock image OK) with each segment's value annotated and arrows pointing to the relevant body region; lean mass + fat mass numbers shown on this dedicated page alongside the diagram
  - [ ] Update the **AI extraction pipeline** to receive, interpret, and store the new segmental fields from the Evolt 360 report
  - Note: NEW body-comp summary fields (BMR / TEE / Total Body Water) discussed in the meeting are **NOT required** (explicitly descoped by Jace).
- [ ] CMJ input change: capture CMJ as a **single measurement** (one jump height + one Modified RSI), NOT separate Left/Right inputs (see TODO-003 for the display/data-flow side).
