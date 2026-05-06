---
phase: quick-260506-snj
plan: 01
subsystem: infra
tags: [nextjs, middleware, edge-runtime, web-crypto, hmac, landing-page, auth-gate]

# Dependency graph
requires:
  - phase: portal-session-validation
    provides: existing middleware structure with portal subdomain redirect, better-auth pass-through, and PUBLIC_PATHS handling
provides:
  - Promoted v2 landing prototype to be the site's primary landing at /
  - Single-password landing gate (Web Crypto HMAC) running at the Edge
  - /gate password form themed with landing.css tokens
  - POST /api/landing-gate Edge handler with constant-time compare and open-redirect guard
  - .env.example documentation for LANDING_PASSWORD + LANDING_GATE_SECRET
affects: [marketing, deployment, do-app-platform]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge-runtime gating via Web Crypto HMAC (no node:crypto)"
    - "Server-component layout owns global stylesheets, client page consumes them"
    - "Fail-open in dev / fail-closed in prod for missing security secrets"

key-files:
  created:
    - src/lib/landing-gate.ts
    - src/app/gate/page.tsx
    - src/app/api/landing-gate/route.ts
    - public/landing/peak360-logo.png (renamed from public/v2/)
    - public/landing/peak360-logo-light.png (renamed from public/v2/)
    - src/app/landing.css (renamed from src/app/v2/v2.css)
  modified:
    - src/app/page.tsx (replaced coming-soon with promoted v2 landing)
    - src/app/layout.tsx (import landing.css, hoist Google Fonts, update metadata)
    - src/middleware.ts (insert landing-gate check)
    - .env.example (document LANDING_PASSWORD + LANDING_GATE_SECRET)

key-decisions:
  - "Used git mv for logos and v2.css to preserve git history"
  - "Hoisted Inter Tight + JetBrains Mono fonts into root layout <head> instead of a per-route layout"
  - "Imported landing.css from server-component layout because client pages cannot own global CSS"
  - "Did NOT rename middleware.ts → proxy.ts (deferred per plan known_constraints)"
  - "Edge runtime for /api/landing-gate so the helper's Web Crypto path matches middleware"
  - "Fail-open in dev, fail-closed in prod when LANDING_GATE_SECRET is unset (deployer notices)"

patterns-established:
  - "Edge-safe crypto helpers: prefer crypto.subtle + base64url over node:crypto"
  - "Open-redirect guard: only allow next params starting with single / (reject //, /\\)"
  - "Constant-time string compare via XOR-OR with longer-of-two loop length"

requirements-completed: [QUICK-260506-snj]

# Metrics
duration: ~12 min
completed: 2026-05-06
---

# Phase quick-260506-snj: Promote v2 landing + password gate Summary

**Replaced the coming-soon homepage with the v2 landing prototype, then put the entire public surface behind an Edge-runtime HMAC password gate at /gate.**

## Performance

- **Duration:** ~12 min (from worktree base reset to final commit)
- **Started:** 2026-05-06T10:36:00Z (approx)
- **Completed:** 2026-05-06T10:48:00Z
- **Tasks:** 3
- **Files modified:** 9 (2 modified, 3 created, 3 renamed via git mv, 2 deleted from src/app/v2/)

## Accomplishments
- /v2 directory removed; the v2 landing now lives at /
- Logos relocated to /landing/, history preserved via `git mv`
- Google Fonts (Inter Tight + JetBrains Mono) hoisted to root layout
- Edge-runtime password gate signing 30-day HMAC cookies
- Themed /gate password form (landing.css tokens, robots: noindex)
- /api/landing-gate POST handler with constant-time compare, open-redirect guard, fail-closed-in-prod 500 when env unset
- Middleware extended to gate non-exempt paths; portal/admin/api/auth all bypass cleanly

## Task Commits

1. **Task 1: Promote v2 landing to / and delete /v2** — `35b359d` (feat)
2. **Task 2: landing-gate helper, /gate page, /api/landing-gate route** — `1d0fafa` (feat)
3. **Task 3: middleware gate check + .env.example docs** — `8720867` (feat)

_Plan metadata + STATE/SUMMARY commit handled by orchestrator._

## Files Created/Modified

**Created:**
- `src/lib/landing-gate.ts` — Web Crypto HMAC sign/verify, GATE_COOKIE_NAME constant, base64url codec, constant-time byte compare. No node:crypto.
- `src/app/gate/page.tsx` — Server-rendered themed password form, robots: noindex, inline scoped styles for the centered card.
- `src/app/api/landing-gate/route.ts` — Edge POST handler. Constant-time password compare → sign cookie → 303 redirect to safe next; otherwise 303 to /gate?error=1.

**Renamed (`git mv`, history preserved):**
- `public/v2/peak360-logo.png` → `public/landing/peak360-logo.png`
- `public/v2/peak360-logo-light.png` → `public/landing/peak360-logo-light.png`
- `src/app/v2/v2.css` → `src/app/landing.css` (CSS classes still scoped to `.v2-root` per plan)

**Modified:**
- `src/app/page.tsx` — Replaced wholesale with v2 page contents. LOGO_SRC updated to `/landing/peak360-logo.png`. Default export renamed `V2LandingPage` → `LandingPage`. Removed obsolete `montserrat`/`openSans`/`next/link`/`next/image` imports.
- `src/app/layout.tsx` — Added `import './landing.css'`, hoisted three Google Fonts links into `<head>`, replaced metadata with v2 title/description.
- `src/middleware.ts` — Added gate import + `isGateExempt` helper + gate block between portal-subdomain redirect and better-auth bypass. All existing branches preserved.
- `.env.example` — Appended LANDING_PASSWORD and LANDING_GATE_SECRET sections with the doctl-secrets caveat.

**Deleted:**
- `src/app/v2/page.tsx`, `src/app/v2/layout.tsx` (entire `src/app/v2/` directory removed)
- `public/v2/` directory removed (rmdir after `git mv`)

## Decisions Made

- **`git mv` for logos and v2.css:** preserves history so `git log --follow` works post-merge.
- **landing.css scoped to `.v2-root`:** kept the wrapper class name unchanged for this task to minimize diff and avoid breaking selectors. Wrapper rename is a follow-up.
- **Fonts in root `<head>`:** v2 had its own per-route layout; consolidating into the root layout means future pages can also use Inter Tight without a new layout.
- **Edge runtime for /api/landing-gate:** matches the middleware's runtime characteristics so the same Web Crypto path runs on both sides.
- **`isGateExempt` simplified:** plan's `GATE_EXEMPT_PREFIXES.some(p => p.endsWith('/') && pathname.startsWith(p))` filter would have silently dropped `/login` and `/gate` from the prefix array (they don't end in `/`). Moved equality checks for `/login` and `/gate` to the explicit branch above and dropped the unused `endsWith('/')` filter. Functional behavior is identical.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Simplified isGateExempt prefix filter**
- **Found during:** Task 3 (middleware extension)
- **Issue:** The plan's `GATE_EXEMPT_PREFIXES` array included `/login` and `/gate` alongside `/api/`, `/portal/`, `/admin/`, but the `.some()` filter `p.endsWith('/') && pathname.startsWith(p)` would have silently dropped `/login` and `/gate` (they don't end in `/`). Those two were already covered by the equality check above, so the prefix-array entries were dead code.
- **Fix:** Removed `/login` and `/gate` from `GATE_EXEMPT_PREFIXES`; removed the `endsWith('/')` filter. Equality check for `/login`/`/gate` retained above. Behavior identical to the plan's stated intent.
- **Files modified:** `src/middleware.ts`
- **Verification:** All gate-exempt paths still bypass; build succeeds.
- **Committed in:** `8720867` (Task 3 commit)

**2. [Rule 2 - Defensive] Wrapped HMAC + base64url decode in try/catch in verifyGateToken**
- **Found during:** Task 2 (landing-gate helper)
- **Issue:** A malformed cookie (e.g. tampered base64url with non-decodable characters) would throw out of `atob`/`crypto.subtle`, surfacing as a 500 in middleware. For a verify function, malformed input should return `false`, not throw.
- **Fix:** Wrapped the `await hmac(...)` and `base64urlDecode(sig)` calls in try/catch returning `false` on any throw.
- **Files modified:** `src/lib/landing-gate.ts`
- **Verification:** tsc clean, build clean.
- **Committed in:** `1d0fafa` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 defensive correctness)
**Impact on plan:** Both deviations preserve the plan's stated intent and improve robustness. No scope creep. middleware.ts NOT renamed to proxy.ts (deferred per plan known_constraints).

## Issues Encountered

- TypeScript `tsc --noEmit` reports pre-existing errors in `src/__tests__/` (vitest globals not declared, fixtures with `Record<string, unknown>` cast errors). These are unrelated to this task and existed before the worktree was reset to the base commit. Logged as out-of-scope per the constraint document; not fixed.
- `npm run build` emits two warnings about `BETTER_AUTH_SECRET` and Better Auth base URL during static generation. These are pre-existing build-time warnings (the existing `/portal` flow already triggers them) and the build still succeeds. Not introduced by this task.

## Build Verification

`npx next build` (run after all three tasks) compiled successfully. Route table confirms:
- `/` is `○ (Static)` — promoted v2 landing
- `/gate` is `ƒ (Dynamic)` — gate password form (server component with searchParams)
- `/api/landing-gate` is `ƒ (Dynamic)` — Edge POST handler
- `/v2` no longer present in the route table
- `ƒ Proxy (Middleware)` line confirms middleware bundles for Edge (would fail if landing-gate.ts pulled node:crypto)

Build output for the three new/changed routes:
```
├ ○ /
├ ƒ /api/landing-gate
├ ƒ /gate
ƒ Proxy (Middleware)
```

## Deployment Notes

Before merging this branch to main on production:

1. **Set `LANDING_PASSWORD`** via the DigitalOcean App Platform UI (Settings → App-Level Environment Variables → Add SECRET). DO NOT use `doctl apps update --spec` — per saved memory `feedback_doctl_spec_secrets.md`, that command silently empties existing SECRETs whose value field is stripped.
2. **Set `LANDING_GATE_SECRET`** the same way. Generate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **What happens if the secrets are missing in production:** every non-exempt path (currently only `/`) redirects to `/gate`, the gate page loads, but submitting the form returns a 500 with the error `Landing gate not configured`. This is intentional fail-closed behavior so the misconfiguration is visible to anyone hitting the homepage.
4. **What happens with secrets correctly set:** `/` → 307 to `/gate?next=%2F` for unauthenticated visitors → submit correct password → cookie set, redirect to `/`, landing renders. Cookie persists 30 days.

## Suggested Follow-ups

- Rename `src/middleware.ts` → `src/middleware/proxy.ts` (deferred per plan known_constraints).
- Rename the `.v2-root` wrapper class in `landing.css` to `.landing-root` (and update `src/app/page.tsx` + `src/app/gate/page.tsx`) once the team is comfortable with a CSS-class diff.
- Wire a real "Logout of gate" link if the team wants to clear the cookie without DevTools.
- Add rate limiting to `/api/landing-gate` (currently unbounded; brute-force resistance relies entirely on password entropy and HMAC).
- Replace the inline `<style>` block in `gate/page.tsx` with a proper `.gate-*` block in `landing.css` if the gate UI grows.

## User Setup Required

**External services require manual configuration before merge.** See "Deployment Notes" above:
- `LANDING_PASSWORD` (SECRET) — set via DigitalOcean App Platform UI.
- `LANDING_GATE_SECRET` (SECRET) — 32-byte hex, set via DigitalOcean App Platform UI.

## Self-Check

Verifying claims in this summary before handing off to orchestrator…

**Files:**
- `src/lib/landing-gate.ts` — FOUND
- `src/app/gate/page.tsx` — FOUND
- `src/app/api/landing-gate/route.ts` — FOUND
- `public/landing/peak360-logo.png` — FOUND
- `public/landing/peak360-logo-light.png` — FOUND
- `src/app/landing.css` — FOUND
- `src/app/v2/` — ABSENT (intentional)
- `public/v2/` — ABSENT (intentional)

**Commits:**
- `35b359d` (Task 1) — FOUND in git log
- `1d0fafa` (Task 2) — FOUND in git log
- `8720867` (Task 3) — FOUND in git log

## Self-Check: PASSED

---
*Phase: quick-260506-snj*
*Completed: 2026-05-06*
