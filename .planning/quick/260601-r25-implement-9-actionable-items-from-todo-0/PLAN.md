---
quick_id: 260601-r25
title: Implement 9 actionable items from TODO-001 landing page polish
status: in-progress
created: 2026-06-01
area: landing-page
files:
  - src/app/_landing.tsx
  - src/app/layout.tsx
  - src/app/landing.css
  - src/app/api/contact/route.ts
  - public/landing/
---

# TODO-001 — Landing page polish (9 actionable items)

Source: `.planning/todos/pending/2026-05-31-landing-page-polish.md`.
Blocked item (3 testimonials, Kevin-sourced) is out of scope.

## Items

1. **Section 1 eyebrow font size (desktop only)** — bump `.hero .eyebrow` size via a
   `min-width` media query; mobile unchanged. (landing.css)
2. **Live Sample teaser: solid background + pop** — replace translucent gradient on
   `.teaser` with an opaque elevated panel + shadow. (landing.css)
3. **Section 3 sample report image** — drop the user-supplied report mockup
   (`public/landing/sample-report.png`) into the What-We-Test portrait frame,
   replacing the placeholder. (_landing.tsx + landing.css)
4. **Process steps reworded** — 01 Initial Consultation & Pre Medical Screening,
   02 Baseline Assessment (90 mins - 2 hrs), 03 Results Deep Dive and Action Plan
   (7 days), 04 Quarterly Review with a gold "Recommended" label. (_landing.tsx + landing.css)
5. **Pricing from the deck** — replace aspirational Tier I-IV grid with the real deck
   pricing: Baseline $1,000, 1st Retest $750, Further Retest $500; iMedical blood-testing
   note (from $138, separate); optional add-ons (Baseline Online $100/mo, Fitness
   Coaching $80/$100, Nutrition $300). (_landing.tsx + landing.css)
6. **apple-touch-icon** — DONE: generated `public/landing/apple-touch-icon.png` (180x180,
   logo on brand-dark). Wire into metadata. (layout.tsx)
7. **iMessage/OG preview = black-bg logo** — OG image already points to the dark logo;
   confirm + keep. (layout.tsx)
8. **Logo stretching on iPhone** — add `height:auto` to global img rule + explicit
   intrinsic width/height on logo imgs to lock aspect ratio. (landing.css + _landing.tsx)
9. **Schedule button → contact form** — add a contact modal on the landing wired to the
   primary "Schedule Your Baseline Assessment" CTA; POST to new `/api/contact` route that
   emails info@strongbodies.com.au via `sendEmailViaSMTP2Go` (helper already exists).
   Includes honeypot + basic validation since the endpoint is public.

## Verify
- `npm run build` passes.
- Manual: contact modal opens, validates, posts; pricing reflects deck; process labels updated.
