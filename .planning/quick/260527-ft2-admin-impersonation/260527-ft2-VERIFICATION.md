---
phase: quick-260527-ft2
verified: 2026-05-27T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Start impersonating (desktop): log in as admin, go to /portal/admin/users, confirm 'Log in as' appears on coach + client rows but NOT on admin rows or the admin's own row. Click it on a coach or client."
    expected: "You land on /portal rendered as that user. A gold sticky banner reads 'Viewing as {name} ({role})'."
    why_human: "Session cookie rotation and redirect behavior requires a live browser session; cannot be verified by static code analysis alone."
  - test: "While impersonating, verify the 'Log in as' action is absent from all rows on /portal/admin/users."
    expected: "No 'Log in as' buttons visible anywhere while the gold banner is showing."
    why_human: "Client-side session state (isImpersonating derived from sessionData.session.impersonatedBy) only resolves in a live browser."
  - test: "Click 'Return to your admin account' in the impersonation banner."
    expected: "Button shows 'Returning…' while the call is in flight, then you land on /portal/admin/users as your original admin self and the gold banner is gone."
    why_human: "stopImpersonating() triggers a session cookie swap; router.push behavior only verifiable in a running session."
  - test: "Mobile (viewport <768px): confirm 'Log in as' appears in the mobile card action group on coach + client rows, is absent on admin rows and own row, and the impersonation banner wraps gracefully."
    expected: "Mobile card shows the 'Log in as' pill button styled consistently with 'Reset password'. Banner text wraps gracefully at narrow widths."
    why_human: "Responsive layout rendering requires a browser viewport."
  - test: "(Optional) Failure path: simulate an impersonate call failure (network offline or 403) and confirm the error Toast appears and the admin stays on /portal/admin/users."
    expected: "Toast variant='error' with message 'Couldn't switch to that user. Try again.' appears. No navigation occurs."
    why_human: "Requires simulating a network or auth error in a live browser session."
---

# Quick Task 260527-ft2: Admin Impersonation — Verification Report

**Task Goal:** An admin can "Log in as" a coach or client from /portal/admin/users (desktop + mobile rows; not on admin rows, not on their own row, hidden when already impersonating) — which switches their session via authClient.admin.impersonateUser and redirects to /portal. A persistent gold banner appears whenever session.session.impersonatedBy is set, showing who is being viewed as, with a "Return to your admin account" button that calls authClient.admin.stopImpersonating() and returns to /portal/admin/users.

**Verified:** 2026-05-27
**Status:** human_needed (all automated checks pass; 5 UAT items remain)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin sees "Log in as" on coach + client rows (desktop + mobile) but never on admin rows nor their own row | VERIFIED | `showImpersonate = canImpersonate && u.role !== 'admin' && u.id !== currentUserId` computed identically in both the desktop `<Fragment>` loop (line 1175–1176) and the mobile card loop (line 1292–1293); `canImpersonate` is `userRole === 'admin' && !isImpersonating` |
| 2 | "Log in as" calls authClient.admin.impersonateUser({ userId }) and redirects to /portal on success | VERIFIED | `handleImpersonate` at line 379–400 calls `authClient.admin.impersonateUser({ userId })` with exactly that shape, then `router.push('/portal'); router.refresh()` on success |
| 3 | While impersonating, a persistent gold banner appears across the whole portal | VERIFIED | `portal/layout.tsx` reads `impersonatedBy` via local cast at lines 24–26, renders `<ImpersonationBanner name={session.user.name} role={session.user.role} />` only when truthy (lines 32–37); banner is `sticky top-0 z-40 bg-gold-brand` |
| 4 | "Return to your admin account" button restores admin session and lands on /portal/admin/users | VERIFIED | `ImpersonationBanner.tsx` line 28: `authClient.admin.stopImpersonating()` with no args; line 34–35: `router.push('/portal/admin/users'); router.refresh()` on success |
| 5 | "Log in as" is hidden entirely when the session is already an impersonation (no nested impersonation) | VERIFIED | `isImpersonating = Boolean((sessionData?.session as {...})?.impersonatedBy)` at lines 51–54; all 5 UserTable call sites pass `canImpersonate={userRole === 'admin' && !isImpersonating}`, so `canImpersonate` is false (and `showImpersonate` is therefore false) while impersonating |
| 6 | On impersonate failure an error Toast appears and admin stays on the People page | VERIFIED | `handleImpersonate` has both `if (error) { setToast({ variant: 'error', ... }); return; }` and a `catch` block that also calls `setToast`; no `router.push` on the failure paths |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/portal/ImpersonationBanner.tsx` | 'use client' banner with stopImpersonating(), min 30 lines | VERIFIED | 60 lines; `'use client'` on line 1; `stopImpersonating()` on line 28; sticky gold strip with loading state and inline error |
| `src/app/portal/layout.tsx` | Server layout reading impersonatedBy, rendering ImpersonationBanner | VERIFIED | No `'use client'` directive (remains server component); imports ImpersonationBanner; reads `impersonatedBy` via local cast; conditional render |
| `src/app/portal/admin/users/page.tsx` | "Log in as" in desktop + mobile, gated by role + self + active-impersonation | VERIFIED | `showImpersonate` predicate present in both desktop (line 1175) and mobile (line 1292) render paths; action wired to `onImpersonate(u.id)` in both |
| `src/lib/audit.ts` | Optional: AuditAction union reservation (or skipped) | VERIFIED | `'user.impersonation.started'` added at line 22 with deferral comment; no caller, no route, no schema change |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `admin/users/page.tsx` | `authClient.admin.impersonateUser` | `onClick` handler passing `{ userId: u.id }` | WIRED | Line 382: `authClient.admin.impersonateUser({ userId })` — exact shape matches confirmed better-auth signature |
| `portal/layout.tsx` | `ImpersonationBanner.tsx` | Conditional render when `session.session.impersonatedBy` is set | WIRED | Lines 24–37: local cast extracts `impersonatedBy`, renders `<ImpersonationBanner>` only when truthy |
| `ImpersonationBanner.tsx` | `authClient.admin.stopImpersonating` | `onClick` handler on return button | WIRED | Line 28: `authClient.admin.stopImpersonating()` with no arguments — matches confirmed signature |

---

## Security-Critical Predicate Analysis

**Three-condition gate for "Log in as" visibility — all three conditions verified in both paths:**

The predicate `showImpersonate = canImpersonate && u.role !== 'admin' && u.id !== currentUserId` is computed independently in BOTH the desktop table loop (line 1175–1176) and the mobile card loop (line 1292–1293).

- **Admin rows excluded:** `u.role !== 'admin'` — explicit role check on the target row
- **Own row excluded:** `u.id !== currentUserId` — `currentUserId = sessionData?.user?.id` (line 55)
- **Active impersonation excluded:** `canImpersonate` is `userRole === 'admin' && !isImpersonating` — when `isImpersonating` is true, `canImpersonate` is false, so `showImpersonate` is false for every row

`canImpersonate` is passed identically at all 5 UserTable call sites (lines 638, 665, 700, 726, 751).

**No nested impersonation path exists:** the predicate is evaluated on client-side session state, but since `isImpersonating` reads `sessionData.session.impersonatedBy` (the live session), any attempt to reach the People page while impersonating will result in `canImpersonate = false` and no "Log in as" buttons rendered.

---

## Server/Client Boundary

- `portal/layout.tsx`: no `'use client'` directive — confirmed server component. Only serializable props (`name: string`, `role: string`) cross to `ImpersonationBanner`.
- `ImpersonationBanner.tsx`: `'use client'` on line 1. Imports `useRouter` and `authClient` client-side only. No server imports.
- The local cast `(session.session as { impersonatedBy?: string | null }).impersonatedBy` is performed server-side in the layout; the result is read as a boolean condition — nothing non-serializable is passed to the banner.

---

## API Call Shape Verification

- `impersonateUser({ userId })`: called as `authClient.admin.impersonateUser({ userId })` where `userId` is the string parameter passed to `handleImpersonate`. Matches the confirmed better-auth signature `impersonateUser({ userId: string })`.
- `stopImpersonating()`: called as `authClient.admin.stopImpersonating()` with no arguments. Matches the confirmed better-auth signature.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No `TBD`, `FIXME`, `XXX`, empty implementations, or hardcoded stub data found in the modified files.

---

## Task 3 (Optional) Status

`'user.impersonation.started'` added to `AuditAction` union in `src/lib/audit.ts` at line 22 with a deferral comment explaining there is no caller yet (Better Auth's own endpoint handles the actual impersonation start). No route, no hook, no schema change. TypeScript union reserved for future server-side wiring only.

---

## Human Verification Required

### 1. Impersonation start and banner appearance (desktop)

**Test:** Log in as admin at /portal/admin/users. Confirm "Log in as" appears on coach + client rows and is absent on admin rows and the admin's own row. Click "Log in as" on a coach or client.
**Expected:** You land on /portal rendered as that user. A gold sticky banner reads "Viewing as {name} ({role})".
**Why human:** Session cookie rotation and redirect behavior require a live browser session.

### 2. "Log in as" absent while already impersonating

**Test:** While the impersonation banner is visible, navigate to /portal/admin/users and inspect every row.
**Expected:** No "Log in as" buttons appear anywhere.
**Why human:** `isImpersonating` derives from live session state; only verifiable in a running browser session.

### 3. Return to admin account

**Test:** While impersonating, click "Return to your admin account" in the gold banner.
**Expected:** Button shows "Returning…" during the call, then you land on /portal/admin/users as the original admin. The gold banner is gone.
**Why human:** stopImpersonating() triggers a session cookie swap; router.push result only verifiable in a live browser.

### 4. Mobile layout

**Test:** Repeat the impersonation start and return flow at a viewport width below 768px.
**Expected:** "Log in as" appears as a pill button in the mobile card action group (same row as "Reset password"). The gold banner text wraps gracefully at narrow widths.
**Why human:** Responsive CSS rendering requires a browser viewport.

### 5. Failure path (optional)

**Test:** Simulate an impersonate call failure (network offline or deliberately revoke the admin role) and click "Log in as".
**Expected:** An error Toast appears with "Couldn't switch to that user. Try again." The admin remains on /portal/admin/users.
**Why human:** Requires simulating a network or auth error in a live browser session.

---

_Verified: 2026-05-27_
_Verifier: Claude (gsd-verifier)_
