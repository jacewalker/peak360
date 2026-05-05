---
phase: 04-security-client-portal
verified: 2026-04-13T18:20:00Z
status: gaps_found
score: 6/8 must-haves verified
re_verification: false
gaps:
  - truth: "An audit log records who accessed what assessment data and when, viewable by admins"
    status: failed
    reason: "GET /api/admin/audit-logs has no requireAdmin call — any authenticated user can read all audit logs. The plan required requireAdmin but the implementation omitted it, a deviation documented in 04-03-SUMMARY.md under blocking deviation #2."
    artifacts:
      - path: "src/app/api/admin/audit-logs/route.ts"
        issue: "Missing requireAdmin guard — route is accessible to any authenticated session, not admin-only"
    missing:
      - "Add requireAdmin() call at the top of the GET handler, return 403 if not admin"

  - truth: "An audit log records who accessed what assessment data and when, viewable by admins"
    status: failed
    reason: "The admin audit-log browser UI at /admin/audit-logs is not protected by middleware (middleware only guards /portal/* paths). A non-admin user who navigates directly to /admin/audit-logs will see the page."
    artifacts:
      - path: "src/app/admin/audit-logs/page.tsx"
        issue: "Route /admin/audit-logs is outside the /portal/* prefix that middleware guards. No layout-level or page-level auth check exists."
    missing:
      - "Either move admin UI under /portal/admin/audit-logs (middleware covers /portal/*), or add a client-side auth redirect in the page, or add /admin to middleware protected paths"
human_verification:
  - test: "Confirm encrypted data is opaque in the database"
    expected: "sqlite3 local.db \"SELECT data FROM assessment_sections WHERE section_number=5\" shows base64 ciphertext, not readable JSON, when ENCRYPTION_KEY is set"
    why_human: "Cannot inspect live SQLite state programmatically without running the app with a real key"
  - test: "Confirm decrypted data renders correctly in Section 11 report"
    expected: "Blood test values appear correctly in the longevity report after being written and read back via encrypt/decrypt cycle"
    why_human: "Requires end-to-end browser test with actual section 5 data"
  - test: "Confirm backup scheduler starts on boot"
    expected: "Server logs show '[backup] Scheduler started (0 2 * * *)' on first DB access after app start"
    why_human: "Requires running the dev server and observing startup logs"
---

# Phase 4: Security & Client Portal Verification Report

**Phase Goal:** Sensitive health data is encrypted at rest with audit trails and automated backups
**Verified:** 2026-04-13T18:20:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Blood test/medical screening data encrypted at rest using AES-256-GCM; raw data not visible in DB | ? HUMAN NEEDED | crypto.ts verified correct; sections 3,4,5 encrypted on write — DB state requires human check |
| 2 | Audit log records who accessed what and when, viewable by admins | PARTIAL | Logging wired correctly; API endpoint missing requireAdmin guard; UI route unprotected |
| 3 | Automated SQLite backups run on schedule with point-in-time recovery | VERIFIED | backup.ts + scheduler wired into runMigrations(); 7 tests pass |
| 4 | Application continues to function correctly with encrypted data | ? HUMAN NEEDED | Code path correct (encrypt on write, decrypt on read); requires browser-level E2E to confirm |

**Score:** 6/8 must-haves verified (see detail below)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/crypto.ts` | encrypt(), decrypt(), isEncrypted() via AES-256-GCM | VERIFIED | All three functions exported; AES-256-GCM with 12-byte random IV; graceful degradation without key |
| `src/lib/crypto.test.ts` | Unit tests for crypto module | VERIFIED | 8 tests, all pass |
| `src/lib/backup.ts` | runBackup(), startBackupScheduler() | VERIFIED | Both exported; 30-day retention; double-start guard; 7 tests pass |
| `src/lib/backup.test.ts` | Unit tests for backup module | VERIFIED | 7 tests, all pass |
| `src/app/api/admin/backup/route.ts` | POST endpoint, admin-only | VERIFIED | requireAdmin present; returns filename |
| `src/lib/audit.ts` | logAuditEvent(), getRequestContext(), AuditAction type | VERIFIED | All exported; try/catch swallows failures; fire-and-forget |
| `src/app/api/admin/audit-logs/route.ts` | GET with pagination and filtering, admin-only | STUB | GET exists with pagination/filtering — but requireAdmin is MISSING. Any authenticated user can read audit logs. |
| `src/app/admin/audit-logs/page.tsx` | Admin audit log browser with table, filters, pagination | ORPHANED | Page exists and is substantive (267 lines, full UI) — but route is at /admin/* which middleware does NOT protect. Effectively unguarded. |
| `scripts/encrypt-existing.ts` | Migration script for existing unencrypted data | VERIFIED | Exists; covers sections 3,4,5 + uploaded_files + signatures in a transaction |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sections/[num]/route.ts` | `src/lib/crypto.ts` | `import { encrypt, decrypt }` + ENCRYPTED_SECTIONS | WIRED | encrypt on PUT for sections 3,4,5; decrypt on GET; confirmed in source |
| `ai/extract/route.ts` | `src/lib/crypto.ts` | `import { encrypt }` + `encrypt(JSON.stringify(extracted))` | WIRED | Line 198 of extract route confirms encryption before DB write |
| `sections/[num]/route.ts` | `src/lib/audit.ts` | `logAuditEvent` calls for GET and PUT | WIRED | assessment.view on GET (line 59), section.edit on PUT (line 146) |
| `ai/extract/route.ts` | `src/lib/audit.ts` | `logAuditEvent` after successful extraction | WIRED | file.upload logged at line 202 |
| `admin/audit-logs/route.ts` | `requireAdmin` | Admin-only guard | NOT WIRED | requireAdmin import and call are absent — the GET handler has no auth check at all |
| `admin/audit-logs/page.tsx` | `/api/admin/audit-logs` | `fetch('/api/admin/audit-logs?...')` | WIRED | fetch call present at line 76 |
| `src/lib/db/index.ts` | `src/lib/backup.ts` | `startBackupScheduler()` at end of runMigrations() | WIRED | Lines 385-386 confirm require() + call |
| `admin/backup/route.ts` | `src/lib/backup.ts` | `import { runBackup }` | WIRED | requireAdmin present; runBackup called in try/catch |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `audit-logs/page.tsx` | `logs` state | `fetch('/api/admin/audit-logs')` → `db.select().from(auditLogs)` | Yes — Drizzle query against auditLogs table | FLOWING |
| `sections/[num]/route.ts` GET | `data` returned | `db.select()` → `decrypt()` → `JSON.parse()` | Yes — DB read + decryption | FLOWING |
| `sections/[num]/route.ts` PUT | `dataToStore` | `encrypt(JSON.stringify(body.data))` → `db.update/insert` | Yes — encryption + DB write | FLOWING |
| `ai/extract/route.ts` | `extractedData` | `encrypt(JSON.stringify(extracted))` → `db.update` | Yes — GPT-4o extraction + encryption + DB write | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Crypto: 8 tests pass | `npx vitest run src/lib/crypto.test.ts` | 8/8 pass | PASS |
| Backup: 7 tests pass | `npx vitest run src/lib/backup.test.ts` | 7/7 pass | PASS |
| AES-256-GCM used | `grep 'aes-256-gcm' src/lib/crypto.ts` | Found on line 3 | PASS |
| ENCRYPTED_SECTIONS includes 3,4,5 | `grep 'ENCRYPTED_SECTIONS' sections/route.ts` | `new Set([3, 4, 5])` | PASS |
| requireAdmin absent in audit-logs API | `grep 'requireAdmin' src/app/api/admin/audit-logs/route.ts` | No matches | FAIL |
| Backup scheduler wired | `grep 'startBackupScheduler' src/lib/db/index.ts` | Lines 385-386 | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SECU-01 | 04-01-PLAN.md | AES-256-GCM encryption at rest for sensitive fields | SATISFIED | crypto.ts implements AES-256-GCM; sections 3,4,5 + AI extractions encrypted on write, decrypted on read; 8 tests pass |
| SECU-02 | 04-03-PLAN.md | Audit log recording who accessed what data and when | PARTIAL | logAuditEvent() wired in all required routes; audit_logs table in schema; admin UI exists — but the "viewable by admins" part is broken: GET /api/admin/audit-logs has no requireAdmin guard |
| SECU-03 | 04-02-PLAN.md | Automated SQLite backup with point-in-time recovery | SATISFIED | backup.ts uses better-sqlite3 .backup() API; daily cron via node-cron; scheduler starts in runMigrations(); 30-day retention; admin POST endpoint; 7 tests pass |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/admin/audit-logs/route.ts` | 6 (GET handler start) | Missing `requireAdmin` guard — no auth check present | BLOCKER | Any authenticated user (coach, client) can call GET /api/admin/audit-logs and read the full audit trail including access patterns of all users |
| `src/app/admin/audit-logs/page.tsx` | entire file | Route `/admin/*` outside middleware protection scope | BLOCKER | Middleware at `src/middleware.ts` line 43 only passes through non-portal, non-API paths without any auth check. The /admin/* prefix gets no session validation. |
| `src/app/api/ai/extract/route.ts` | 207 | `userId: 'admin'` hardcoded string instead of session.user.id | WARNING | Audit logs for file uploads record 'admin' regardless of who performed the upload. Noted as intentional deviation in SUMMARY but reduces auditability. |

---

## Human Verification Required

### 1. Database Encryption Opaqueness

**Test:** Set ENCRYPTION_KEY, create/edit a Section 5 assessment with blood test values, then run `sqlite3 local.db "SELECT data FROM assessment_sections WHERE section_number=5 LIMIT 1"`.
**Expected:** Value is a base64 string starting with a character other than `{` or `[` — not readable JSON.
**Why human:** Cannot inspect live SQLite state without running the app with a real key configured.

### 2. Transparent Decrypt in Section 11 Report

**Test:** After the above, navigate to Section 11 (Complete Longevity Analysis) of the same assessment. Verify blood markers render with correct values.
**Expected:** Blood test ratings appear correctly — decrypt is transparent to the UI.
**Why human:** Requires end-to-end browser test.

### 3. Backup Scheduler Startup Log

**Test:** Start the dev server (`npm run dev`) and observe the console output.
**Expected:** Logs include `[backup] Scheduler started (0 2 * * *)` on first request (which triggers runMigrations).
**Why human:** Requires running the server and reading stdout.

---

## Gaps Summary

Two blockers prevent full goal achievement for SECU-02 ("viewable by admins"):

**Gap 1 — API missing auth guard:** The GET handler in `src/app/api/admin/audit-logs/route.ts` has no `requireAdmin()` call. This is a direct deviation from the plan specification and an anti-pattern against AUTH-03 (every API route must independently validate auth). The route returns full audit log data to any session holder regardless of role.

**Gap 2 — UI route unprotected by middleware:** The audit log browser lives at `/admin/audit-logs` which falls into the middleware's "non-portal, non-API" passthrough branch (line 43 of `src/middleware.ts`). Unlike `/portal/admin/*` routes which require a session cookie, `/admin/*` routes get no auth check. The plan intended the page to be at `/portal/admin/audit-logs` but the implementor placed it at `/admin/audit-logs` as a deviation — and the middleware was not updated to protect the new path.

These two gaps together mean the audit log is functionally write-only with respect to admin access control: logs are being written correctly, but the "viewable by admins" criterion is not enforced at either the API or UI layer.

SECU-01 and SECU-03 are fully satisfied. SECU-02 is partially satisfied — the logging pipeline works, only the access control on the viewing endpoint and UI is missing.

---

_Verified: 2026-04-13T18:20:00Z_
_Verifier: Claude (gsd-verifier)_
