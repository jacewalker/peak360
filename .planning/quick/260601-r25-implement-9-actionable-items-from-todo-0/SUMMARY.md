---
quick_id: 260601-r25
title: Implement 9 actionable items from TODO-001 landing page polish
status: complete
date: 2026-06-01
area: landing-page
---

# SUMMARY — TODO-001 landing page polish (9 items)

Implemented the 9 actionable acceptance items from
`.planning/todos/pending/2026-05-31-landing-page-polish.md`. The blocked item
(3 testimonials, Kevin-sourced) was left untouched.

## What changed

1. **Eyebrow size (desktop only)** — `@media (min-width: 1101px)` bumps `.hero .eyebrow`
   from 11px → 13px; mobile unchanged. (`landing.css`)
2. **Live Sample teaser** — opaque elevated panel (solid gradient #15141a→#0d0d10) with
   depth shadow + inset highlight, replacing the near-transparent gradient. (`landing.css`)
3. **Sample report image** — user-supplied report mockup saved to
   `public/landing/sample-report.png`, dropped into the What-We-Test portrait frame
   (`.has-report` variant: `object-fit:contain`, decorative pseudo-labels hidden,
   caption "Sample report — illustrative only"). (`_landing.tsx`, `landing.css`)
4. **Process steps reworded** — 01 Initial Consultation & Pre Medical Screening / 02
   Baseline Assessment (90 mins – 2 hrs) / 03 Results Deep Dive and Action Plan (7 days)
   / 04 Quarterly Review with a gold `.process-time-rec` "Recommended" label. (`_landing.tsx`,
   `landing.css`)
5. **Pricing from the deck** — replaced the placeholder Tier I-IV grid ($1,295–$19,995)
   with the real deck pricing: 3-up testing tiers (Baseline $1,000 "Start Here", 1st Retest
   $750, Further Retest $500 "Best Value"), an iMedical bloods note (from $138, booked
   separately, with order link), and a 3-card optional add-ons grid (Baseline Online
   $100/mo, Fitness Coaching $80/$100, Nutrition $300). (`_landing.tsx`, `landing.css`)
6. **apple-touch-icon** — generated `public/landing/apple-touch-icon.png` (180×180, logo
   centred on brand-dark via `sips`), wired via `metadata.icons.apple`. (`layout.tsx`)
7. **iMessage/OG preview** — confirmed `og:image` = `/landing/peak360-logo.png` (dark-bg
   logo); rendered `<meta property="og:image">` verified. (`layout.tsx`, no change needed)
8. **Logo stretching on iPhone** — global `img { height:auto }`, `object-fit:contain` on
   `.brand`/`.footer-brand` logos, and explicit intrinsic `width={1230} height={367}` on
   the logo `<img>` tags. (`landing.css`, `_landing.tsx`)
9. **Schedule → contact form** — new `ContactModal` (event-driven, opened by the
   "Schedule Your Baseline Assessment" + "Book a Discovery Call" buttons) posting to a new
   `POST /api/contact` route that emails `info@strongbodies.com.au` via the existing
   `sendEmailViaSMTP2Go` helper. Includes a honeypot field + server-side validation
   (required name/email, email regex, length caps). Added `/api/contact` to the
   middleware `PUBLIC_PATHS` allowlist so the unauthenticated form can reach it.
   (`_landing.tsx`, `landing.css`, `src/app/api/contact/route.ts`, `src/middleware.ts`)

## Verification

- `npm run build` — compiled successfully; `/api/contact` route registered.
  (Pre-existing `BetterAuthError: default secret` warnings during build are unrelated —
  `BETTER_AUTH_SECRET` is not set in the local build env.)
- ESLint clean on changed files (one pre-existing font-link warning in `layout.tsx`).
- Visual check via Playwright (gate password `peakage`): hero teaser pops, sample report
  renders in §3, pricing reflects the deck, process shows the "Recommended" label, and the
  contact modal opens from the CTA.
- `POST /api/contact` exercised by curl: missing name → 400, invalid email → 400,
  honeypot filled → 200 (short-circuits, no send). A real valid submission was deliberately
  NOT sent to avoid emailing the client's live inbox during testing.

## Follow-ups / notes

- **Testimonials** remain — blocked on Kevin (out of scope).
- **Email transport**: the contact form uses SMTP2Go via the shared `sendEmailViaSMTP2Go`
  helper, which calls the SMTP2Go **HTTP API** with `SMTP2GO_API_KEY` (same path as
  magic-link/invitation emails). User mentioned providing an SMTP **username/password** —
  that is a different transport (SMTP auth) and would need a separate decision/change; the
  current API-key path already routes through SMTP2Go.
- The FAQ still references "Tier I/Tier II" and the placeholder testimonials still cite
  "Tier III/IV" — those weren't in the acceptance list, but now read slightly inconsistent
  with the new deck pricing. Worth a follow-up copy pass.
- `EMAIL_FROM` defaults to `noreply@peak360.com.au`; the enquirer's email is embedded in
  the body ("Reply directly to …") since the helper has no reply-to param.
