---
phase: quick-260526-rtt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/clients/link.ts
  - src/app/api/assessments/route.ts
  - src/app/api/assessments/[id]/route.ts
  - src/app/api/assessments/[id]/sections/[num]/route.ts
  - src/app/api/client-login/route.ts
  - scripts/backfill-client-ids.ts
  - src/lib/clients/link.test.ts
autonomous: true
requirements: [RTT-CLIENT-ID-LINKAGE]

must_haves:
  truths:
    - "Reassigning an assessment to a different client name/email repoints client_id to that client's user (and away from the previous client)"
    - "Renaming a client via Section 1 sync updates client_id to match the new name/email"
    - "Creating an assessment with a clientName/clientEmail that maps to a client-role user sets client_id at create time"
    - "Assigning/renaming to a client with no existing account auto-creates a role='client' user (no email sent) and links it"
    - "Email match wins over name match; an ambiguous name (2+ client users) never auto-links the wrong user"
    - "client-login upgrades an auto-created placeholder client user (matched by name) instead of creating a duplicate user"
    - "The backfill script defaults to DRY-RUN and prints a per-assessment action table; it only mutates when --apply is passed"
  artifacts:
    - path: "src/lib/clients/link.ts"
      provides: "resolveClientId() and applyClientLink() shared resolver"
      exports: ["resolveClientId", "applyClientLink"]
      min_lines: 60
    - path: "scripts/backfill-client-ids.ts"
      provides: "One-time DRY-RUN-by-default backfill over all assessments"
      contains: "--apply"
    - path: "src/lib/clients/link.test.ts"
      provides: "Resolver + client-login dedup unit tests"
      contains: "resolveClientId"
  key_links:
    - from: "src/app/api/assessments/[id]/route.ts"
      to: "src/lib/clients/link.ts"
      via: "applyClientLink in PUT when clientName/clientEmail present"
      pattern: "applyClientLink"
    - from: "src/app/api/assessments/[id]/sections/[num]/route.ts"
      to: "src/lib/clients/link.ts"
      via: "applyClientLink in Section 1 sync block"
      pattern: "applyClientLink"
    - from: "src/app/api/assessments/route.ts"
      to: "src/lib/clients/link.ts"
      via: "applyClientLink in POST after insert"
      pattern: "applyClientLink"
    - from: "src/app/api/client-login/route.ts"
      to: "src/lib/db user table"
      via: "name-match upgrade of placeholder user before createUser"
      pattern: "resolveClientId|update\\(user\\)"
---

<objective>
Make `assessments.client_id` an authoritative reflection of the currently-assigned
client across all three write paths, auto-creating a `role='client'` user (no email)
when no account exists, fix the client-login duplicate-user bug, and ship a one-time
DRY-RUN-by-default backfill for existing rows.

Purpose: Reassigned/renamed assessments currently keep a stale `client_id` (or none),
so the client portal — which lists assessments solely `WHERE client_id = session.user.id`
— hides them from the correct client and can leak them to the wrong one.

Output: `src/lib/clients/link.ts` shared resolver, wiring into 3 API write paths, a
client-login dedup fix, `scripts/backfill-client-ids.ts`, and vitest coverage.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase — use directly. -->

From src/lib/db/schema.ts (Postgres) and src/lib/db/schema-sqlite.ts (mirror) — the
DRIZZLE TABLE OBJECTS the resolver must use via the existing db proxy. The resolver
MUST pick the schema module the same way src/lib/seed-admin.ts does, because the two
schema files are distinct objects:

  const isPostgres = !!process.env.DATABASE_URL;
  const schema = isPostgres
    ? await import('@/lib/db/schema')
    : await import('@/lib/db/schema-sqlite');
  // then: schema.user, schema.assessments

assessments columns (camelCase drizzle keys): id, clientName, clientEmail, clientDob,
clientGender, assessmentDate, currentSection, status, normativeVersionId, coachId,
clientId, createdAt, updatedAt.

user columns (camelCase drizzle keys): id, name, email (UNIQUE), emailVerified, image,
role (default 'coach'; values admin|coach|client), coachId (nullable; for clients points
at their coach), banned, banReason, banExpires, createdAt, updatedAt.

From src/lib/auth.ts — Better Auth instance. The ONLY supported create path (mirrors
src/app/api/client-login/route.ts lines 110-148):
  await auth.api.createUser({
    body: { email, password: crypto.randomUUID(), name, role: 'client' as 'user' | 'admin' },
  });
  // then re-query: db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
createUser does NOT return the row reliably; ALWAYS re-query by email to get the id.
The 'role' cast is required (admin-plugin type narrows to its own union at compile time;
runtime accepts the configured 'client' string).

From src/lib/auth-helpers.ts (already imported by all three routes):
  const [session, errorRes] = await requireSession();  // session.user.{id,role}

From src/app/api/assessments/[id]/route.ts PUT (the assign flow) — current body merge,
the line that must gain link logic:
  await db.update(assessments).set({ ...body, updatedAt: now }).where(eq(assessments.id, id));
  // body may contain clientName and/or clientEmail (handleAssign sends {clientName})

From src/app/api/assessments/[id]/sections/[num]/route.ts PUT — the Section 1 sync block
(sectionNum === 1) builds updatePayload with clientName/clientEmail/clientDob/clientGender,
then: await db.update(assessments).set(updatePayload).where(eq(assessments.id, id));

From src/app/api/assessments/route.ts POST — after insert, body has clientName/clientEmail;
coachId is set to session.user.id.

From scripts/run-migrations.ts — standalone-script connection pattern (Postgres via
DATABASE_URL). Scripts import from '../src/lib/db/index' and rely on the db proxy +
runMigrations(). Run via: DATABASE_URL=postgres://... npx tsx scripts/<name>.ts
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build the shared client-link resolver with full unit coverage</name>
  <files>src/lib/clients/link.ts, src/lib/clients/link.test.ts</files>
  <behavior>
    resolveClientId({ clientName, clientEmail, coachId }) → Promise<string | null>:
    - Email match wins: if clientEmail present AND a role='client' user has that email
      (case-insensitive — lowercase before compare) → return that user's id.
    - Else unambiguous name match: if clientName present AND EXACTLY ONE role='client'
      user has that name → return that user's id.
    - Ambiguous name (2+ role='client' users share the name) → treat as NO match. Do NOT
      guess and do NOT auto-create off an ambiguous name alone; fall through to the
      no-match branch below.
    - No match: if clientEmail present → auto-create role='client' user with that email,
      name = clientName (fallback to the email local-part if clientName empty), coachId
      from the arg when provided, random password, NO email sent → return new id.
      If clientEmail absent (only a name, and it was ambiguous or unmatched) → auto-create
      with a generated UNIQUE placeholder email (e.g. `client+<uuid>@placeholder.peak360.local`)
      so the UNIQUE email constraint holds; the account simply can't log in yet.
    - If neither clientName nor clientEmail present → return null (nothing to link).

    applyClientLink(assessmentId, { clientName, clientEmail, coachId }) → Promise<void>:
    - Calls resolveClientId(...) then db.update(assessments).set({ clientId: <id|null> })
      .where(eq(assessments.id, assessmentId)). AUTHORITATIVE: always writes the resolved
      value, including null, so a stale/previous client_id is cleared or repointed.

    Test cases (link.test.ts) — drive against a REAL local SQLite db (see action):
    - Test 1: email match wins over a different name match → returns the email-matched id.
    - Test 2: unambiguous name match (single client user) → returns that id.
    - Test 3: ambiguous name (two client users, same name, no email) → auto-creates a NEW
      user (does NOT return either existing id) and links it.
    - Test 4: no match + email present → auto-creates client user with that exact email.
    - Test 5: reassignment repoints — applyClientLink to client B after client A was set
      → assessment.client_id == B's id (and != A's id).
    - Test 6: only-a-coach-user-by-name (role='coach') is NEVER matched → auto-creates a
      client instead (resolver filters role='client').
  </behavior>
  <action>
    Create src/lib/clients/link.ts exporting `resolveClientId` and `applyClientLink` per
    the behavior block. Use `@/` imports and `import type` for any types. Select the
    schema module at call time exactly like src/lib/seed-admin.ts (isPostgres → schema vs
    schema-sqlite) so it is DB-driver-agnostic via the existing db proxy. Reuse the
    auth.api.createUser pattern from src/app/api/client-login/route.ts lines 110-148
    verbatim (role cast included), then RE-QUERY by email for the id. Set the new user's
    coachId from the arg when provided. Lowercase emails before any comparison and before
    storing. Do NOT import or call auth.api.signInMagicLink or sendEmailViaSMTP2Go anywhere
    in this file. Guard the placeholder-email branch so a generated address can never
    collide (uuid component). For the ambiguous-name rule, count role='client' users with
    that exact name; >1 ⇒ treat as no match.

    Create src/lib/clients/link.test.ts following the repo's vitest conventions (dynamic
    `await import('@/lib/clients/link')` like src/lib/crypto.test.ts so env is set first).
    Drive against a REAL better-sqlite3 db: in beforeEach, ensure DATABASE_URL is UNSET
    (forces the SQLite branch), point at a throwaway file db (e.g. set cwd-local
    `local.test.db` via a fresh better-sqlite3 Database, or call runMigrations() once),
    and reset module/global state between tests so globalForDb.db/migrated are clean
    (use vi.resetModules() and a unique db file per run, then delete it in afterEach).
    Seed `user` rows by inserting directly through the db proxy. Auto-create assertions
    re-query the user table by email/name. Keep the harness minimal — the goal is to
    exercise the resolver's branching, not Better Auth internals; if auth.api.createUser
    is impractical to run headless in the test env, the test MAY assert the resolver's
    pre-createUser decision by spying on a thin internal create helper — but PREFER the
    real path. Document whichever approach you take in a top-of-file comment.
  </action>
  <verify>
    <automated>npx vitest run src/lib/clients/link.test.ts</automated>
  </verify>
  <done>resolveClientId + applyClientLink exported from src/lib/clients/link.ts; all 6 test cases pass; no email-sending imports present (grep -L 'signInMagicLink\|sendEmailViaSMTP2Go' confirms absence).</done>
</task>

<task type="auto">
  <name>Task 2: Wire applyClientLink into the three assessment write paths</name>
  <files>src/app/api/assessments/route.ts, src/app/api/assessments/[id]/route.ts, src/app/api/assessments/[id]/sections/[num]/route.ts</files>
  <action>
    Import { applyClientLink } from '@/lib/clients/link' into all three routes.

    (a) src/app/api/assessments/[id]/route.ts PUT (the assign flow): AFTER the existing
    `db.update(assessments).set({ ...body, updatedAt: now })`, if `body.clientName` OR
    `body.clientEmail` is present, call
    `await applyClientLink(id, { clientName: body.clientName, clientEmail: body.clientEmail, coachId: row.coachId })`.
    Use the pre-fetched `row.coachId` (already loaded above for hasAccess) so a newly
    auto-created client inherits the assessment's coach. This makes client_id authoritative
    on reassign/rename, repointing or clearing it.

    (b) src/app/api/assessments/[id]/sections/[num]/route.ts PUT, inside the existing
    `if (sectionNum === 1 && body.data)` block: AFTER `db.update(assessments).set(updatePayload)`,
    if `d.clientName` OR `d.clientEmail` is present, call
    `await applyClientLink(id, { clientName: d.clientName as string|undefined, clientEmail: d.clientEmail as string|undefined, coachId: assessment.coachId })`
    (the parent `assessment` row is already loaded for hasAccess).

    (c) src/app/api/assessments/route.ts POST: AFTER the insert and the normativeVersion
    block, if `body.clientName` OR `body.clientEmail` is present, call
    `await applyClientLink(id, { clientName: body.clientName, clientEmail: body.clientEmail, coachId: session.user.id })`.

    Keep each call non-fatal-safe only where the surrounding code already is (POST's
    versioning is wrapped in try/catch; do NOT swallow link errors elsewhere — let them
    surface as a 500 so a failed link is visible). Preserve the existing NextResponse JSON
    shapes and `@/` import style. Do not reformat unrelated lines.
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -c applyClientLink src/app/api/assessments/route.ts src/app/api/assessments/\[id\]/route.ts src/app/api/assessments/\[id\]/sections/\[num\]/route.ts</automated>
  </verify>
  <done>applyClientLink imported and called in all three routes (PUT assign, Section 1 sync, POST create); tsc --noEmit passes; grep shows ≥1 call site per file.</done>
</task>

<task type="auto">
  <name>Task 3: Fix client-login dedup-by-name and add its regression test</name>
  <files>src/app/api/client-login/route.ts, src/lib/clients/link.test.ts</files>
  <action>
    In src/app/api/client-login/route.ts, fix the duplicate-user bug in the account
    resolution block (currently: look up by email → if none, createUser). New logic:
    1. Keep the existing EMAIL-match path (existing.length > 0 → resend, userId = existing).
    2. NEW fallback BEFORE createUser: if no email match, look for a role='client' user
       matched by NAME (the auto-created placeholder). If exactly one exists, UPGRADE it:
       set its email to the entered email instead of creating a second user. GUARD the
       UNIQUE email constraint — before the update, confirm no OTHER user already holds
       that email (the email-match query above already proved that for the entered email,
       but re-confirm defensively); if the email is taken by someone else, fall through to
       createUser (which will surface the constraint error as today). On ambiguous name
       (2+ client users), do NOT guess — fall through to createUser.
       Set userId = upgraded user's id, created = false (account already existed; this is
       effectively a first real login for a placeholder).
    3. Only if neither email NOR a single name-matched placeholder exists → createUser as
       today. Preserve the existing magic-link send and the subsequent assessment-linking
       update (clientId + clientEmail). Keep error handling and NextResponse shape intact.

    Add a 7th test to src/lib/clients/link.test.ts (or a sibling describe block) that
    exercises ONLY the dedup-by-name decision: given a placeholder role='client' user
    (name 'Jane Doe', placeholder email), simulate the client-login resolution and assert
    that upgrading by name updates the SAME user's email rather than inserting a new row
    (user count for that name stays 1). If invoking the full route handler is impractical
    headless, extract the name-match-upgrade decision into a tiny exported helper in
    src/lib/clients/link.ts (e.g. `findClientUserByName(name): Promise<id|null|'ambiguous'>`)
    and unit-test that helper directly, then have client-login route call it. Document the
    chosen approach in a comment.
  </action>
  <verify>
    <automated>npx vitest run src/lib/clients/link.test.ts && npx tsc --noEmit</automated>
  </verify>
  <done>client-login upgrades a single name-matched placeholder instead of creating a duplicate; UNIQUE-email collision falls through safely; dedup test passes; tsc --noEmit passes.</done>
</task>

<task type="auto">
  <name>Task 4: One-time DRY-RUN-by-default backfill script</name>
  <files>scripts/backfill-client-ids.ts</files>
  <action>
    Create scripts/backfill-client-ids.ts following the standalone-script pattern in
    scripts/run-migrations.ts (top-level async IIFE; `await import('../src/lib/db/index')`;
    Postgres via DATABASE_URL). The script:
    - Masks and prints the target DATABASE_URL (reuse run-migrations.ts masking regex).
    - Calls runMigrations() first (idempotent) so tables exist.
    - Reads ALL assessments. For each, compute the SAME resolution as resolveClientId
      WITHOUT mutating in dry-run: import and reuse the resolver's read-only decision.
      To avoid auto-creating users during DRY-RUN, the script must distinguish actions:
        • LINK→<userId>     (existing client user resolved by email/unambiguous name)
        • CREATE-USER→<email> (no match; would auto-create — show the email/placeholder)
        • SKIP              (already has the correct client_id, or no name AND no email)
        • CONFLICT          (ambiguous name with no email — would auto-create a placeholder;
                             flag it so the user can review before applying)
      Expose this via a read-only planning function. SUGGESTED: add an exported
      `planClientLink({ clientName, clientEmail })` to src/lib/clients/link.ts that returns
      `{ action, detail }` by running ONLY the lookup branches (no writes, no createUser),
      and have resolveClientId share that lookup internally. The script prints a clear
      aligned table: assessment id | clientName | clientEmail | current client_id | action.
    - Prints a summary count per action at the end.
    - DRY-RUN is the DEFAULT. Only when `--apply` is in process.argv (or APPLY=1 env) does
      it call applyClientLink(assessment.id, { clientName, clientEmail, coachId }) for each
      row, then re-print the table with applied results and a mutated-count summary.
    - Usage comment at top mirroring run-migrations.ts. Do NOT instruct running against
      prod here — the developer reviews the dry-run and runs --apply themselves.
  </action>
  <verify>
    <automated>npx tsc --noEmit scripts/backfill-client-ids.ts 2>/dev/null; npx vitest run src/lib/clients/link.test.ts</automated>
  </verify>
  <done>scripts/backfill-client-ids.ts exists; defaults to dry-run (no --apply ⇒ no writes); prints the per-assessment action table + summary; --apply gates all mutations; planClientLink read-only path added and unit-tested via resolver tests.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| coach/admin browser → assessment write APIs | Authenticated coach/admin supplies clientName/clientEmail that drives user resolution + possible auto-create |
| operator shell → backfill script → prod DB | Privileged one-off; mutates client_id across all rows |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-rtt-01 | Information disclosure | applyClientLink in PUT/sections (assign/rename) | mitigate | client_id is authoritative — always overwritten (incl. to null) on every name/email change, so a renamed/reassigned assessment can never remain visible to the previous client |
| T-rtt-02 | Spoofing | resolveClientId name-match | mitigate | Ambiguous name (2+ client users) is treated as NO match → never auto-links the wrong existing account; auto-creates a distinct placeholder instead |
| T-rtt-03 | Tampering | client-login email upgrade | mitigate | UNIQUE-email guard: never reassign an email already held by another user; collision falls through to createUser which surfaces the DB constraint |
| T-rtt-04 | Elevation of privilege | auto-created users | accept | Auto-created accounts are role='client' only with a random password and an unusable placeholder email — cannot authenticate until a real login is provisioned; no email sent |
| T-rtt-05 | Tampering | backfill script mass-mutation | mitigate | DRY-RUN default; writes only behind explicit --apply/APPLY=1; CONFLICT rows surfaced for human review before apply |
| T-rtt-SC | Tampering | npm installs | mitigate | No new packages introduced (uuid, crypto, drizzle, better-auth already in package.json); no install step required |
</threat_model>

<verification>
- `npx vitest run src/lib/clients/link.test.ts` — all resolver + dedup cases green.
- `npx tsc --noEmit` — whole project typechecks after wiring.
- `grep -c applyClientLink` across the three routes — each ≥ 1.
- Dry-run smoke (optional, LOCAL/DEV SQLite only): `npx tsx scripts/backfill-client-ids.ts`
  prints the action table and makes NO writes. Do NOT run --apply against prod here.
- `grep -L 'signInMagicLink\|sendEmailViaSMTP2Go' src/lib/clients/link.ts` — confirms the
  resolver sends no email.
</verification>

<success_criteria>
- client_id is authoritative across all three write paths (assign PUT, Section 1 sync, POST create): it repoints to the resolved client and clears/repoints away from a prior client.
- Auto-create produces a role='client' user (random password, placeholder-or-real unique email, coachId inherited) with NO email sent.
- Resolution priority holds: email match > unambiguous name match > auto-create; ambiguous name never auto-links a wrong user.
- client-login upgrades a single name-matched placeholder rather than creating a duplicate, with a UNIQUE-email guard.
- Backfill script is DRY-RUN by default, prints a reviewable action table, and gates every mutation behind --apply.
- Tests pass and the project typechecks.
</success_criteria>

<output>
Create `.planning/quick/260526-rtt-client-id-linkage/260526-rtt-SUMMARY.md` when done.
</output>
