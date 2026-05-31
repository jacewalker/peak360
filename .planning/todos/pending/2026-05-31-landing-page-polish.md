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
- Pricing source: pricing PDF shared in WhatsApp (need the file).
- Testimonials are an EXTERNAL dependency - Kevin to source 3.

## Acceptance
- [x] Section 1: increase font size of the smaller text (e.g. "Geelong" eyebrow) on **desktop only**, not mobile
- [x] "Live Sample" teaser: make the background solid and pop more
- [x] Section 3: add an image of a dummy/sample PDF report
- [x] Process page steps reworded:
  - [x] 01 Initial Consultation & Pre Medical Screening
  - [x] 02 Baseline Assessment (90 mins - 2 hrs)
  - [x] 03 Results Deep Dive and Action Plan (7 days)
  - [x] 04 Quarterly Review - add a "Recommended" label (decided; was "Available/Optional/Recommended" in discussion)
- [ ] Add pricing section to the website (from the WhatsApp pricing PDF) — BLOCKED on pricing PDF
- [ ] Add 3 testimonials (BLOCKED on Kevin providing them)
- [x] Apple "Save to Home Screen" icon currently shows a white "P" on black - replace with the logo (apple-touch-icon)
- [x] iMessage share-link preview image set to the black-background logo
- [x] Fix logo stretching on iPhone when viewing the landing page (aspect ratio)
- [x] "Schedule your baseline assessment" button links to a contact form that emails info@strongbodies.com.au
