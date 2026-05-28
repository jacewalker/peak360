---
phase: 12-admin-managed-marker-registry
plan: 05
subsystem: verification
tags: [vitest, uat, integration-test, markers-registry, e2e]

requires:
  - phase: 12-admin-managed-marker-registry
    provides: [getReportMarkers(), createMarker/deleteMarker, markerToPillar D-07, /api/admin/markers, /portal/admin/markers UI, CustomMarkersBlock, PDF + Section 11 merged registry]
provides:
  - End-to-end integration test exercising the three layer seams (query layer write -> merge helper read -> pillar mapping short-circuit) + a fourth assertion that normative_ranges persists alongside the marker (D-05 atomic surface)
  - Manual UAT checklist with 7 happy-path steps + 5 negative tests, ready for the user to run against the Apolipoprotein B test marker
affects: [phase-12 closeout]

tech-stack:
  added: []
  patterns:
    - "Skip-with-clear-reason pattern: describe.skipIf gated on live-DB detection + a always-run availability-check describe that logs the reason so vitest CI output is unambiguous (vite-node lazy-require limitation)"
    - "Timestamped testKey + per-run dataKey + afterAll cascade cleanup so re-runs never collide and never leave orphan rows"

key-files:
  created:
    - src/lib/markers/__tests__/integration.test.ts
    - .planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md
    - .planning/phases/12-admin-managed-marker-registry/12-05-SUMMARY.md
  modified: []

key-decisions:
  - "Integration test gates on live-DB availability with describe.skipIf instead of forcing a Postgres-or-die hard requirement. Reason: vite-node cannot resolve src/lib/db/index.ts's lazy `require('./schema')` for either schema (the require chooses .ts at runtime but vite-node only resolves .ts via import, not require). The plan explicitly permits this fallback. Live coverage of the same seams runs through HUMAN-UAT.md against the dev server."
  - "Authored Task 3 (UAT file) BEFORE the Task 2 human-verify checkpoint per the plan's explicit instruction: 'Order this task BEFORE Task 2 in execution if possible (Task 2 references the file).'"
  - "Auto-mode is active; per executor checkpoint protocol auto-approved the Task 2 human-verify checkpoint (gate=blocking, not blocking-human) since the spawn prompt explicitly states 'The user will then run a manual UAT pass separately.' Logged as auto-approval in the completion report, not run inline."

patterns-established:
  - "Vitest integration tests against the real Drizzle proxy should detect-and-skip on lazy-require failure rather than force a brittle DB requirement. Acceptable when a parallel HUMAN-UAT.md surface gives live coverage; not acceptable for pure unit-test seams where mocking is straightforward."
  - "Per-step ownership annotation in UAT checklists ('If step X fails -> Plan Y owns the fix') routes gap-closure work directly to the right plan author without re-discovery."

requirements-completed: [D-01, D-04, D-07, D-08, D-10, D-11, D-12]

duration: ~6 min
completed: 2026-05-28
---

# Phase 12 Plan 05: End-to-end verification (integration test + HUMAN-UAT.md) Summary

**Phase-12 closeout artifacts: a Vitest integration test for the marker registry seams (query write -> merge read -> pillar short-circuit + normative_ranges persistence) plus a 7-step HUMAN-UAT.md happy-path with 5 negative tests, ready to validate the Apolipoprotein B end-to-end add flow against the dev server.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-28T08:53:22Z
- **Completed:** 2026-05-28T08:59:29Z
- **Tasks:** 2 auto + 1 auto-approved checkpoint
- **Files created:** 3 (integration test, HUMAN-UAT, this SUMMARY)
- **Files modified:** 0

## Accomplishments

- **Integration test** at `src/lib/markers/__tests__/integration.test.ts` covers the 3 layer seams Plan 05 calls out (createMarker -> getAllMarkers -> getReportMarkers merge -> markerToPillar D-07 short-circuit) plus a 4th assertion that a `normative_ranges` row persists alongside the marker (D-05 atomic write surface that Plan 02's POST handler exercises).
- **Test gates cleanly** on live-DB availability via `describe.skipIf` + an always-run availability-check describe that prints a readable reason to stderr. This is the plan-permitted fallback when vite-node cannot resolve `src/lib/db/index.ts`'s lazy `require('./schema')` (the require pattern works at Next.js runtime but vite-node only resolves `.ts` via `import`, not `require`).
- **HUMAN-UAT.md** at `.planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md` contains all 7 happy-path steps (admin add -> author content -> coach enters value -> Section 11 modal -> PDF -> audit log -> cleanup) plus 5 negative tests (seed-key collision, self-key collision, dataKey lock, optimistic concurrency, self-hide on empty section). Each step links to the owning plan so a failing step routes the gap-closure fix to the right author.
- **Auto-mode handoff:** Task 2 (human-verify) auto-approved per executor protocol because the spawn prompt explicitly defers the manual UAT pass to the user.

## Task Commits

1. **Task 1: Integration test** - `b5ae815` (test)
2. **Task 3: HUMAN-UAT.md** (authored before Task 2 per plan instruction) - `f563ef4` (docs)
3. **Task 2: Human-verify checkpoint** - auto-approved (no commit; user runs UAT separately per spawn prompt)
4. **Plan closeout** (this SUMMARY + STATE/ROADMAP) - pending

## Files Created/Modified

### Created

- `src/lib/markers/__tests__/integration.test.ts` (206 lines) - 5 test cases (4 live-DB + 1 availability-check). Live-DB tests:
  1. `getAllMarkers()` returns the created marker with the right shape
  2. `getReportMarkers()` merges it with `source='db'` and the stored pillar
  3. `markerToPillar()` short-circuits to the stored pillar (proof: assign an off-category pillar like `strength` to a Blood-Tests marker and confirm the regex/category heuristic is bypassed)
  4. A `normative_ranges` row persists keyed by the same testKey with the expected severityWeight
- `.planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md` (221 lines) - 7 happy-path steps + 5 negative tests + sign-off block. Uses port 8080, Postgres on Jaces-Mac-mini.local, admin@admin.com/password123 per CLAUDE.md global conventions. Zero em-dashes.
- `.planning/phases/12-admin-managed-marker-registry/12-05-SUMMARY.md` (this file)

### Modified

None. Plan 05 is verification-only; no production code is touched.

## Decisions Made

See `key-decisions` in frontmatter. Highlights:

1. **Skip-on-DB-unavailable for integration test (vs Postgres-only).** The plan explicitly says "the test must NOT require Postgres specifically" and "If the test environment cannot reach a writable DB ... gate the test with describe.skipIf(...) or document the requirement in the test file's header comment." Vite-node's `require()` cannot resolve `.ts` files (this is a fundamental loader limitation, not a bug in our code), so the live-DB suite skips and reports a clear stderr line. Live coverage is provided by the HUMAN-UAT.md happy-path.

2. **Author Task 3 before Task 2.** The plan body explicitly says: "Order this task BEFORE Task 2 in execution if possible (Task 2 references the file)." The 12-HUMAN-UAT.md file must exist before the human-verify checkpoint can reference it.

3. **Auto-approve the Task 2 checkpoint.** Auto-mode (`workflow.auto_advance=true`) was active at executor start. The Task 2 checkpoint is `gate="blocking"`, not `gate="blocking-human"`, so it auto-approves per the executor checkpoint protocol. The user's spawn prompt also explicitly says "The user will then run a manual UAT pass separately" - so this is the intended workflow.

## Deviations from Plan

None. The plan was executed exactly as written with one explicit-permitted gating choice (skipIf vs hard-required Postgres).

## Issues Encountered

**1. Vite-node cannot resolve lazy require('./schema') in src/lib/db/index.ts**

- **Where:** Task 1 integration test setup
- **Symptom:** First call to the `db` proxy (e.g. via `runMigrations()` or `getAllMarkers()`) throws `Cannot find module './schema'` or `'./schema-sqlite'` because `src/lib/db/index.ts` uses `require('./schema')` inside a sync `getDb()` function. Vite-node's loader handles `.ts` via `import` but not via `require()`.
- **Impact:** Cannot run the live-DB integration test in plain vitest without architectural changes to `src/lib/db/index.ts` (e.g. switching from lazy `require` to top-level static `import`).
- **Resolution:** Per plan-permitted fallback, gated the suite with `describe.skipIf` + a separate availability-check describe that logs the reason. Live coverage runs through the HUMAN-UAT.md happy-path against a real dev server.
- **Deferred fix candidate (not blocking Phase 12):** A future chore plan could refactor `src/lib/db/index.ts` to static-import the schema modules at the top level (both `./schema` and `./schema-sqlite`, using the same `isPostgres` switch to choose which one to call into). This would unblock vitest integration tests across the whole codebase. Out of scope for Phase 12 - flagged in `deferred-items.md` style as a future tech-debt cleanup.

## Verification Results

### Test sweep

```
PASS  src/lib/markers/__tests__/field-mappings.test.ts (7 tests)
PASS  src/lib/markers/__tests__/registry.test.ts       (6 tests)
PASS  src/lib/markers/__tests__/integration.test.ts    (5 tests | 4 skipped)

Test Files  3 passed (3)
     Tests  14 passed | 4 skipped (18)
```

The 4 skipped tests in `integration.test.ts` are the live-DB cases. The 1 passing test in that file is the availability-check that logs the skip reason. The skip is documented in the file header and the SUMMARY's "Issues Encountered" section.

### tsc

```
$ npx tsc --noEmit 2>&1 | grep -E "integration\.test"
(no output, exit 0)
```

Clean tsc for the new test file.

### File presence

```
$ test -f .planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md && \
  test -f src/lib/markers/__tests__/integration.test.ts && \
  echo OK
OK

$ wc -l .planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md
     221 .planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md

$ grep -cP '\x{2014}' .planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md
0
```

No em-dashes (per global rule).

### Commit cadence

```
f563ef4 docs(12-05): HUMAN-UAT.md - 7 happy-path steps + 5 negative tests for Apolipoprotein B end-to-end
b5ae815 test(12-05): integration test for marker registry seams (createMarker -> getReportMarkers -> markerToPillar)
```

2 atomic commits, one per code-producing task. The Task 2 checkpoint contributes no commit (auto-approved, defers to user-run UAT). This SUMMARY + STATE/ROADMAP land as the 3rd `docs(12-05):` commit.

## Self-Check: PASSED

- 3 expected files all found on disk:
  - `src/lib/markers/__tests__/integration.test.ts` (FOUND)
  - `.planning/phases/12-admin-managed-marker-registry/12-HUMAN-UAT.md` (FOUND)
  - `.planning/phases/12-admin-managed-marker-registry/12-05-SUMMARY.md` (FOUND, this file)
- 2 expected commits present in git log: `b5ae815`, `f563ef4`
- Integration test runs cleanly (1 passed, 4 skipped with documented reason)
- HUMAN-UAT.md has all 7 happy-path steps + 5 negative tests + sign-off block
- Zero em-dashes in any authored content
- `npx tsc --noEmit` clean for the new test file

## Phase 12 Closeout

This plan is the verification + UAT closeout for the **admin-managed marker registry** phase. With Plan 05 complete:

- All 5 plans in Phase 12 are executed: foundation (12-01), APIs (12-02), admin UI (12-03), coach + report integration (12-04), verification + UAT (12-05).
- Locked decisions covered: D-01 (merge), D-04 (AI aliases), D-07 (pillar short-circuit), D-08 (CustomMarkersBlock), D-10 (Section 11), D-11 (PDF), D-12 (admin UI).
- The Apolipoprotein B end-to-end add flow is ready for the user to walk through via HUMAN-UAT.md.
- Phase 12 is marked complete in STATE.md + ROADMAP.md (per spawn-prompt instruction to flip phase status after this plan).

## Next Steps for the User

1. Run the HUMAN-UAT.md happy-path against the dev server (admin@admin.com / password123, port 8080).
2. Run the 5 negative tests.
3. If any step fails, the UAT file's "Sign-off" section maps each step to its owning plan for gap-closure work.
4. If all green, sign the UAT and the phase is closed.

---
*Phase: 12-admin-managed-marker-registry*
*Plan: 05*
*Completed: 2026-05-28*
