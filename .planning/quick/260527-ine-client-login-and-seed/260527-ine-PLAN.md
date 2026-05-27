---
phase: quick-260527-ine
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/client-login/route.ts
  - src/app/portal/clients/[name]/page.tsx
  - scripts/seed-bob-smith.ts
autonomous: true
requirements: [CLIENT-LOGIN-MODE, BOB-SEED]

must_haves:
  truths:
    - "Staff can create a client account and send a branded WELCOME email (no magic link) via the 'Create account + welcome email' button"
    - "Staff can create a client account and send a magic SIGN-ON link via the 'Create account + send sign-on link' button"
    - "POST /api/client-login defaults to 'welcome' mode when body.mode is absent or invalid (never auto-sends a magic link)"
    - "Both Dialog buttons are disabled until the email is valid, and the Toast reports which email type was sent"
    - "All pre-existing client-login behavior (create-or-resend, placeholder upgrade, assessment linking, role gating, response shape) is preserved"
    - "scripts/seed-bob-smith.ts compiles and the project builds; the user can run it against the DEV Postgres DB to produce a fully-completed Bob Smith assessment whose Section 11 report + all five pillars render"
  artifacts:
    - path: "src/app/api/client-login/route.ts"
      provides: "mode-aware client-login (welcome | magic-link) with branded welcome email"
      contains: "renderBrandedEmail"
    - path: "src/app/portal/clients/[name]/page.tsx"
      provides: "two-option client-login Dialog (welcome + sign-on link)"
      contains: "Create account"
    - path: "scripts/seed-bob-smith.ts"
      provides: "idempotent Postgres-targeting Bob Smith client + completed assessment seed"
      contains: "createOrReuseVersion"
  key_links:
    - from: "src/app/portal/clients/[name]/page.tsx"
      to: "/api/client-login"
      via: "fetch POST with { clientName, email, mode }"
      pattern: "mode:"
    - from: "src/app/api/client-login/route.ts"
      to: "renderBrandedEmail"
      via: "welcome-mode email body"
      pattern: "renderBrandedEmail"
    - from: "scripts/seed-bob-smith.ts"
      to: "assessment_sections"
      via: "encrypt() for sections 3/4/5, plain JSON otherwise"
      pattern: "encrypt\\("
---

<objective>
Two independent, separately-committable deliverables in one plan:

**A — Client-login mode choice (deployable feature).** Add `body.mode: 'welcome' | 'magic-link'` to `POST /api/client-login`. `welcome` (the DEFAULT) creates/resends the account and sends a BRANDED WELCOME email with a "Sign in to Peak360" CTA pointing at the login page — NOT a magic link. `magic-link` keeps today's `signInMagicLink` behavior. The client-detail Dialog gets two explicit buttons so staff pick which email to send. Stop always sending a magic link.

**B — Bob Smith seed (dev-only script).** A new `scripts/seed-bob-smith.ts` that creates a `role='client'` "Bob Smith" user plus ONE fully-completed assessment with realistic, normatively-GOOD male data so the Section 11 report and all five Peak Living pillars render. The USER runs it against the dev Postgres DB. It CANNOT run from this sandbox (dev DB host unreachable) and must NEVER be pointed at prod.

Purpose: give staff control over what clients receive at account creation, and give the team a reliable, report-complete demo client.
Output: an updated client-login API + Dialog, and a new idempotent seed script.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md

<interfaces>
<!-- Contracts the executor needs. Extracted from the codebase — do NOT re-explore. -->

renderBrandedEmail (src/lib/email/template.ts) — branded transactional email:
```typescript
export function renderBrandedEmail(o: {
  preheader: string;   // hidden preview text
  eyebrow?: string;    // defaults to 'SECURE ACCESS'
  heading: string;     // e.g. 'Welcome to Peak360'
  intro: string;       // one short paragraph
  ctaLabel: string;    // button text
  ctaUrl: string;      // button + fallback link
  footnote: string;    // expiry / ignore note
}): string;
```

sendEmailViaSMTP2Go (src/lib/email/send.ts) — `{ to, subject, html } => Promise<void>`. In dev (no SMTP2GO_API_KEY) it logs the email to console.

auth (src/lib/auth.ts):
- `auth.api.createUser({ body: { email, password, name, role } })` — role widened via `'client' as 'user' | 'admin'`.
- `auth.api.signInMagicLink({ body: { email, callbackURL }, headers })` — sends the 5-min magic-link email (uses renderBrandedEmail internally). Used in 'magic-link' mode only.
- NOTE: `auth.api.createUser` works on Postgres but FAILS on SQLite (boolean-binding bug). The seed targets Postgres, so this is fine — do NOT attempt SQLite compatibility for the seed.

crypto (src/lib/crypto.ts) — `encrypt(plaintext: string): string`, `decrypt`, `isEncrypted`. encrypt() returns base64(iv+tag+ciphertext); if ENCRYPTION_KEY is unset it returns plaintext (graceful degradation).

createOrReuseVersion (src/lib/normative/versioning.ts) — `(): Promise<string>` returns a normative version id (dedup by content hash). Use for `assessments.normativeVersionId`.

runMigrations (src/lib/db/index.ts) — `(): Promise<void>` creates/patches all tables (idempotent). Call FIRST in the seed.

ENCRYPTED_SECTIONS = new Set([3, 4, 5]) — sections 3, 4 and 5 are encrypted at write time and decrypted on read (src/app/api/assessments/[id]/sections/[num]/route.ts + src/lib/report/load-report-data.ts). The seed MUST encrypt these three section blobs and store the others as plain JSON strings.

Drizzle schema (src/lib/db/schema.ts), Postgres tables:
- `assessments`: { id, clientName, clientEmail, clientDob, clientGender, assessmentDate, currentSection, status, normativeVersionId, coachId, clientId, createdAt, updatedAt }
- `assessmentSections`: { id (serial), assessmentId, sectionNumber, data (text), completedAt }
- `user`: { id, name, email (unique), role, coachId, ... }

CRITICAL — report reads section data by `m.section` + `m.dataKey` from src/lib/report-markers.ts. The dataKeys are NOT the same as the src/types/assessment.ts interface keys. The report reads `sectionData[m.dataKey]`, so the seed MUST use the report-markers dataKeys below. Section assignment per report-markers:
- Section 5 = Blood Tests & Biomarkers (dataKeys: cholesterolTotal, ldl, hdl, triglycerides, glucose, hba1c, hsCRP, vitaminD, uricAcid, serumIron, ferritin, totalTestosterone, freeTestosterone, oestradiol, shbg, dheas, fsh, lh, hemoglobin, rbc, hematocrit, creatinine, egfr, alt, ast, ggt, … plus no-norm extras)
- Section 6 = Body Composition (dataKeys: bwi, bodyFatPercentage, waistToHipRatio, leanMass, …)
- Section 7 = Cardiovascular Fitness (vo2max, restingHR, bpSystolic, bpDiastolic)
- Section 8 = Strength Testing (gripStrengthLeft/Right, cmjLeft/Right, imtpMaxForce, singleLegHopLeft/Right, singleLegBalanceLeft/Right, shoulderIsoYLeft/Right, pushupsMax, deadManHang, farmersCarryDistance)
- Section 9 = Mobility & Flexibility (hipMobilityLeft/Right, …)
- Section 1 MUST include `clientAge` (number) — load-report-data + the client page read `sections[1].clientAge` for age-bucketed ratings.

Rating engine (getPeak360Rating) keys markers by testKey; gendered/age-bucketed markers resolve by gender ('male'/'female') and age. Bob is male, age 41 → vo2max bucket '36-45', body_fat_percent bucket '40-59', pushups_max bucket '40-59'.
</interfaces>

@.planning/quick/260527-ine-client-login-and-seed/260527-ine-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add mode to /api/client-login + branded welcome email</name>
  <files>src/app/api/client-login/route.ts</files>
  <action>
Add a `mode` parameter to the POST handler and branch the email step. Preserve EVERY existing behavior (requireSession, role-client 403, clientName/email validation, canAccess gating, create-or-resend via existing lookup, tryUpgradePlaceholderByName placeholder upgrade, and the assessment-linking update). Only the final email block and the response shape change.

1. Parse mode from the request body right after `email` is derived:
   `const mode: 'welcome' | 'magic-link' = body?.mode === 'magic-link' ? 'magic-link' : 'welcome';`
   This implements decision A1: any absent/invalid value DEFAULTS to 'welcome' — it must NEVER fall through to sending a magic link.

2. Replace the current single magic-link email block (the `try { await auth.api.signInMagicLink(...) } catch { ...inline fallback... }`) with a branch on `mode`:
   - `mode === 'magic-link'`: keep the EXISTING behavior verbatim — call `auth.api.signInMagicLink({ body: { email, callbackURL: '/portal' }, headers: await headers() })` inside try/catch, and on catch send the existing inline fallback email via sendEmailViaSMTP2Go. Do not change this path (A2).
   - `mode === 'welcome'` (default): do NOT call signInMagicLink. Instead compute `const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';` and send a branded welcome email:
     `await sendEmailViaSMTP2Go({ to: email, subject: 'Welcome to Peak360', html: renderBrandedEmail({ preheader: 'Your Peak360 account is ready — sign in to view your assessments.', eyebrow: 'WELCOME', heading: 'Welcome to Peak360', intro: 'A Peak360 account has been created for you. Sign in to view your assessment results and track your progress over time.', ctaLabel: 'Sign in to Peak360', ctaUrl: `${baseUrl}/login`, footnote: 'This link takes you to the Peak360 sign-in page. If you didn’t expect this email, you can safely ignore it.' }) });`
     The CTA points at `${baseUrl}/login` (the login page) — it is NOT a magic link (A2). Import `renderBrandedEmail` from `@/lib/email/template` at the top (keep `import type` rules; this is a value import so a plain import is correct).

3. Add `mode` to the JSON response so the UI can reflect which email was sent (A3):
   `return NextResponse.json({ success: true, created, linkedCount, mode });`

Do not remove the `headers` import (still used by the magic-link branch). Do not change canAccess or tryUpgradePlaceholderByName.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v 'src/__tests__/' | grep -E "client-login/route" || echo "NO_TS_ERRORS_IN_FILE"</automated>
  </verify>
  <done>POST /api/client-login reads body.mode, defaults to 'welcome' on absent/invalid, sends a renderBrandedEmail welcome (CTA → ${baseUrl}/login) in welcome mode and the existing signInMagicLink flow in magic-link mode, returns { success, created, linkedCount, mode }, and all prior logic (gating, placeholder upgrade, linking) is unchanged. tsc reports no new errors in this file.</done>
</task>

<task type="auto">
  <name>Task 2: Two-option client-login Dialog</name>
  <files>src/app/portal/clients/[name]/page.tsx</files>
  <action>
Replace the single "Send login link" action with two explicit buttons, and thread the chosen mode through to the API (A4). This is a client component (`'use client'` already present); keep all existing imports, state, and the rest of the page intact.

1. Generalize `handleSendLogin` to accept a mode. Change its signature to:
   `const handleSendLogin = async (mode: 'welcome' | 'magic-link') => { ... }`
   Inside, include `mode` in the POST body: `body: JSON.stringify({ clientName, email, mode })`. On success, set the Toast text based on `mode` (use the existing `json.created` distinction too):
   - welcome + created: `Account created — welcome email sent to ${email} (${linked} assessment${linked === 1 ? '' : 's'} linked)`
   - welcome + existing: `Welcome email sent to ${email} (${linked} assessment${linked === 1 ? '' : 's'} linked)`
   - magic-link + created: `Account created — sign-on link sent to ${email} (${linked} assessment${linked === 1 ? '' : 's'} linked)`
   - magic-link + existing: `Sign-on link sent to ${email} (${linked} assessment${linked === 1 ? '' : 's'} linked)`
   Keep the error/catch branches as-is (a generic "Failed to send login" message is fine). Keep `setLoginSending` and `setLoginDialogOpen(false)` on success.

2. In the Dialog body: update the description paragraph to explain the two options (e.g. "Creates a client account (or reuses an existing one), links this client's assessments, then either sends a branded welcome email or a one-time sign-on link."). Update the heading from "Send a login link" to "Create client login".

3. Replace the single primary "Send login link" button in the Dialog footer with TWO action buttons plus Cancel:
   - Primary (gold, existing gold styling classes): label `Create account + welcome email`, `onClick={() => handleSendLogin('welcome')}`, `disabled={!loginEmailValid || loginSending}`.
   - Secondary (the bordered/outline style used by the Cancel button): label `Create account + send sign-on link`, `onClick={() => handleSendLogin('magic-link')}`, `disabled={!loginEmailValid || loginSending}`.
   - Keep Cancel.
   Both action buttons MUST be disabled until `loginEmailValid` (A4: no auto-default to magic-link, both gated on a valid email). While `loginSending`, show a "Sending…" affordance (you may disable both and swap the primary label to "Sending…"). On narrow widths let the buttons wrap (the footer can use `flex-wrap`).

Do not change the trigger button ("Client login") or `openLoginDialog`.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v 'src/__tests__/' | grep -E "clients/\[name\]/page" || echo "NO_TS_ERRORS_IN_FILE"</automated>
  </verify>
  <done>The Dialog shows two enabled-only-when-email-valid buttons ("Create account + welcome email" primary, "Create account + send sign-on link" secondary) plus Cancel; each POSTs the corresponding mode; the Toast names which email was sent; no auto-default to magic-link. tsc reports no new errors in this file.</done>
</task>

<task type="auto">
  <name>Task 3: scripts/seed-bob-smith.ts — idempotent Postgres Bob Smith seed</name>
  <files>scripts/seed-bob-smith.ts</files>
  <action>
Create a standalone tsx script modeled on scripts/run-migrations.ts and scripts/seed-admin.ts. It targets Postgres only and is run by the USER — it CANNOT run from this sandbox (dev DB host unreachable) and must NEVER be pointed at prod. Use relative imports from `../src/...` (like run-migrations.ts), NOT the `@/` alias.

Top-of-file comment block (verbatim intent):
- Title + purpose: "Seed a fully-completed 'Bob Smith' client + ONE completed assessment for the Section 11 report demo."
- Usage: `DATABASE_URL=postgres://... ENCRYPTION_KEY=... npx tsx scripts/seed-bob-smith.ts`
- WARNING: "Run against the DEV Postgres DB ONLY. NEVER point this at production. This script cannot be executed from the Claude sandbox (dev DB host is unreachable from there)."
- Note: ENCRYPTION_KEY must match the dev app's key, or sections 3/4/5 are stored as plaintext (encrypt() degrades gracefully) and will then fail decrypt-on-read once a real key is set. Also note `DATABASE_URL` must be present so the db proxy selects Postgres.

Structure (single async IIFE, mirror run-migrations.ts error handling: `.catch(err => { console.error(...); process.exit(1) })` and `process.exit(0)` on success):

1. Guard + masking. If `!process.env.DATABASE_URL`, print an error ("DATABASE_URL is required — this seed targets Postgres only") and exit(1). Print masked URL: `process.env.DATABASE_URL.replace(/:[^@]+@/, ':***@')`. Print whether ENCRYPTION_KEY is set (do NOT print its value); if unset, warn that sections 3/4/5 will be stored as plaintext.

2. Dynamic imports AFTER the guard (so DATABASE_URL is set before the db proxy initializes):
   `const { runMigrations, db } = await import('../src/lib/db/index');`
   `const schema = await import('../src/lib/db/schema');`  // assessments, assessmentSections, user
   `const { encrypt } = await import('../src/lib/crypto');`
   `const { createOrReuseVersion } = await import('../src/lib/normative/versioning');`
   `const { auth } = await import('../src/lib/auth');`
   `const { eq, and } = await import('drizzle-orm');`
   `const { v4: uuidv4 } = await import('uuid');`
   Call `await runMigrations();` first (B1).

3. Create/reuse Bob (B2). Constants: `const BOB_EMAIL = 'bob.smith@example.com'; const BOB_NAME = 'Bob Smith';`
   - Query `user` by email. If none, call `await auth.api.createUser({ body: { email: BOB_EMAIL, password: crypto.randomUUID(), name: BOB_NAME, role: 'client' as 'user' | 'admin' } })` (mirror client-login/route.ts; `import crypto from 'crypto'` or use globalThis.crypto.randomUUID()). Then re-query by email to get the id. If still missing, throw.
   - Pick a coachId: query `user` where role = 'coach' (limit 1); if none, role = 'admin' (limit 1); if none, ANY user (limit 1, but not Bob). Use its id as `coachId` (may be null only if Bob is the only user — acceptable).

4. Idempotency (B5). Before inserting, find Bob's prior seeded assessment: query `assessments` where `clientId = bobId AND clientEmail = BOB_EMAIL` (the seed always sets both). For each match, `await db.delete(schema.assessments).where(eq(schema.assessments.id, id))` — assessment_sections + pillar_prescriptions cascade-delete via FK. This replaces rather than duplicates on re-run.

5. Build the assessment (B2). `const assessmentId = uuidv4(); const today = new Date().toISOString().split('T')[0];` `const normativeVersionId = await createOrReuseVersion();`
   Insert into `assessments`: { id: assessmentId, clientName: 'Bob Smith', clientEmail: BOB_EMAIL, clientDob: '1985-04-12', clientGender: 'male', assessmentDate: today, currentSection: 11, status: 'completed', normativeVersionId, coachId, clientId: bobId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }.

6. Author realistic, normatively-GOOD MALE values for age 41 (B3). Use the report-markers dataKeys EXACTLY (see <interfaces>). Define one plain object per section. Recommended values (all rate normal→elite for a 41yo male per src/lib/normative/data.ts; do not deviate from these keys):
   - Section 1 (ClientInfo): { clientName: 'Bob Smith', clientEmail: BOB_EMAIL, clientPhone: '0400 000 000', clientDob: '1985-04-12', clientAge: 41, clientGender: 'male', coachName: 'Demo Coach', assessmentDate: today, location: 'Peak360 Studio' }  — clientAge:41 is REQUIRED for age-bucketed ratings.
   - Section 2 (DailyReadiness): { sleepQuality: 8, stressLevel: 3, energyLevel: 8, hydration: 'good', lastMeal: '2 hours ago' }
   - Section 3 (MedicalScreening) [ENCRYPTED]: { heartCondition: 'no', chestPain: 'no', dizziness: 'no', boneJoint: 'no', medication: 'no', medicalConditions: '', injuries: '', surgeries: '', allergies: '', additionalNotes: '' }
   - Section 4 (InformedConsent) [ENCRYPTED]: { consentAgreed: true, clientSignature: '', clientSignatureName: 'Bob Smith', clientSignatureDate: today, coachSignature: '', coachSignatureName: 'Demo Coach', coachSignatureDate: today } (empty-string signatures are fine — report renders without canvas data)
   - Section 5 (Blood Tests, report dataKeys) [ENCRYPTED]: { cholesterolTotal: 4.6, ldl: 2.3, hdl: 1.6, triglycerides: 0.9, glucose: 4.9, hba1c: 5.1, hsCRP: 0.4, vitaminD: 110, uricAcid: 5.2, serumIron: 110, ferritin: 180, totalTestosterone: 650, freeTestosterone: 14, oestradiol: 25, shbg: 40, dheas: 420, fsh: 6, lh: 5, hemoglobin: 15.2, rbc: 5.2, hematocrit: 46, creatinine: 1.0, egfr: 95, alt: 22, ast: 20, ggt: 18 }
   - Section 6 (Body Composition, report dataKeys): { bwi: 8.6, bodyFatPercentage: 14, waistToHipRatio: 0.86, leanMass: 68, skeletalMuscleMass: 38, fatMass: 12, visceralFatRating: 6, bmr: 1750 }
   - Section 7 (Cardiovascular Fitness): { vo2max: 50, restingHR: 54, bpSystolic: 118, bpDiastolic: 76 }
   - Section 8 (Strength Testing): { gripStrengthLeft: 48, gripStrengthRight: 50, cmjLeft: 40, cmjRight: 41, imtpMaxForce: 200, singleLegHopLeft: 35, singleLegHopRight: 36, singleLegBalanceLeft: 120, singleLegBalanceRight: 130, shoulderIsoYLeft: 9, shoulderIsoYRight: 9, pushupsMax: 30, deadManHang: 70, farmersCarryDistance: 90 }
   - Section 9 (Mobility & Flexibility): { hipMobilityLeft: 13, hipMobilityRight: 13, overheadReachLeft: 5, overheadReachRight: 5, shoulderMobilityLeft: 4, shoulderMobilityRight: 4, ankleDorsiflexionLeft: 12, ankleDorsiflexionRight: 12 }
   - Section 10 (Balance & Power): { singleLegBalanceLeft: 120, singleLegBalanceRight: 130, verticalJump: 50, broadJump: 230 }

7. Insert sections 1–10 (B4 + completedAt). For each section number `n`, `const json = JSON.stringify(sectionData);` then `const stored = new Set([3,4,5]).has(n) ? encrypt(json) : json;` and `await db.insert(schema.assessmentSections).values({ assessmentId, sectionNumber: n, data: stored, completedAt: new Date().toISOString() });`. CRITICAL (B4): sections 3, 4, 5 MUST be passed through encrypt() — storing them as plaintext breaks decrypt-on-read in the report. Do NOT encrypt the other sections.

8. Final logging (B5): print Bob's user id, the assessment id, and how to view it — e.g. "View: log in as bob.smith@example.com, or impersonate Bob from the People page; open /portal/assessment/<assessmentId>/section/11 for the report." Then `process.exit(0)`.

Conventions: scripts use `../src/...` relative imports; do not add the script to package.json. The auth.api.createUser SQLite caveat does not apply (Postgres-only).
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v 'src/__tests__/' | grep -E "scripts/seed-bob-smith" || echo "NO_TS_ERRORS_IN_FILE"</automated>
  </verify>
  <done>scripts/seed-bob-smith.ts exists, compiles clean (no tsc errors in the file), guards on DATABASE_URL and masks it, calls runMigrations() first, creates/reuses role='client' Bob Smith, deletes any prior Bob assessment before inserting, inserts a status='completed' assessment with normativeVersionId from createOrReuseVersion(), fills sections 1–10 with the report-markers dataKeys above, encrypts ONLY sections 3/4/5, and prints the user id + assessment id + how to view. The script is NOT executed in this environment — the user runs it against dev Postgres.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| staff browser → /api/client-login | authenticated coach/admin submits clientName + email + mode |
| seed script → dev Postgres | operator-run script writes a client user + assessment |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-ine-01 | Elevation of Privilege | POST /api/client-login | mitigate | Existing role gating preserved verbatim: client-role → 403, coach limited to own clients via canAccess(), admin any. Task 1 changes only the email branch + response, not the gate. |
| T-ine-02 | Information Disclosure | welcome email content | accept | Welcome email contains no secret/token — CTA points at the public /login page, not a magic link. Lower disclosure risk than the prior always-magic-link behavior. |
| T-ine-03 | Tampering | seed targeting wrong DB | mitigate | Script guards on DATABASE_URL, prints masked URL, and carries an explicit "DEV only, never prod, cannot run from sandbox" banner. Operator-run, not in CI. |
| T-ine-04 | Information Disclosure | sections 3/4/5 at rest | mitigate | Seed encrypts sections 3/4/5 via encrypt() before insert, matching the route's ENCRYPTED_SECTIONS contract so decrypt-on-read succeeds. |
| T-ine-SC | Tampering | npm/pip/cargo installs | mitigate | No new dependencies are added by any task; nothing to audit. |
</threat_model>

<verification>
Overall (run after all three tasks):
- `npx tsc --noEmit 2>&1 | grep -v 'src/__tests__/'` — no new type errors.
- `npm run build` — production build succeeds.
- No dev server is started; the seed script is NOT executed in this environment.
</verification>

<success_criteria>
- POST /api/client-login accepts `mode`, defaults to 'welcome', sends a branded welcome email (CTA → /login) in welcome mode and the existing magic-link flow in magic-link mode, returns `mode` in the response, and preserves all prior behavior.
- The client-detail Dialog offers two email-valid-gated buttons (welcome + sign-on link) with mode-specific Toasts and no auto-default to magic-link.
- scripts/seed-bob-smith.ts compiles, builds, is idempotent, Postgres-targeting, encrypts sections 3/4/5, and produces a report-complete Bob Smith assessment when the user runs it against dev Postgres.
- `npx tsc --noEmit` (excluding tests) and `npm run build` both pass.
</success_criteria>

<output>
Create `.planning/quick/260527-ine-client-login-and-seed/260527-ine-SUMMARY.md` when done.
</output>
