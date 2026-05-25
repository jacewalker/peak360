---
phase: quick-260525-f5s
plan: 01
subsystem: auth-email
tags: [email, branding, magic-link, auth]
requires:
  - sendEmailViaSMTP2Go (src/lib/email/send.ts)
provides:
  - renderBrandedEmail() reusable branded HTML email layout
affects:
  - magic-link login email
  - password-reset email
  - invitation fallback emails (existing-user + new-user)
tech-stack:
  added: []
  patterns:
    - Pure, dependency-free HTML email builder (table layout, all inline styles)
key-files:
  created:
    - src/lib/email/template.ts
  modified:
    - src/lib/auth.ts
    - src/app/api/invitations/route.ts
decisions:
  - Bulletproof table-based CTA button with text PEAK360 wordmark (no remote images / web fonts) so the email renders fully with images blocked.
metrics:
  duration: ~2m
  completed: 2026-05-25
requirements: [F5S-01, F5S-02, F5S-03]
---

# Quick 260525-f5s: Branded Peak360 Login-Link Email Summary

Replaced the bare `<p>`/`<a>` magic-link, reset-password, and invitation-fallback emails with a reusable, bulletproof, all-inline-styles Peak360-branded HTML template (deep-navy "quiet luxury" card, gold CTA, text wordmark — image-block-proof).

## What Was Built

- **`src/lib/email/template.ts`** — new `renderBrandedEmail(o: BrandedEmailOptions)` pure function (no imports). Returns a full HTML document: hidden preheader, brand header (eyebrow + Georgia-serif PEAK360 wordmark), gradient divider, heading + intro, bulletproof table-based gold CTA button, plain-link fallback, footnote, and footer. Web-safe fonts only (Georgia serif display + system sans body); no remote images or web fonts.
- **`src/lib/auth.ts`** — `magicLink.sendMagicLink` and `emailAndPassword.sendResetPassword` now build their `html` via `renderBrandedEmail`. Subjects, sender, magic-link/expiry config unchanged.
- **`src/app/api/invitations/route.ts`** — both inline fallback HTML blocks (existing-user sign-in link, new-user welcome) swapped to `renderBrandedEmail`. Auth/role logic, subjects, and the primary `signInMagicLink` calls left intact.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Create branded email template | e49c632 | src/lib/email/template.ts |
| 2 | Magic-link + reset emails use template | f9b8529 | src/lib/auth.ts |
| 3 | Invitation fallback emails use template | ea7e179 | src/app/api/invitations/route.ts |

## Verification

- **`npx eslint`** on all three changed/new files: clean (exit 0).
- **`npx tsc --noEmit`** scoped to the changed/new files (`template.ts`, `auth.ts`, `route.ts`): no errors.
- Used non-breaking typographic apostrophes (`’`) in copy strings, consistent with the plan's reference intros/footnotes.

## Deviations from Plan

None — plan executed as written. Reference template implementation used verbatim (only formatting of the long sans-stack assignment wrapped across two lines, no behavioral change).

## Deferred / Out-of-Scope Issues

`npx tsc --noEmit` reports pre-existing errors in test files unrelated to this task and unrelated to any file I touched:
- `src/__tests__/components/layout.test.tsx` (`getByAlt` typo)
- `src/__tests__/normative/data.test.ts` (type-cast assertions)
- `src/__tests__/setup.tsx` (`vi` not found — missing vitest globals types in tsc context)
- `src/__tests__/store/assessment-store.test.ts` (SectionData cast mismatches)

These were present before this change and are outside the scope boundary (test files, not the email subsystem). Not fixed.

## Known Stubs

None. No placeholder/empty-data stubs introduced; all email bodies are fully wired through `renderBrandedEmail`.

## Self-Check: PASSED

- FOUND: src/lib/email/template.ts
- FOUND commit e49c632 (template)
- FOUND commit f9b8529 (auth.ts)
- FOUND commit ea7e179 (invitations route)
- `import { renderBrandedEmail }` present in both src/lib/auth.ts and src/app/api/invitations/route.ts
