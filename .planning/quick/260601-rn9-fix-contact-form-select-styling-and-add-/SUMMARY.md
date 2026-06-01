---
quick_id: 260601-rn9
title: Fix contact-form select styling and add Cloudflare Turnstile
status: complete
date: 2026-06-01
area: landing-page
---

# SUMMARY — contact form select styling + Cloudflare Turnstile

Follow-up to quick task `260601-r25` (TODO-001 contact form).

## What changed

1. **"Interested in" select styling** — the native `<select>` rendered with OS chrome
   (default arrow, mismatched background) versus the text inputs. Added
   `select.contact-input` rules: `appearance:none`, a gold SVG chevron caret
   (`background-position: right 14px center`), `padding-right:40px`, `color-scheme:dark`,
   and dark `<option>` backgrounds — now visually identical to the other fields.
   (`src/app/landing.css`)

2. **Cloudflare Turnstile on the contact form** — anti-bot verification layered on top of
   the existing honeypot.
   - Client (`src/app/_landing.tsx`): loads the Turnstile script once, renders an explicit
     widget (dark theme) inside the modal while the form is shown, tracks the token in
     state, gates the submit button until a token is present, sends `turnstileToken` in the
     POST body, and resets the (single-use) widget on a failed submit. Site key from
     `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, falling back to Cloudflare's always-passes TEST key
     so the widget renders in dev.
   - Server (`src/app/api/contact/route.ts`): when `TURNSTILE_SECRET_KEY` is set, verifies
     the token against `challenges.cloudflare.com/turnstile/v0/siteverify` (passing the
     client IP) and rejects on failure / missing token. When unset, verification is skipped
     (honeypot remains the defence) so local dev and unconfigured envs still work.
   - Documented `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (and the
     previously-undocumented `SMTP2GO_API_KEY` / `EMAIL_FROM`) in `.env.example`.

## Naming note
The user asked for "Google Turnstile". Turnstile is **Cloudflare's** product (Google's
equivalent is reCAPTCHA), so this implements Cloudflare Turnstile. Flagged to the user.

## Verification
- `npm run build` — compiled successfully; `/api/contact` still registered.
- ESLint clean on changed files.
- Browser (gate `peakage`): select matches the other inputs with a gold caret; Turnstile
  widget renders (test-key "Success!" state) and the Send button enables once the token
  resolves.
- API: missing name → 400, honeypot → 200 (captcha skipped since no secret set locally) —
  no regression. The real send path was not exercised to avoid emailing the live inbox.

## To activate in production
Set a matching Turnstile key pair: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public) and
`TURNSTILE_SECRET_KEY` (server). Until `TURNSTILE_SECRET_KEY` is set, the server skips
verification and the dev widget shows Cloudflare's "for testing only" banner.
