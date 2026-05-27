---
phase: quick-260527-ine
verified: 2026-05-27T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Welcome email path — no magic link in console"
    expected: "In dev (no SMTP2GO_API_KEY set), clicking 'Create account + welcome email' logs a branded HTML email to the dev-server console whose CTA URL is ${BETTER_AUTH_URL}/login (e.g. http://localhost:8080/login), NOT a /api/auth/magic-link URL."
    why_human: "Cannot inspect runtime console output or SMTP2Go delivery in a static grep scan."
  - test: "Magic-link path still fires signInMagicLink"
    expected: "Clicking 'Create account + send sign-on link' triggers the Better Auth magic-link flow (visible as a different console email or a /api/auth/magic-link token in logs)."
    why_human: "Runtime behaviour of the auth.api.signInMagicLink branch is not verifiable statically."
  - test: "Both buttons disabled until email is syntactically valid"
    expected: "With an empty or malformed email field, both action buttons appear visually disabled (opacity-40) and clicking them has no effect."
    why_human: "UI disabled-state rendering requires a browser."
  - test: "Toast reflects mode and created status"
    expected: "Four variants render correctly in the UI: 'Account created — welcome email sent to …', 'Welcome email sent to …', 'Account created — sign-on link sent to …', 'Sign-on link sent to …'."
    why_human: "Toast text is constructed at runtime from the API response; requires a live interaction to confirm all four paths."
---

# Quick Task 260527-ine: Client-Login Mode + Bob Smith Seed — Verification Report

**Goal:** (A) /api/client-login gains mode 'welcome'|'magic-link' — default 'welcome' sends a branded welcome email (NO magic link), 'magic-link' keeps existing signInMagicLink; client page has two buttons; all existing client-login logic preserved. (B) scripts/seed-bob-smith.ts is an idempotent Postgres-only seed creating a Bob Smith client + one completed assessment with realistic data, encrypting sections 3/4/5; never executed here.
**Verified:** 2026-05-27
**Status:** human_needed (all automated checks pass; runtime email-path and UI behaviour need human confirmation)
**Commits verified:** 6a1cc18, 5afcfe6, a608ba9 — all present in git log.

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/client-login defaults to 'welcome' when body.mode is absent or invalid (never auto-sends a magic link) | VERIFIED | Line 119–120: `const mode = body?.mode === 'magic-link' ? 'magic-link' : 'welcome'` — anything other than the exact string `'magic-link'` falls to `'welcome'`. |
| 2 | Welcome branch sends renderBrandedEmail with CTA → /login and does NOT call signInMagicLink | VERIFIED | Lines 238–255: `else` branch (mode !== 'magic-link') calls `sendEmailViaSMTP2Go({ html: renderBrandedEmail({ ctaUrl: \`${baseUrl}/login\` }) })`. `signInMagicLink` is only called inside `if (mode === 'magic-link')` (line 215). |
| 3 | magic-link branch calls signInMagicLink as before | VERIFIED | Lines 215–237: `if (mode === 'magic-link')` calls `auth.api.signInMagicLink({ body: { email, callbackURL: '/portal' }, headers: await headers() })` with original catch/fallback inline email preserved verbatim. |
| 4 | Response includes mode | VERIFIED | Line 257: `return NextResponse.json({ success: true, created, linkedCount, mode })` |
| 5 | All pre-existing client-login behavior preserved | VERIFIED | Full route audit: requireSession (line 77), role-client 403 (lines 86–99), clientName validation (lines 102–104), email validation (lines 106–114), canAccess (lines 123–134), create-or-resend lookup (lines 137–195), tryUpgradePlaceholderByName (lines 146–153), assessment linking (lines 198–207). None of these blocks were altered. |
| 6 | UI: two buttons, both disabled until email valid, each posts correct mode; Toast reflects which | VERIFIED | Lines 527–540: two buttons rendered — secondary (`onClick={() => handleSendLogin('magic-link')}`) and primary gold (`onClick={() => handleSendLogin('welcome')}`). Both share `disabled={!loginEmailValid || loginSending}`. handleSendLogin (lines 229–261) passes `mode` in POST body and builds mode-specific toast text covering all four cases (welcome+created, welcome+existing, magic-link+created, magic-link+existing). |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/app/api/client-login/route.ts` | VERIFIED | File exists, substantive (259 lines), imports `renderBrandedEmail` from `@/lib/email/template` (value import, not type), `sendEmailViaSMTP2Go` from `@/lib/email/send`. Mode branch is wired. |
| `src/app/portal/clients/[name]/page.tsx` | VERIFIED | File exists, substantive (553 lines), Dialog with two action buttons, `handleSendLogin(mode)` POSTs `{ clientName, email, mode }` to `/api/client-login`. |
| `scripts/seed-bob-smith.ts` | VERIFIED | File exists, 289 lines. Contains `createOrReuseVersion`, `encrypt(`, DATABASE_URL guard, DEV-only comment block. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `clients/[name]/page.tsx` | `/api/client-login` | `fetch POST with { clientName, email, mode }` | VERIFIED | Line 234–238: `fetch('/api/client-login', { method: 'POST', body: JSON.stringify({ clientName, email, mode }) })` |
| `route.ts` | `renderBrandedEmail` | welcome-mode email body | VERIFIED | Line 5 import, line 243 call-site inside `else` branch |
| `seed-bob-smith.ts` | `assessment_sections` | `encrypt()` for sections 3/4/5, plain JSON otherwise | VERIFIED | Lines 265–275: `const ENCRYPTED = new Set([3,4,5]); const stored = ENCRYPTED.has(n) ? encrypt(json) : json;` then inserted via `db.insert(schema.assessmentSections)` |

---

## Seed Detailed Checks

### Idempotency
Lines 109–119: queries `assessments` where `clientId = bobId AND clientEmail = BOB_EMAIL`, deletes each match before inserting new one. Re-run will never produce duplicate Bob assessments.

### User creation
Lines 50–77: queries `user` by BOB_EMAIL; creates with `auth.api.createUser({ role: 'client' as 'user' | 'admin' })` only if absent. Re-run reuses existing Bob user.

### Assessment fields
`status: 'completed'`, `currentSection: 11`, `normativeVersionId` from `createOrReuseVersion()`, `coachId` from coach→admin→any-non-Bob fallback chain (lines 81–104), `clientId: bobId`. All required.

### Section dataKey audit against report-markers.ts

All seed dataKeys cross-checked against `REPORT_MARKERS`:

| Section | Seed keys | Report-markers dataKeys | Match |
|---------|-----------|------------------------|-------|
| 5 | cholesterolTotal, ldl, hdl, triglycerides, glucose, hba1c, hsCRP, vitaminD, uricAcid, serumIron, ferritin, totalTestosterone, freeTestosterone, oestradiol, shbg, dheas, fsh, lh, hemoglobin, rbc, hematocrit, creatinine, egfr, alt, ast, ggt | Identical (all hasNorms:true markers for section 5 present) | PASS |
| 6 | bwi, bodyFatPercentage, waistToHipRatio, leanMass, skeletalMuscleMass, fatMass, visceralFatRating, bmr | Identical | PASS |
| 7 | vo2max, restingHR, bpSystolic, bpDiastolic | Identical | PASS |
| 8 | gripStrengthLeft/Right, cmjLeft/Right, imtpMaxForce, singleLegHopLeft/Right, singleLegBalanceLeft/Right, shoulderIsoYLeft/Right, pushupsMax, deadManHang, farmersCarryDistance | Identical | PASS |
| 9 | hipMobilityLeft/Right, overheadReachLeft/Right, shoulderMobilityLeft/Right, ankleDorsiflexionLeft/Right | Identical | PASS |
| 1 | includes `clientAge: 41` | Required by load-report-data + client page for age-bucketed ratings | PASS |

No wrong dataKey found. No report marker will yield a blank field due to a key mismatch.

### Encryption contract
`encrypt()` from `src/lib/crypto.ts` degrades gracefully when `ENCRYPTION_KEY` is unset (returns plaintext), which matches the seed's warning. The `isEncrypted()` guard in `decrypt()` handles plaintext stored values. Sections 3, 4, 5 pass through `encrypt()`; sections 1, 2, 6, 7, 8, 9, 10 are stored as raw JSON strings. Contract honored.

### Not wired to run anywhere
`grep` over package.json, all .ts/.tsx/.js/.mjs files, and .github (none exists) finds no reference to `seed-bob-smith` outside the script file itself and the planning directory. Not in any npm script. VERIFIED.

---

## TypeScript Verification

`npx tsc --noEmit 2>&1 | grep -v 'src/__tests__/'` — reports no errors in `client-login/route.ts`, `clients/[name]/page.tsx`, or `scripts/seed-bob-smith.ts`. (Confirmed by direct tsc run.)

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `route.ts` line 228–235 | Inline fallback HTML email in the magic-link catch block | Info | Pre-existing behavior, preserved verbatim as required. Not introduced by this task. |

No TBD/FIXME/XXX/TODO markers introduced in any of the three files.

---

## Human Verification Required

### 1. Welcome email — no magic link in dev console

**Test:** Start dev server (`npm run dev` on port 8080). Sign in as admin. Open any client detail page, click "Client login", enter a test email, click "Create account + welcome email".
**Expected:** Dev-server console logs an HTML email whose CTA URL is `http://localhost:8080/login` (or `BETTER_AUTH_URL/login`). No `/api/auth/magic-link` token appears in the log.
**Why human:** Runtime email content and the absence of a magic-link call cannot be verified statically.

### 2. Magic-link path fires signInMagicLink

**Test:** Same dialog, click "Create account + send sign-on link".
**Expected:** Dev-server console logs a Better Auth magic-link email (or the auth library confirms a token was generated). CTA URL is a one-time sign-in token, not the plain `/login` page.
**Why human:** Runtime invocation of `auth.api.signInMagicLink` is not inspectable via static analysis.

### 3. Both buttons disabled when email is invalid

**Test:** Open the Dialog with an empty email field or a malformed string (e.g. "notanemail").
**Expected:** Both "Create account + welcome email" and "Create account + send sign-on link" buttons are visually disabled (dimmed, not clickable).
**Why human:** CSS disabled-state and pointer-event suppression require a live browser to confirm.

### 4. Toast text covers all four variants

**Test:** Exercise each combination: (a) new email + welcome, (b) existing email + welcome, (c) new email + sign-on, (d) existing email + sign-on.
**Expected:** Toasts read exactly: (a) "Account created — welcome email sent to …", (b) "Welcome email sent to …", (c) "Account created — sign-on link sent to …", (d) "Sign-on link sent to …".
**Why human:** Dynamic toast text is constructed from the API response at runtime; all four paths need live confirmation.

---

_Verified: 2026-05-27_
_Verifier: Claude (gsd-verifier)_
