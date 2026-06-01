---
quick_id: 260601-rn9
title: Fix contact-form select styling and add Cloudflare Turnstile
status: complete
created: 2026-06-01
area: landing-page
files:
  - src/app/_landing.tsx
  - src/app/landing.css
  - src/app/api/contact/route.ts
  - .env.example
---

# Contact form: select styling + Cloudflare Turnstile

Follow-up to `260601-r25`.

## Tasks
1. Style `select.contact-input` to match the text inputs (strip native chrome, gold caret,
   dark option list).
2. Add Cloudflare Turnstile to the contact form:
   - Client widget (dark theme), token gating the submit, single-use reset on failure.
   - Server verify in `/api/contact` when `TURNSTILE_SECRET_KEY` is set; skip otherwise.
   - Env-var driven with TEST-key fallback so dev works; document in `.env.example`.

## Verify
- `npm run build` clean.
- Widget renders; select matches; API validation unchanged.
