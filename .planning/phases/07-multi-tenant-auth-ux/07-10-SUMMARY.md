---
phase: 07-multi-tenant-auth-ux
plan: 10
subsystem: auth-security-gap-closure
tags:
  - auth
  - security
  - gap-closure
  - bl-01
  - bl-02
dependency_graph:
  requires:
    - 07-01  # auth.ts owner — minPasswordLength fix amended this file
    - 07-07  # role-change route owner — atomic transaction rewrite amended this file
    - 07-09  # security regression test suite — both updated test files originated here
  provides:
    - BL-01 closed (8-char password floor enforced at API)
    - BL-02 closed (atomic last-admin guard via db.transaction)
    - Updated regression tests guarding both fixes
  affects:
    - tests/security (29 tests pass; 2 mutation tests confirmed real-guard)
tech_stack:
  added: []
  patterns:
    - "Drizzle db.transaction(async (tx) => ...) with named LastAdminError control-flow"
    - "Brace-balanced source extraction in static-source regression tests"
key_files:
  created: []
  modified:
    - src/lib/auth.ts
    - src/app/api/admin/users/[userId]/role/route.ts
    - tests/security/auth-config.test.ts
    - tests/security/last-admin-guard.test.ts
decisions:
  - "Use atomic db.transaction for the last-admin guard (BL-02 missing-list option B); auth.api.setRole moved post-commit as best-effort session-invalidation"
  - "Preserve local variable name `before` in the route to keep tests/security/last-admin-guard.test.ts:33 passing without modification"
  - "Postgres SELECT ... FOR UPDATE deferred: the count query inside the transaction is portable across SQLite + Postgres; FOR UPDATE row-locking would tighten Postgres-only behaviour but is out of scope for gap closure"
  - "Replaced plan-suggested regex `[\\s\\S]+?\\}` with manual brace-balancing in the new BL-02 test (Rule 1 — the suggested regex matched only the inner if-block, not the full transaction body)"
metrics:
  duration: ~10m
  completed: 2026-05-07
  tasks: 3
  files: 4
---

# Phase 07 Plan 10: Auth Config + Last-Admin Guard Gap Closure Summary

Closed two security blockers (BL-01, BL-02) in 4 files: bumped Better Auth's `minPasswordLength` from 4 to 8 to match the UI floor, and replaced the unreachable post-check rollback in the admin role-change handler with a single atomic Drizzle transaction wrapping the count + role write. Both existing regression tests in `tests/security/` were updated to validate the new code shape, with mutation tests confirming each new assertion fails when the implementation regresses.

## Closes

- **BL-01** (07-VERIFICATION.md row 2): minPasswordLength enforced at API matches UI's 8-char floor
- **BL-02** (07-VERIFICATION.md row 4): last-admin guard rollback path replaced with atomic transaction; race window is now closed by construction
- **REQ-7.8** (password reset flow — 8-char floor)
- **REQ-7.10** (admin user-management — last-admin guard)

## Task-by-Task Results

### Task 1 — Bump minPasswordLength from 4 to 8 (BL-01)

**Commit:** `95ec3ef`
**File:** `src/lib/auth.ts`
**Diff:** Single character change.

```diff
-    minPasswordLength: 4,
+    minPasswordLength: 8,
```

**Verification:**
- `grep -F 'minPasswordLength: 8' src/lib/auth.ts` — match
- `grep -F 'minPasswordLength: 4' src/lib/auth.ts` — no match
- `grep -F 'disableSignUp: true' src/lib/auth.ts` — match (D-01 unchanged)
- `grep -F 'sendResetPassword:' src/lib/auth.ts` — match (D-23 unchanged)
- `npx tsc --noEmit` — no errors related to `src/lib/auth.ts`

### Task 2 — Atomic db.transaction replaces unreachable rollback (BL-02)

**Commit:** `b8363d7`
**File:** `src/app/api/admin/users/[userId]/role/route.ts`
**Diff:** 41 insertions, 58 deletions (~17 lines shorter).

The pre-check + forward setRole + post-check rollback + 409 response (lines 47-109 of the previous file) were replaced with:

```ts
class LastAdminError extends Error {}

try {
  await db.transaction(async (tx: any) => {
    if (oldRole === 'admin' && newRole !== 'admin') {
      const rows = await tx
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(eq(user.role, 'admin'));
      const before = Number(rows[0]?.count ?? 0);
      if (before <= 1) {
        throw new LastAdminError();
      }
    }
    await tx.update(user).set({ role: newRole }).where(eq(user.id, userId));
  });
} catch (err) {
  if (err instanceof LastAdminError) {
    return NextResponse.json(
      { error: 'Cannot change the role of the only admin. Promote another user to admin first.' },
      { status: 400 }
    );
  }
  return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
}

// Post-commit best-effort session invalidation only.
try {
  await auth.api.setRole({ body: { userId, role: newRole as 'admin' }, headers: await headers() });
} catch {}
```

**Variable name pin:** the local `before` identifier is preserved verbatim so the existing test at `tests/security/last-admin-guard.test.ts:33` (regex `/before\s*<=\s*1/`) continues to match without modification. A comment in the source documents the dependency.

**Removed entirely:** `countAdmins` helper (lines 39-45 of old file), pre-check (47-56), forward setRole try-catch (62-69), post-check rollback (71-109), `'user.role.rollback'` audit log (86-100), 409 "Race detected" response (101-107).

**Verification:**
- `grep -F 'db.transaction' route.ts` — match (2 lines: comment + actual call)
- `grep -F 'before <= 1' route.ts` — match (variable-name pin honoured)
- `grep -F 'tx.update(user)' route.ts` — match (durable write inside tx)
- `grep -F 'Cannot change the role of the only admin' route.ts` — match (verbatim copy)
- `grep -c 'auth.api.setRole' route.ts` — 1 (single post-commit call)
- `grep -F 'user.role.rollback' route.ts` — no match (rollback removed)
- `grep -F 'status: 409' route.ts` — no match (race response removed)
- `grep -c 'LastAdminError' route.ts` — 3 (class + throw + instanceof)
- `npx tsc --noEmit` — 0 errors related to this file

### Task 3 — Update regression tests for the new code shape

**Commit:** `a9e89fc`
**Files:** `tests/security/auth-config.test.ts`, `tests/security/last-admin-guard.test.ts`

**auth-config.test.ts:** appended a 4th `it(...)` block asserting `minPasswordLength: 8` and the negative `not.toMatch(/minPasswordLength:\s*4/)`. The 3 original tests are byte-for-byte unchanged.

**last-admin-guard.test.ts:**
- 4 original `it(...)` tests preserved verbatim (oldRole/newRole, verbatim error copy + status 400 anchored on `before <= 1`, pre-count-before-setRole, audit log).
- DELETED the warning-6 rollback test (`setRoleMatches.length >= 2`, `'user.role.rollback'`, `status: 409`).
- ADDED 3 new BL-02 fix tests:
  1. **Atomic-transaction shape:** asserts `db.transaction(`, `tx.update(user)`, and that the brace-balanced transaction body contains both the admin-count filter and the role write.
  2. **Rollback removed:** asserts source does NOT contain `'user.role.rollback'` or `status: 409`.
  3. **At most one setRole:** asserts `auth.api.setRole` regex matches at most 1 occurrence.

**Plan deviation (Rule 1 — bug fix):** the plan-suggested regex
`/db\.transaction\s*\([^)]*\)\s*=>\s*\{[\s\S]+?\}\s*\)/`
fails to capture the full transaction body because the lazy `[\s\S]+?\}` matches the FIRST inner `}` (closing the `if (before <= 1) {` block) rather than the outer transaction-arrow `}`. The new test would have spuriously failed even against a correct implementation. Replaced with explicit brace-balancing on the first `{` after `db.transaction(async (`. Documented inline in the test for future maintainers.

**Verification:**
- `npx vitest run tests/security/auth-config.test.ts tests/security/last-admin-guard.test.ts` — 11/11 pass
- `npx vitest run tests/security/` — 29/29 pass (full plan-09 suite green)

## Mutation Test Outcomes

| Mutation | Implementation Change | Expected Result | Actual Result |
|----------|----------------------|-----------------|---------------|
| **M1** (minPasswordLength regression) | `sed -i 's/minPasswordLength: 8/minPasswordLength: 4/' src/lib/auth.ts` | New minPasswordLength assertion FAILS | FAILED at line 36 (`expect(authSource).toMatch(/minPasswordLength:\s*8/)`) — confirmed real guard |
| **M2** (db.transaction removed) | `sed -i 's/db\.transaction/db.notATransaction/g' route.ts` | New BL-02 fix assertion FAILS | FAILED at line 62 (`expect(source).toMatch(/db\.transaction\s*\(/)`) — confirmed real guard |

Both source files restored after mutation testing; `git status --short` clean before final commits.

## Deviations from Plan

### Rule 1 — Bug fix (regex correctness)

**Found during:** Task 3 (running the new BL-02 fix test)
**Issue:** The plan's suggested regex for extracting the transaction body
`/db\.transaction\s*\([^)]*\)\s*=>\s*\{[\s\S]+?\}\s*\)/`
matches only up to the first inner `}` (the `if`-block closer), not the full arrow function body. The captured `txBlock` was missing the `tx.update(user)` line, causing the test to fail against a correct implementation.
**Fix:** Replaced the regex extraction with manual brace-balancing — `indexOf('{', txStart)` to find the body open, then a depth counter to find the matching close. Documented the rationale inline.
**Files modified:** `tests/security/last-admin-guard.test.ts`
**Commit:** `a9e89fc`

### Rule 1 — Bug fix (TypeScript strict-mode parameter type)

**Found during:** Task 2 (`npx tsc --noEmit`)
**Issue:** `db` is exported as `Proxy<any>` in `src/lib/db/index.ts`, so `db.transaction(...)` returns `any` and the `tx` callback parameter has no inferable type. Strict mode rejected `(tx) => ...`.
**Fix:** Annotated `(tx: any) => ...` with the existing project pattern (`@typescript-eslint/no-explicit-any` disable comment, matching `src/lib/db/index.ts:6`).
**Files modified:** `src/app/api/admin/users/[userId]/role/route.ts`
**Commit:** `b8363d7`

### Rule 1 — Bug fix (acceptance-criterion grep collision)

**Found during:** Task 2 grep verification (auth.api.setRole count was 3, not 1)
**Issue:** The route file's prose comments referenced `auth.api.setRole` by name twice in addition to the actual call; both `grep -c` and the new test's `source.match(/auth\.api\.setRole/g)` would count those references as if they were extra calls.
**Fix:** Rewrote the two prose comment occurrences to use the phrases "rollback setRole call" and "setRole call" without the dotted form, leaving exactly one literal `auth.api.setRole` token in the file (the actual call).
**Files modified:** `src/app/api/admin/users/[userId]/role/route.ts`
**Commit:** `b8363d7` (folded into Task 2)

## Known Limitations

### Postgres FOR UPDATE not implemented

The atomic transaction guarantees correctness on SQLite (better-sqlite3 serialises writes per-process, with WAL mode and `foreign_keys = ON` already pragma-set in `src/lib/db/index.ts`). On Postgres, the count query inside the transaction does NOT take a row-level lock (no `SELECT ... FOR UPDATE`). Two concurrent demotions on Postgres could in theory both observe `count = 2` and both proceed, dropping admins to 0.

**Deferred:** the FOR UPDATE upgrade is non-trivial because the codebase's `db` Proxy hides the SQLite/Postgres branching, and adding `FOR UPDATE` would require driver-specific code. This is documented for a follow-up phase if a multi-admin Postgres deployment ships in production. The risk is low for the current single-admin or low-concurrency deployment profile.

## Threat Surface Notes

T-07-13, T-07-29 (re-asserted) and T-07-44 (new) are all dispositioned `mitigate` and have corresponding test guards:

| Threat ID | Component | Test guard |
|-----------|-----------|-----------|
| T-07-13 | 4-char password acceptance | auth-config.test.ts:34 (BL-01 assertion) |
| T-07-29 | 0-admin window via concurrent demotion | last-admin-guard.test.ts:60 (db.transaction shape) + line 79 (no rollback) |
| T-07-44 | Future commit re-adds 2nd auth.api.setRole call | last-admin-guard.test.ts:88 (`setRoleMatches.length <= 1`) |

T-07-43 (audit-log actor staleness on concurrent demotion) and T-07-53 (variable name `before` rename without test update) remain `accept` — out of scope for this gap-closure plan.

## Self-Check: PASSED

**Files exist:**
- `src/lib/auth.ts` — modified (line 17: `minPasswordLength: 8`)
- `src/app/api/admin/users/[userId]/role/route.ts` — modified (db.transaction shape)
- `tests/security/auth-config.test.ts` — modified (4 it blocks)
- `tests/security/last-admin-guard.test.ts` — modified (7 it blocks)

**Commits exist on branch:**
- `95ec3ef` Task 1 (BL-01)
- `b8363d7` Task 2 (BL-02 transactional rewrite)
- `a9e89fc` Task 3 (regression test updates)

**Verification:**
- `npx vitest run tests/security/` — 29/29 pass
- `npx tsc --noEmit` — 0 errors related to the 4 files in this plan (30 pre-existing errors in `src/__tests__/setup.tsx` and `src/__tests__/store/assessment-store.test.ts` are out of scope; they exist on the base HEAD `f1b4c0c`)
- Mutation M1 + M2 — both confirm new test assertions are real guards, not no-ops
- VERIFICATION.md gap rows 2 (BL-01) and 4 (BL-02): RESOLVED on the next verifier run
