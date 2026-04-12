---
phase: 02-authentication-ownership
plan: 02
subsystem: auth
tags: [better-auth, middleware, rbac, magic-link, session-validation]

# Dependency graph
requires:
  - phase: 02-authentication-ownership/01
    provides: Better Auth server config, auth-client, user/session/account tables, coachId/clientId columns
provides:
  - Better Auth cookie-based middleware route protection
  - Session-validated API routes with role-based data filtering
  - Admin-only normative route protection (AUTH-03)
  - Client read-only enforcement on assessment mutations
  - Login page with email+password and magic link authentication modes
  - Shared auth-helpers module (requireSession, requireAdmin)
affects: [02-authentication-ownership/03, portal-pages, client-portal]

# Tech tracking
tech-stack:
  added: []
  patterns: [requireSession/requireAdmin tuple pattern, hasAccess ownership check]

key-files:
  created:
    - src/lib/auth-helpers.ts
  modified:
    - src/middleware.ts
    - src/app/api/assessments/route.ts
    - src/app/api/assessments/[id]/route.ts
    - src/app/api/assessments/[id]/sections/[num]/route.ts
    - src/app/api/admin/normative/route.ts
    - src/app/api/admin/normative/[marker]/route.ts
    - src/app/login/page.tsx

key-decisions:
  - "Shared auth-helpers module with tuple return pattern [session, errorResponse] for clean early-return"
  - "hasAccess helper duplicated in route files rather than shared (simple, avoids import complexity)"
  - "Login page preserves existing dark gradient visual design while adding dual-mode auth"

patterns-established:
  - "requireSession(): returns [session, null] | [null, NextResponse] for clean auth guard pattern"
  - "requireAdmin(): composes requireSession + role check for admin-only routes"
  - "hasAccess(role, userId, assessment): ownership check for assessment-level access control"

requirements-completed: [AUTH-03, AUTH-05]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 02 Plan 02: Middleware & Route Protection Summary

**Better Auth cookie-based middleware with role-based API route protection and dual-mode login page (email+password for coaches, magic link for clients)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-12T05:41:10Z
- **Completed:** 2026-04-12T05:46:14Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Middleware rewrites to use Better Auth getSessionCookie for optimistic route protection on /portal/* and /api/* paths
- All assessment API routes validate sessions server-side and filter data by role (admin=all, coach=own, client=own)
- Admin normative routes (GET/PUT/DELETE) protected with admin-only role check returning 403 for non-admins
- Client role enforced as strictly read-only (403 on PUT/DELETE for assessments and sections)
- Login page rebuilt with coach/admin email+password, coach self-registration, and client magic link modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite middleware, protect all API routes** - `71922a9` (feat)
2. **Task 2: Rebuild login page with dual auth modes** - `daabff2` (feat)

## Files Created/Modified
- `src/lib/auth-helpers.ts` - Shared session validation helpers (requireSession, requireAdmin)
- `src/middleware.ts` - Better Auth cookie-based optimistic route protection
- `src/app/api/assessments/route.ts` - Session-validated CRUD with role-based filtering and coach ownership
- `src/app/api/assessments/[id]/route.ts` - Session-validated GET/PUT/DELETE with ownership checks
- `src/app/api/assessments/[id]/sections/[num]/route.ts` - Session-validated section access with client read-only enforcement
- `src/app/api/admin/normative/route.ts` - Admin-only normative data listing
- `src/app/api/admin/normative/[marker]/route.ts` - Admin-only per-marker normative CRUD
- `src/app/login/page.tsx` - Dual-mode login page (email+password and magic link)

## Decisions Made
- Created shared `auth-helpers.ts` with tuple return pattern `[session, null] | [null, NextResponse]` for ergonomic early-return auth guards
- Duplicated `hasAccess` helper in assessment route files rather than sharing (keeps each route self-contained)
- Preserved the existing dark gradient visual design for the login page while adding dual-mode auth tabs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created shared auth-helpers module**
- **Found during:** Task 1
- **Issue:** Plan specified adding auth imports inline to each route file, leading to significant duplication
- **Fix:** Created `src/lib/auth-helpers.ts` with `requireSession()` and `requireAdmin()` helpers
- **Files modified:** src/lib/auth-helpers.ts
- **Verification:** All routes use shared helpers, TypeScript compiles cleanly
- **Committed in:** 71922a9

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Reduced code duplication across 6 route files. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required (env vars were set up in Plan 01).

## Next Phase Readiness
- Auth security layer complete: middleware, API routes, and login page all functional
- Ready for Plan 03: client portal views and assessment sharing
- Coach self-registration and magic link email sending depend on SMTP2Go being configured (env vars from Plan 01)

---
*Phase: 02-authentication-ownership*
*Completed: 2026-04-12*
