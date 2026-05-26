---
phase: quick-260526-rtt
plan: 01
subsystem: client-portal-linkage
tags: [auth, assessments, client-portal, drizzle, backfill]
requires: []
provides:
  - "resolveClientId() / applyClientLink() authoritative client-link resolver (src/lib/clients/link.ts)"
  - "planClientLink() / findClientUserByName() read-only helpers"
  - "client_id wired into all 3 assessment write paths (POST create, PUT assign, Section 1 sync)"
  - "client-login dedup-by-name upgrade (no duplicate placeholder users)"
  - "scripts/backfill-client-ids.ts (DRY-RUN by default)"
affects:
  - src/app/api/assessments/route.ts
  - src/app/api/assessments/[id]/route.ts
  - src/app/api/assessments/[id]/sections/[num]/route.ts
  - src/app/api/client-login/route.ts
tech-stack:
  added: []
  patterns:
    - "deps-injection ({ db, schema, createUser }) makes a db-driver-agnostic resolver unit-testable headless against throwaway better-sqlite3"
    - "seed-admin-style schema selection (DATABASE_URL → schema vs schema-sqlite) at call time"
key-files:
  created:
    - src/lib/clients/link.ts
    - src/lib/clients/link.test.ts
    - scripts/backfill-client-ids.ts
  modified:
    - src/app/api/assessments/route.ts
    - src/app/api/assessments/[id]/route.ts
    - src/app/api/assessments/[id]/sections/[num]/route.ts
    - src/app/api/client-login/route.ts
decisions:
  - "Resolver auto-create path is injectable (deps.createUser); prod defaults to the real auth.api.createUser, tests inject a faithful insert+requery stub so the email-vs-name-vs-create decision is exercised without booting Better Auth"
  - "findClientUserByName returns the literal 'ambiguous' for 2+ matches; lookup must exclude that sentinel before treating a string result as a real id (bug found + fixed during Task 1 tests)"
metrics:
  tasks: 4
  files: 7
  completed: 2026-05-26
---

# Quick Task 260526-rtt Plan 01: Client-ID Linkage Summary

Made `assessments.client_id` an authoritative reflection of the currently-assigned client across all three write paths, auto-creating a `role='client'` user (no email) when no account exists, fixed the client-login duplicate-user bug, and shipped a DRY-RUN-by-default backfill — verified with 19 headless vitest cases and a write-free local SQLite dry-run.

## What Was Built

- **`src/lib/clients/link.ts`** — `resolveClientId()` (email match > unambiguous name match > auto-create; ambiguous name never auto-links a wrong user), `applyClientLink()` (authoritative: always writes the resolved value incl. `null` to repoint/clear), plus read-only `planClientLink()` and `findClientUserByName()`. Auto-create uses `auth.api.createUser` (`role='client'`, random password, NO email) and a generated unique placeholder email when only an ambiguous/unmatched name is supplied. Schema module selected at call time exactly like `seed-admin.ts`.
- **Three write paths wired** — POST `/api/assessments` (link at create time, coach = `session.user.id`), PUT `/api/assessments/[id]` (repoint/clear on assign/rename using pre-fetched `row.coachId`), and PUT `.../sections/[num]` Section 1 sync (repoint/clear on rename using `assessment.coachId`). Link errors surface (no silent swallow).
- **client-login dedup fix** — before `createUser`, a single `role='client'` placeholder matched by name has its email upgraded in place (with a UNIQUE-email guard; ambiguous names fall through to `createUser`).
- **`scripts/backfill-client-ids.ts`** — DRY-RUN default; aligned per-assessment action table (LINK/CREATE-USER/SKIP/CONFLICT) + summary counts; mutations gated behind `--apply`/`APPLY=1`.

## Verification

- `npx vitest run src/lib/clients/link.test.ts` — **19 passed** (6 plan-mandated resolver cases + reassignment/clear + planner + findClientUserByName + 3 dedup-by-name regression cases).
- `npx tsc --noEmit` — **no new errors in non-test source**. (19 pre-existing `error TS` all live in `src/__tests__/**`, present on clean HEAD before this work — out of scope per the scope boundary.)
- `grep -c applyClientLink` across the three routes — **2 each** (import + call site), ≥1 call site per file confirmed.
- Resolver sends no email — the only mention of `signInMagicLink`/`sendEmailViaSMTP2Go` is the documentation comment; **no import or call** exists.
- Dry-run smoke (local SQLite, `DATABASE_URL` unset): printed the table + summary (50 rows → 11 CREATE-USER, 34 SKIP, 5 CONFLICT) and made **0 writes / 0 users created**. `--apply` was NOT run (per constraints).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ambiguous-name sentinel wrongly treated as a match**
- **Found during:** Task 1 (resolver unit tests; 2 of 16 failed initially).
- **Issue:** `findClientUserByName` returns the literal string `'ambiguous'` for 2+ matches. `lookupClientLink` checked `typeof byName === 'string'` to detect a real id — but `'ambiguous'` is also a string, so an ambiguous name was incorrectly returned as a matched id (would have auto-linked the wrong user and broken the T-rtt-02 spoofing mitigation).
- **Fix:** Added `&& byName !== 'ambiguous'` to the match guard so ambiguous names fall through to the create/conflict branch.
- **Files modified:** `src/lib/clients/link.ts`
- **Commit:** `e0359b1`

### Testing approach (documented per plan, not a deviation)

The plan permitted spying on a thin internal create helper if `auth.api.createUser` is impractical headless. A probe confirmed `auth.api.createUser` cannot run in the vitest transform context (the db proxy's `require('./schema-sqlite')` fails to resolve during `getDb()`), so per the plan's documented fallback the resolver exposes a `deps`-injection seam: prod defaults to the **real** `auth.api.createUser` path verbatim, while tests inject a throwaway better-sqlite3 drizzle instance + a faithful `createUser` stub (insert `role='client'` row, then re-query by email — mirroring the real insert+requery contract). This exercises the resolver's actual branching (the logic under test) without booting Better Auth. The chosen approach is documented in a top-of-file comment in both `link.ts` and `link.test.ts`.

## Threat Surface

All `mitigate` dispositions in the plan's threat register are satisfied:
- **T-rtt-01** (info disclosure): `applyClientLink` is authoritative — client_id is overwritten (incl. to null) on every name/email change (test: reassignment repoints; clear-to-null).
- **T-rtt-02** (spoofing): ambiguous name treated as NO match → never auto-links a wrong existing account (test 3 + dedup ambiguous case). The sentinel bug above would have violated this; fixed before commit.
- **T-rtt-03** (tampering): client-login email upgrade re-confirms no OTHER user holds the email before reassigning; collision falls through to `createUser` (dedup "email held by another user" test).
- **T-rtt-04** (EoP, accepted): auto-created accounts are `role='client'`, random password, unusable placeholder/real unique email, no email sent.
- **T-rtt-05** (mass-mutation): backfill DRY-RUN default; writes only behind `--apply`; CONFLICT rows surfaced for review (smoke-verified 0 writes).
- **T-rtt-SC**: no new packages introduced.

No new threat surface beyond the plan's register.

## Commits

- `e0359b1` feat(quick-260526-rtt-01): shared client-link resolver with full unit coverage
- `328eedc` feat(quick-260526-rtt-01): wire applyClientLink into the three assessment write paths
- `1493115` fix(quick-260526-rtt-01): client-login upgrades name-matched placeholder instead of duplicating
- `6bb9f22` feat(quick-260526-rtt-01): DRY-RUN-by-default backfill for assessments.client_id

## Self-Check: PASSED

- `src/lib/clients/link.ts` — FOUND
- `src/lib/clients/link.test.ts` — FOUND
- `scripts/backfill-client-ids.ts` — FOUND
- Commits `e0359b1`, `328eedc`, `1493115`, `6bb9f22` — all FOUND in git log
