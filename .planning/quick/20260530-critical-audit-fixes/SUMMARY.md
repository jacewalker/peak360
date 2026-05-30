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
- `npx vitest run`: 246 tests, 245 pass, **1 pre-existing failure**:
  `insights.test.ts > deduplicates insights with the same title`. This is NOT
  caused by these changes - the "no global dedup" behavior it contradicts is
  present at the base commit (93203b0, insights.ts lines 426-432, intentional).

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
