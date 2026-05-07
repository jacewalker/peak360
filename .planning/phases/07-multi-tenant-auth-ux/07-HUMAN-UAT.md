---
status: partial
phase: 07-multi-tenant-auth-ux
source: [07-VERIFICATION.md]
started: 2026-05-07T17:18:00Z
updated: 2026-05-07T17:18:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Client magic-link login end-to-end (REQ-7.1 production path)
expected: With NODE_ENV=production, /login Client mode "Send sign-in link" → email arrives → click delivers user to /portal authenticated as client.
why_human: Requires live SMTP2Go delivery and email-client interaction.
result: [pending]

### 2. Password reset email delivery (REQ-7.8)
expected: Forgot password → email with /reset-password?token=... arrives → submitting new 8-char password allows immediate sign-in.
why_human: Requires live SMTP2Go; token is time-bounded.
result: [pending]

### 3. Sidebar logout session invalidation (BL-03 verification)
expected: Log in as coach, click Logout, press browser back → does NOT re-enter portal; redirected to /login because session cookie is cleared.
why_human: Browser cookie behavior + back-button interaction must be observed in a live browser.
result: [pending]

### 4. /portal/assessment/[id]/report SSR ownership gate (BL-05 verification)
expected: As client A, request /portal/assessment/{client-B-id}/report → 3xx redirect to /portal observed in DevTools BEFORE any HTML chrome / Download PDF button is sent.
why_human: Server-side redirect timing and the absence of page-shell HTML must be observed in a real browser session.
result: [pending]

### 5. Admin grouped dashboard visual ordering (REQ-7.4)
expected: Logged in as admin with one self-owned + one other-coach-owned assessment, /portal renders "My clients (you)" first with gold border, then other coach's section below with navy border.
why_human: Requires seeded multi-coach data and visual inspection of card ordering / colors.
result: [pending]

### 6. Last-admin guard concurrent demotion (BL-02 atomic transaction verification)
expected: With two admin users A and B, simultaneously POST /api/admin/users/{B}/role → coach from A's session AND POST /api/admin/users/{A}/role → coach from B's session: exactly one succeeds; the loser receives 400 "Cannot change the role of the only admin". Final admin count is exactly 1.
why_human: Concurrency race must be exercised against a live server with two active admin sessions; static-source assertions cannot prove transactional isolation behavior.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
