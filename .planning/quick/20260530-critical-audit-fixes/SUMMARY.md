---
slug: critical-audit-fixes
status: complete
branch: fix/critical-audit-bugs
date: 2026-05-30
---

# Summary: Critical audit fixes

Branch: `fix/critical-audit-bugs` (off `main`). 7 atomic commits + 2 planning commits.

## Changes applied (atomic commit per issue)

| Issue | Commit | File | Change |
|-------|--------|------|--------|
| #2 | 1eb9f40 | `api/assessments/bulk-delete/route.ts` | `requireSession()`, block clients, scope delete to caller-owned rows (admins any), real deleted count. |
| #3 | 861d693 | `api/admin/audit-logs/route.ts` | `requireAdmin()` guard. |
| #4 | 66c853a | `api/assessments/export/route.ts` | `requireAdmin()` guard. |
| #9 | 2643c69 | `lib/normative/ratings.ts` | `resolveRawLabel` returns `string \| null`; null on no-match/NaN; `getPeak360Rating` early-returns null. |
| #21 | 42e871c | `lib/normative/insights.ts` | Switch cases renamed to `total_testosterone` / `free_testosterone`. |
| #21 | (test) | `__tests__/normative/insights.test.ts` | Test used camelCase key that never occurs in production; aligned to snake_case. |

## Verification
- `npx tsc --noEmit`: no new errors. The 19 reported errors are all pre-existing
  test-file issues (`vi` not defined in setup.tsx, test type-casts) - none in app
  source, none in the edited files.
- `npx vitest run`: **identical pass/fail set before and after these changes.**
  Base commit 93203b0: 66 failed | 280 passed | 4 skipped (350).
  This branch: 66 failed | 280 passed | 4 skipped (350). **Zero new failures.**
- The 66 pre-existing failures are environmental: `src/__tests__/setup.tsx`
  references `vi` which is not configured as a vitest global, so most component /
  page / section test files fail to run (Badge, Header, ProgressBar,
  NavigationButtons, HomePage, Section5, etc.). Plus one stale logic test:
  `insights.test.ts > deduplicates insights with the same title`, which contradicts
  the intentional "no global dedup" behavior at base (insights.ts:426-432).
- The targeted tests for the changed code pass: normative ratings suite green, and
  the testosterone insight test (updated to the production key) passes.

## Notes / follow-ups
- Pre-existing failing test `deduplicates insights with the same title` should be
  updated to match the intentional no-dedup behavior (separate cleanup, out of
  scope for these security/clinical fixes).
- #9 secondary recommendation (raise lower-is-better `poor.max` caps / add marker
  direction so extreme values resolve to `poor`/`elite` rather than `null`) is a
  data-level follow-up, deferred.
- `case 'crpHs'`/other camelCase aliases in insights.ts are harmless - each has a
  correct snake_case sibling case; only testosterone lacked one.
- Not pushed / no PR opened (user to review first).
