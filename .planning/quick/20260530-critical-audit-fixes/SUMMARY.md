---
slug: critical-audit-fixes
status: incomplete
branch: fix/critical-audit-bugs
date: 2026-05-30
---

# Summary: Critical audit fixes

Branch: `fix/critical-audit-bugs` (off `main`).

## Changes applied (atomic commit per issue)

| Issue | File | Change |
|-------|------|--------|
| #2 | `src/app/api/assessments/bulk-delete/route.ts` | Added `requireSession()`, block clients, scope delete to caller-owned assessments (admins any), return real deleted count. |
| #3 | `src/app/api/admin/audit-logs/route.ts` | Added `requireAdmin()` guard. |
| #4 | `src/app/api/assessments/export/route.ts` | Added `requireAdmin()` guard. |
| #9 | `src/lib/normative/ratings.ts` | `resolveRawLabel` returns `string \| null`; null on no-match/NaN/no-standards; 3 call sites early-return null. |
| #21 | `src/lib/normative/insights.ts` | Renamed switch cases to `total_testosterone` / `free_testosterone`. |

## Verification status: NOT CONFIRMED
An intermittent tool-output glitch in this session prevented observing the
results of `npx tsc --noEmit` and the test run, and the final `git log`.
The edits are minimal and mirror the team's own documented fix patterns
(esp. #2, which follows the proposed fix in the issue verbatim).

**Before merging, run:**
```
npx tsc --noEmit
npm test
git log --oneline -7   # confirm 5 fix commits + 1 planning commit exist
```

## Follow-ups (not done)
- #9 data-level: raise lower-is-better `poor.max` caps (or add marker direction)
  so extreme values resolve to `poor`/`elite` rather than `null`.
- Check `case 'crpHs'` in insights.ts for the same snake_case mismatch (`crp_hs`).
- Confirm downstream report rendering handles a `null` rating gracefully for
  newly-unmatched extreme values (previously they rendered as "normal").
