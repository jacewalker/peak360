---
phase: quick-260525-ls8
plan: 01
subsystem: e2e-testing
tags: [playwright, e2e, auth, portal, pillars]
requires: []
provides:
  - e2e/helpers/auth.ts (signInAsAdmin)
  - e2e/helpers/assessment.ts (createAssessment/seedSection/deleteAssessment)
affects:
  - e2e/phase1-report.spec.ts
  - e2e/mobile-responsiveness.spec.ts
  - e2e/phase8-pillars.spec.ts
  - playwright.config.ts
key-files:
  created:
    - e2e/helpers/auth.ts
    - e2e/helpers/assessment.ts
  modified:
    - e2e/phase1-report.spec.ts
    - e2e/mobile-responsiveness.spec.ts
    - e2e/phase8-pillars.spec.ts
    - playwright.config.ts
metrics:
  result: "49 passed, 5 skipped, 0 failed"
  commit: 8b07f6f
  completed: 2026-05-25
---

# Quick 260525-ls8: Modernize the Playwright e2e suite Summary

Modernized the three stale Playwright specs to exercise the Phase 7 auth gate
and Phase 8/9 `/portal` redesign: shared auth + assessment-setup helpers,
hermetic self-created test data with cleanup, and a webServer origin fix so the
spawned dev server can authenticate. Suite is now fully green.

## What changed

**`e2e/helpers/auth.ts` (new)** — `signInAsAdmin(page)` posts to
`/api/auth/sign-in/email` via `page.request` so the session cookie lands in the
page context. Creds from `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` with
`admin@admin.com` / `password123` defaults.

**`e2e/helpers/assessment.ts` (new)** — `createAssessment` (POST, returns id),
`seedSection` (PUT `.../sections/:num` with `{ data }`), `deleteAssessment`
(best-effort DELETE). All use `page.request` to share the signed-in cookie.

**`phase1-report.spec.ts`** — Now targets `/portal/assessment/:id/report`
(the Peak Living pillars view rendered by `ReportShell → PillarsGrid →
PillarCard`). Tests: report renders 5 pillar cards + detailed marker disclosure
for a seeded female client; gender differentiation (hemoglobin 13.5 yields a
different tier pill for male vs female); pillars render with "Awaiting data"
when unseeded; clicking a card opens the detail modal. The old Section-11
disclaimer / range-bar / referral-flag assertions were dropped because that
chrome now lives only on the PDF surface (`src/lib/pdf/*`), not the portal report.

**`mobile-responsiveness.spec.ts`** — Routes migrated to `/portal`,
`/portal/clients`, `/portal/assessments`, `/portal/assessment/:id/...`.
Selectors updated to the redesigned `Sidebar`: hamburger
`button[aria-label="Open navigation"]`, mobile drawer `aside.w-64`, desktop rail
`aside.hidden.lg:flex`. Intent preserved: no horizontal overflow, 48px
(`h-12`) touch targets, hamburger open + Escape close, desktop sidebar present /
hamburger hidden. Mobile-sidebar tests `test.skip` on the desktop project.

**`phase8-pillars.spec.ts`** — Removed the hardcoded `TEST_ASSESSMENT_ID` and
the env-gated `test.skip`; each run now `signInAsAdmin` + creates and seeds its
own assessment, then cleans it up. Pillar card / modal / ESC-returns-focus /
focus-trap / disclosure-collapsed assertions retained against the current
`PillarCard` (`aria-label="Open detailed view for {label}"`) and `PillarModal`
(`role="dialog"`).

**`playwright.config.ts`** — Added `webServer.env: { BETTER_AUTH_URL:
'http://localhost:3000', PORT: '3000' }` so the spawned dev server trusts its
own origin (otherwise Better Auth sign-in 403s `INVALID_ORIGIN`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced `waitForLoadState('networkidle')` with
`domcontentloaded` + explicit element waits**
- **Found during:** Task 5 (first full run). All 16 `[tablet]`-project tests
  timed out at `waitForLoadState('networkidle')` while the mobile + desktop
  projects passed the identical assertions — a Turbopack long-lived-connection
  flake under 3-project parallel load, not a real failure.
- **Fix:** Swapped every `networkidle` wait for `domcontentloaded`, and added an
  explicit `await expect(inputs.first()).toBeVisible()` in the touch-target test
  because the section page is client-rendered (shows "Loading…" then mounts the
  form).
- **Files modified:** all three specs.
- **Commit:** 8b07f6f

### Plan-intent adjustment (not a code deviation)

- The plan's phase8 "mobile bottom-sheet" assertion no longer matches the app:
  `PillarModal` is now a centred modal (`grid place-items-center`), not a
  bottom-anchored sheet. Rather than `test.fixme`, the test was rewritten to
  assert the dialog is visible and fully within the mobile viewport — preserving
  the "modal works on mobile" intent against the current DOM. Documented inline.
- The plan's phase1 disclaimer / range-bar / referral assertions were dropped
  (not fixme'd) because that DOM moved to the PDF report; the portal report is
  the pillars view. Gender-aware rating intent is preserved via the detailed
  marker disclosure tier comparison.

## Constraints honored

- Changes only in `e2e/**` and `playwright.config.ts`. No `src/**` edits; no
  `data-testid` additions were needed (role/text/class selectors sufficed).
- Tests are hermetic: authenticate, create + seed their own assessments via the
  authenticated API, and delete them in `afterEach`/`afterAll` — no orphan data
  in the shared dev Postgres.
- No hardcoded assessment ids.
- `.env.local` copied into the worktree for the run; it is gitignored and was
  NOT committed (verified absent from `git status` staging).

## Verification

- `npm run test:e2e -- --reporter=list`: **49 passed, 5 skipped, 0 failed.**
  (The 5 skips are the mobile-only sidebar tests excluded on the desktop project.)
- `npx tsc --noEmit`: no errors in `e2e/**` or `playwright.config.ts`. Pre-existing
  errors in `src/__tests__/**` (vitest globals / type-assertion noise) are
  out of scope and untouched.

## Self-Check: PASSED
- e2e/helpers/auth.ts — FOUND
- e2e/helpers/assessment.ts — FOUND
- e2e/phase1-report.spec.ts, mobile-responsiveness.spec.ts, phase8-pillars.spec.ts — FOUND (modified)
- playwright.config.ts — FOUND (modified)
- Commit 8b07f6f — FOUND
