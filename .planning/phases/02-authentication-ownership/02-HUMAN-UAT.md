---
status: partial
phase: 02-authentication-ownership
source: [02-VERIFICATION.md]
started: 2026-04-12T06:16:00Z
updated: 2026-04-12T06:16:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Coach login and assessment filtering
expected: Coach logs in with email+password, dashboard loads showing only assessments where coach_id matches the logged-in user's ID
result: [pending]

### 2. Admin route enforcement
expected: Admin logs in and hits /api/admin/normative → 200 response; same URL with coach session → 403
result: [pending]

### 3. Coach sends client invite
expected: Client account created in DB with role=client; invite email logged to console (dev) or sent via SMTP2Go (prod)
result: [pending]

### 4. Client magic link login and welcome banner
expected: Client clicks magic link, lands on /portal, sees welcome banner on first visit; banner disappears after clicking 'View My Assessments'
result: [pending]

### 5. Client cross-isolation
expected: GET /api/assessments returns only assessments where client_id = logged-in client; GET /api/assessments/[other-id] returns 403
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
