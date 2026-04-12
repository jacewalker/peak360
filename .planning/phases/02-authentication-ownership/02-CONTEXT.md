# Phase 2: Authentication & Ownership - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Secure role-based authentication (admin, coach, client) replacing the current shared admin password. Coaches can log in, manage clients, and create assessments linked to specific clients. Clients receive magic link invitations and can log in to view their own assessments read-only. Every assessment gets ownership (coach_id, client_id). Existing assessments without ownership continue to work.

</domain>

<decisions>
## Implementation Decisions

### Client Invitation Flow
- **D-01:** Coaches invite clients via email link. Coach enters client email in dashboard, system sends an invite via SMTP2Go. Client clicks link to activate their account.
- **D-02:** Clients authenticate via magic link every login — no passwords for clients. Coach sends initial invite, client requests a login link each subsequent time. Requires reliable email delivery.
- **D-03:** SMTP2Go for all transactional email (magic links, invitations). Already configured in the project's tooling.
- **D-04:** On first login, clients see a simple welcome message then go straight to their assessment list. No profile setup step — minimal friction.

### Role Model
- **D-05:** Three roles: admin, coach, client. Admin accesses admin-only routes. Coaches manage their own client roster and assessments. Clients view only their own assessments read-only.
- **D-06:** Each coach manages multiple clients via a multi-client dashboard showing client list with assessment status.

### Assessment Ownership
- **D-07:** Assessments link to coach_id and client_id. Schema changes are additive (new columns with nullable defaults).
- **D-08:** Existing assessments without ownership continue to work (SAFE-01). Null coach_id/client_id treated as legacy data, accessible by admins.

### Auth Infrastructure
- **D-09:** Existing HMAC-signed session tokens in `src/lib/auth/session.ts` provide the foundation. Coaches and admins use email+password. Clients use magic links only.
- **D-10:** API routes enforce role-based access independently of middleware (AUTH-05). Both middleware and API handlers check permissions.

### Claude's Discretion
- Auth library choice: Better Auth vs extending current custom auth — pick whichever integrates cleanest with existing session mechanism and Drizzle ORM
- Magic link token format and expiry duration
- Exact database schema for users/accounts/sessions tables
- Rate limiting strategy for magic link requests
- How to handle the migration from shared admin password to proper admin account

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth System (existing)
- `src/lib/auth/session.ts` — Current HMAC-signed session token implementation
- `src/lib/auth/rate-limit.ts` — Rate limiting (5 attempts/15min per IP)
- `src/app/api/auth/login/route.ts` — Current login endpoint (shared password)
- `src/app/api/auth/logout/route.ts` — Current logout endpoint

### Middleware & Routing
- `src/middleware.ts` — Route protection, portal redirect, public route list
- `src/app/(portal)/layout.tsx` — Portal layout wrapper

### Database
- `src/lib/db/schema.ts` — Current Drizzle schema (no user tables yet)
- `src/lib/db/index.ts` — Database connection and query layer

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-05, CLNT-01 through CLNT-04, DASH-01 through DASH-04, SAFE-01, SAFE-02

### Research (from project setup)
- `.planning/codebase/ARCHITECTURE.md` — Current system architecture
- `.planning/codebase/CONVENTIONS.md` — Code style and patterns to follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/auth/session.ts`: HMAC-signed tokens with timing-safe comparison — foundation for extended auth
- `src/lib/auth/rate-limit.ts`: IP-based rate limiting — reusable for magic link requests
- `src/middleware.ts`: Already protects `/portal/*` routes and lists public paths — extend with role checks
- Login/logout API routes: Structure exists, needs user-based auth instead of shared password

### Established Patterns
- Session cookies: HttpOnly, Secure, SameSite=strict — maintain for all auth types
- API response format: `NextResponse.json({ success: boolean, data?, error? })`
- Drizzle ORM with SQLite: All schema in `src/lib/db/schema.ts`, additive migrations via `db:push`
- Path-based routing: `/portal/*` for protected, `/` for public landing

### Integration Points
- `assessments` table needs `coach_id` and `client_id` columns (nullable for backwards compat)
- New `users` table (or similar) for email, role, password_hash (coaches/admins), magic link tokens (clients)
- Middleware needs role-aware route protection (admin routes, coach routes, client routes)
- Dashboard page needs to filter assessments by logged-in coach
- Client portal needs to filter assessments by logged-in client

</code_context>

<specifics>
## Specific Ideas

- Magic links for clients — zero-password experience, coach handles the relationship
- SMTP2Go for email delivery — already in project tooling
- Welcome + assessment list on first client login — no onboarding friction

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Admin panel for normative range and risk threshold management** — Phase 3 scope
- **Report marker range visualization and recommendations** — Phase 1 scope

### Future Considerations
- Password reset via email for coaches (requires email infrastructure — now available via SMTP2Go)
- Two-factor authentication — future security enhancement
- OAuth/social login — out of scope per REQUIREMENTS.md
- Client self-registration — clients are invited by coaches only

</deferred>

---

*Phase: 02-authentication-ownership*
*Context gathered: 2026-04-12*
