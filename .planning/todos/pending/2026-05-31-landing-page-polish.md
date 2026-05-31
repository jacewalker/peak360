---
number: 001
title: Landing page polish & content updates
status: pending
area: landing-page
priority: med
created: 2026-05-31
source: capture
---

# TODO-001: Landing page polish & content updates

A batch of design, content, and platform-icon fixes for the Peak360 marketing
landing page (`src/app/_landing.tsx`, `src/app/layout.tsx`, `src/app/landing.css`,
`public/landing/`). Captured from a review session.

## Context
- Landing lives in `src/app/_landing.tsx` (client component) rendered by `src/app/page.tsx`.
- OG/metadata + icons live in `src/app/layout.tsx` (recently added; favicon currently `/landing/peak360-logo.png`).
- Logo assets: `public/landing/peak360-logo.png` (dark bg, 1230x367) and `peak360-logo-light.png`.
- Contact target email: **info@strongbodies.com.au**.
- Pricing source: "Peak360 Final Cut" deck (received 2026-05-31). Figures captured below.
- Testimonials are an EXTERNAL dependency - Kevin to source 3.

## Pricing (from the deck - use for the website pricing section)
**Testing package**
- **Baseline Package - $1,000** - all 5 pillars tested; 0-100 score benchmarked to age & gender; traffic-light dashboard + drill-down via personal web portal; personalised strategic action plan; exercise prescription; nutrition & supplement advice linked to biomarkers; allied-health referrals for flagged abnormalities.
- **Retest - $750** (1st retest within 12 months of initial test; save $250 vs baseline).
- **Retest - $500** (further retests within the same 12 months; save $500 vs baseline; best value).
- Recommendation: minimum 3 tests per year.
- **Core biomarker (blood) testing is booked & PAID SEPARATELY by the participant through iMedical** - from $138. Link: imedical.com.au/order/blood-tests/sport-hormone-private-blood-tests (not bundled into the $1,000).

**Coaching & nutrition (optional add-ons, stack with testing)**
- **Baseline Online - $100/month** - online training app, customised PT program, progressions/regressions every 8 weeks.
- **Fitness Coaching** - $80 (30 min) / $100 (45 min), delivered by a qualified Strong Bodies coach. All sessions include same-day recovery facilities (Finnish sauna, ice plunges, compression boots) + priority allied-health access.
- **Nutrition - $300** - customised 8-week nutrition plan tailored to biomarker data; supplements extra through Strong Bodies.

Note: the deck's public-facing scoring tiers read **Attention / Caution / Good / Great / Elite** (internal enum is poor/cautious/normal/great/elite) - keep website/report tier labels consistent with the deck if surfaced publicly.

## Acceptance
- [ ] Section 1: increase font size of the smaller text (e.g. "Geelong" eyebrow) on **desktop only**, not mobile
- [ ] "Live Sample" teaser: make the background solid and pop more
- [ ] Section 3: add an image of a dummy/sample PDF report
- [ ] Process page steps reworded:
  - [ ] 01 Initial Consultation & Pre Medical Screening
  - [ ] 02 Baseline Assessment (90 mins - 2 hrs)
  - [ ] 03 Results Deep Dive and Action Plan (7 days)
  - [ ] 04 Quarterly Review - add a "Recommended" label (decided; was "Available/Optional/Recommended" in discussion)
- [ ] Add pricing section to the website (from the WhatsApp pricing PDF)
- [ ] Add 3 testimonials (BLOCKED on Kevin providing them)
- [ ] Apple "Save to Home Screen" icon currently shows a white "P" on black - replace with the logo (apple-touch-icon)
- [ ] iMessage share-link preview image set to the black-background logo
- [ ] Fix logo stretching on iPhone when viewing the landing page (aspect ratio)
- [ ] "Schedule your baseline assessment" button links to a contact form that emails info@strongbodies.com.au
