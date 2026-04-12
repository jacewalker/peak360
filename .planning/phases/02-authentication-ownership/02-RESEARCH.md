# Phase 2: Authentication & Ownership - Research

**Researched:** 2026-04-12
**Domain:** Authentication, RBAC, session management, magic links, email delivery
**Confidence:** HIGH

## Summary

This phase replaces the current shared admin password with a proper user-based authentication system using Better Auth (v1.6.2) with the Drizzle ORM adapter. Better Auth is the locked decision from STATE.md and provides first-class support for the exact feature set needed: email+password authentication, magic link plugin for client passwordless login, admin plugin with custom roles (admin/coach/client), and database-backed sessions with configurable expiry.

The existing auth infrastructure (HMAC session tokens, rate limiting, middleware route protection) will be replaced entirely by Better Auth's built-in equivalents. The current `session.ts`, `rate-limit.ts`, login route, and middleware all get rewritten. The database gains Better Auth's required tables (user, session, account, verification) plus the custom `coach_id`/`client_id` columns on the assessments table.

**Primary recommendation:** Use Better Auth with admin plugin (custom 3-role RBAC), magic link plugin (client auth via SMTP2Go), Drizzle adapter (both SQLite and PostgreSQL), and the `nextCookies` plugin for server action compatibility. Replace current middleware with cookie-based optimistic checks plus server-side `auth.api.getSession()` validation on every protected page and API route.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Coaches invite clients via email link. Coach enters client email in dashboard, system sends an invite via SMTP2Go. Client clicks link to activate their account.
- **D-02:** Clients authenticate via magic link every login -- no passwords for clients. Coach sends initial invite, client requests a login link each subsequent time. Requires reliable email delivery.
- **D-03:** SMTP2Go for all transactional email (magic links, invitations). Already configured in the project's tooling.
- **D-04:** On first login, clients see a simple welcome message then go straight to their assessment list. No profile setup step -- minimal friction.
- **D-05:** Three roles: admin, coach, client. Admin accesses admin-only routes. Coaches manage their own client roster and assessments. Clients view only their own assessments read-only.
- **D-06:** Each coach manages multiple clients via a multi-client dashboard showing client list with assessment status.
- **D-07:** Assessments link to coach_id and client_id. Schema changes are additive (new columns with nullable defaults).
- **D-08:** Existing assessments without ownership continue to work (SAFE-01). Null coach_id/client_id treated as legacy data, accessible by admins.
- **D-09:** Existing HMAC-signed session tokens in `src/lib/auth/session.ts` provide the foundation. Coaches and admins use email+password. Clients use magic links only.
- **D-10:** API routes enforce role-based access independently of middleware (AUTH-05). Both middleware and API handlers check permissions.

### Claude's Discretion
- Auth library choice: Better Auth vs extending current custom auth -- pick whichever integrates cleanest with existing session mechanism and Drizzle ORM
- Magic link token format and expiry duration
- Exact database schema for users/accounts/sessions tables
- Rate limiting strategy for magic link requests
- How to handle the migration from shared admin password to proper admin account

### Deferred Ideas (OUT OF SCOPE)
- Admin panel for normative range and risk threshold management (Phase 3)
- Report marker range visualization and recommendations (Phase 1)
- Password reset via email for coaches
- Two-factor authentication
- OAuth/social login
- Client self-registration

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with email and password using role-based accounts (admin, coach, client) | Better Auth emailAndPassword + admin plugin with custom roles. Clients use magic link instead of password. |
| AUTH-02 | Coach can create and manage their own account | Better Auth sign-up flow (email+password). Admin creates initial admin account via seed script. |
| AUTH-03 | Admin can access admin-only routes that coaches and clients cannot reach | Admin plugin role check + middleware route matching + server-side `auth.api.getSession()` role validation |
| AUTH-04 | Session persists across browser refresh and expires after inactivity | Better Auth database-backed sessions with configurable `expiresIn` and `updateAge` (sliding window) |
| AUTH-05 | API routes reject unauthenticated requests and enforce role-based access independently of middleware | Server-side `auth.api.getSession({ headers })` in every API route handler, independent of middleware cookie check |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.6.2 | Authentication framework | Locked decision (STATE.md). First-class Drizzle adapter, admin/magic-link plugins, database sessions, Next.js integration |
| drizzle-orm | 0.45.1 | Database ORM (already installed) | Existing project stack. Better Auth Drizzle adapter connects directly to existing db instance |
| better-sqlite3 | 12.6.2 | SQLite driver (already installed) | Existing project stack for local dev |
| pg | 8.18.0 | PostgreSQL driver (already installed) | Existing project stack for production |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bcryptjs or built-in | (via better-auth) | Password hashing | Better Auth handles this internally for email+password |
| SMTP2Go | (external service) | Transactional email delivery | Magic link emails, client invitations (D-03) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Extend current HMAC sessions | Current system has no user model, no role system, no magic links. Would require building everything from scratch. Better Auth provides all of these out of the box. |
| Better Auth | Auth.js (NextAuth) | Auth.js has less native Drizzle support, more complex configuration for custom roles, and the admin plugin in Better Auth provides role management features for free. |

**Installation:**
```bash
npm install better-auth
```

No separate adapter package needed -- `better-auth/adapters/drizzle` is included in the main package.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── auth.ts                    # Better Auth server config (replaces session.ts)
│   ├── auth-client.ts             # Better Auth React client
│   ├── auth/
│   │   ├── session.ts             # REMOVE (replaced by Better Auth)
│   │   ├── rate-limit.ts          # REMOVE (Better Auth has built-in rate limiting)
│   │   └── permissions.ts         # Custom role/permission helpers (optional)
│   └── db/
│       ├── schema.ts              # Add user/session/account/verification tables (PG)
│       └── schema-sqlite.ts       # Add user/session/account/verification tables (SQLite)
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts       # Better Auth catch-all handler (replaces login/logout routes)
│   ├── login/
│   │   └── page.tsx               # Updated: email+password form (coach/admin) + magic link request (client)
│   └── portal/
│       ├── admin/                 # Admin-only routes (existing)
│       └── ...
├── middleware.ts                   # Updated: cookie-based optimistic checks + role routing
```

### Pattern 1: Better Auth Server Configuration
**What:** Central auth configuration file
**When to use:** Single source of truth for all auth behavior
**Example:**
```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: process.env.DATABASE_URL ? "pg" : "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh after 1 day (sliding window)
  },
  plugins: [
    admin({
      defaultRole: "coach",
      adminRoles: ["admin"],
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Send via SMTP2Go
        await sendEmailViaSMTP2Go({
          to: email,
          subject: "Your Peak360 Login Link",
          html: `<a href="${url}">Click to sign in</a>`,
        });
      },
      expiresIn: 300, // 5 minutes
    }),
    nextCookies(), // Must be last plugin
  ],
});
```

### Pattern 2: API Route Protection (AUTH-05 Critical)
**What:** Every API route independently validates session and role
**When to use:** All protected API endpoints, independent of middleware
**Example:**
```typescript
// src/app/api/assessments/route.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;

  if (role === "client") {
    // Return only assessments where client_id matches session user
    // ...
  } else if (role === "coach") {
    // Return only assessments where coach_id matches session user
    // ...
  } else if (role === "admin") {
    // Return all assessments
    // ...
  }
}
```

### Pattern 3: Middleware with Optimistic Cookie Check
**What:** Lightweight cookie existence check for UX redirects only
**When to use:** Middleware for fast redirects, NOT as security boundary
**Example:**
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets - pass through
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Portal subdomain redirect (existing logic preserved)
  const hostname = req.headers.get("host")?.split(":")[0] ?? "";
  if (PORTAL_SUBDOMAIN_HOSTNAMES.has(hostname)) {
    // existing redirect logic
  }

  // Public paths - no auth needed
  if (PUBLIC_PATHS.has(pathname) || !pathname.startsWith("/portal")) {
    return NextResponse.next();
  }

  // Optimistic check - cookie exists? (NOT a security check)
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin route guard (optimistic)
  if (pathname.startsWith("/portal/admin")) {
    // Cookie check only - real validation happens in page/API
    // Could decode cookie cache here if enabled
  }

  return NextResponse.next();
}
```

### Pattern 4: Assessment Ownership Schema
**What:** Additive columns on assessments table for coach/client ownership
**When to use:** Schema migration (SAFE-01, SAFE-02 compliance)
**Example:**
```typescript
// Addition to schema.ts (PostgreSQL)
export const assessments = pgTable('assessments', {
  // ... existing columns ...
  coachId: text('coach_id'),     // nullable - legacy assessments have null
  clientId: text('client_id'),   // nullable - legacy assessments have null
});

// Better Auth required tables (generated by `npx auth@latest generate`)
// user, session, account, verification tables
```

### Pattern 5: Magic Link Email via SMTP2Go
**What:** Send magic link emails using SMTP2Go SMTP or API
**When to use:** Client invitation (D-01) and client login (D-02)
**Example:**
```typescript
// src/lib/email/send.ts
export async function sendEmailViaSMTP2Go({
  to, subject, html,
}: { to: string; subject: string; html: string }) {
  const response = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.SMTP2GO_API_KEY,
      to: [to],
      sender: process.env.EMAIL_FROM ?? "noreply@peak360.com.au",
      subject,
      html_body: html,
    }),
  });
  if (!response.ok) {
    throw new Error(`SMTP2Go error: ${response.statusText}`);
  }
}
```

### Anti-Patterns to Avoid
- **Relying on middleware alone for security:** Middleware cookie checks are optimistic UX only. Always validate `auth.api.getSession()` in the actual page/API handler.
- **Storing role in cookie/JWT without server validation:** Better Auth stores role in the database user record. Always read from session (which comes from DB) on protected operations.
- **Custom session management alongside Better Auth:** Remove the existing `session.ts` HMAC implementation entirely. Do not mix two session systems.
- **Hardcoding admin user in code:** Use a seed script or first-run setup to create the admin account in the database.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom HMAC tokens | Better Auth database sessions | Handles expiry, refresh, revocation, multi-device automatically |
| Password hashing | bcrypt wrapper | Better Auth emailAndPassword | Handles salt, rounds, timing-safe comparison internally |
| Magic link tokens | Custom token generation | Better Auth magicLink plugin | Handles token generation, expiry, single-use enforcement, verification |
| Rate limiting (auth) | Custom IP-based limiter | Better Auth built-in | Already handles login attempt limiting per endpoint |
| Role-based access | Custom role middleware | Better Auth admin plugin | Provides role storage, permission checking, user management APIs |
| Cookie management | Manual cookie set/get | Better Auth + nextCookies plugin | Handles HttpOnly, Secure, SameSite, expiry automatically |

**Key insight:** The existing custom auth (~180 lines across 4 files) does what Better Auth does in configuration alone. Replacing rather than extending avoids maintaining two parallel auth systems.

## Common Pitfalls

### Pitfall 1: Middleware as Security Boundary
**What goes wrong:** Developers put auth checks only in middleware, then API routes are unprotected when middleware is bypassed or misconfigured.
**Why it happens:** Middleware feels like the "right place" for auth in Next.js.
**How to avoid:** Middleware does optimistic cookie checks for redirects. Every API route and server page calls `auth.api.getSession()` independently (AUTH-05).
**Warning signs:** API routes that don't check session at all, relying on middleware to have already blocked unauthorized users.

### Pitfall 2: Dual Schema Files Out of Sync
**What goes wrong:** The project has separate `schema.ts` (PostgreSQL) and `schema-sqlite.ts` (SQLite). New auth tables must be added to both.
**Why it happens:** Better Auth's `npx auth@latest generate` generates for one provider only.
**How to avoid:** Generate for PostgreSQL first, then manually create the SQLite equivalent. Test both paths.
**Warning signs:** App works locally (SQLite) but fails in production (PostgreSQL) or vice versa.

### Pitfall 3: Null Ownership Breaking Queries
**What goes wrong:** Queries that filter by `coach_id = currentUserId` miss legacy assessments where `coach_id IS NULL`.
**Why it happens:** Legacy assessments have no ownership (SAFE-01 requires they still work).
**How to avoid:** Admin role query includes `WHERE coach_id = ? OR coach_id IS NULL`. Coach query only returns their own. Explicit handling per role.
**Warning signs:** Assessments "disappear" after migration.

### Pitfall 4: Better Auth Route Conflicts
**What goes wrong:** The catch-all route `api/auth/[...all]/route.ts` conflicts with existing `api/auth/login/route.ts` and `api/auth/logout/route.ts`.
**Why it happens:** Next.js route specificity -- existing specific routes take precedence over catch-all.
**How to avoid:** Remove the existing `login/` and `logout/` route directories entirely. Better Auth handles these via its catch-all handler.
**Warning signs:** Login endpoint returns unexpected responses or 404s.

### Pitfall 5: Database Migration Breaking Existing Data
**What goes wrong:** Running `npx auth@latest migrate` or `drizzle-kit push` could alter existing tables.
**Why it happens:** Better Auth migration may try to modify the existing schema if table names overlap.
**How to avoid:** Use `npx auth@latest generate` to create the schema file, then review it before pushing. Ensure Better Auth tables use its own table names (user, session, account, verification) which don't conflict with existing tables.
**Warning signs:** Existing assessment data corrupted or table structure changed.

### Pitfall 6: SMTP2Go Deliverability in Dev
**What goes wrong:** Magic link emails don't arrive during development or testing.
**Why it happens:** SMTP2Go requires verified sender domains; dev environments may not have API keys configured.
**How to avoid:** Log magic link URLs to console in development mode when SMTP2Go is not configured. Add a fallback that console.logs the URL when `process.env.NODE_ENV === 'development'`.
**Warning signs:** "Magic link sent" message but no email arrives, no error logged.

### Pitfall 7: Next.js 16 Middleware/Proxy Rename
**What goes wrong:** Next.js 16 renamed `middleware.ts` to `proxy.ts` and `middleware()` to `proxy()`.
**Why it happens:** Breaking change in Next.js 16.
**How to avoid:** Check if the project is actually using `middleware.ts` (it is currently). The current file works, so this may not have been enforced yet. Test that `middleware.ts` still works in Next.js 16.1.6 -- it likely does via backwards compatibility. If not, rename to `proxy.ts`.
**Warning signs:** Middleware not executing at all.

## Code Examples

### Better Auth Catch-All Route Handler
```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

### Client-Side Auth Client
```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    magicLinkClient(),
  ],
});
```

### Coach Login (email + password)
```typescript
const { data, error } = await authClient.signIn.email({
  email: "coach@example.com",
  password: "securepassword",
  callbackURL: "/portal",
});
```

### Client Login (magic link)
```typescript
const { data, error } = await authClient.signIn.magicLink({
  email: "client@example.com",
  callbackURL: "/portal",
  newUserCallbackURL: "/portal/welcome",
});
```

### Server-Side Session Check in Page
```typescript
// src/app/portal/page.tsx (server component)
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function PortalPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // session.user.role is "admin" | "coach" | "client"
  // session.user.id is the user ID
  // session.user.email is the email
}
```

### Admin Account Seed Script
```typescript
// scripts/seed-admin.ts
import { auth } from "@/lib/auth";

async function seedAdmin() {
  const existing = await auth.api.getUser({ query: { email: process.env.ADMIN_EMAIL! } });
  if (!existing) {
    await auth.api.createUser({
      body: {
        email: process.env.ADMIN_EMAIL!,
        password: process.env.ADMIN_PASSWORD!,
        name: "Admin",
        role: "admin",
      },
    });
    console.log("Admin account created");
  }
}
```

### Coach Invites Client (API Route)
```typescript
// src/app/api/clients/invite/route.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, name } = await req.json();

  // Create client user account (no password - magic link only)
  const newClient = await auth.api.createUser({
    body: { email, name, role: "client" },
  });

  // Send invitation magic link
  // The magicLink plugin sendMagicLink callback handles email delivery
  // Trigger it via the signIn.magicLink flow or send a custom invite email

  return NextResponse.json({ success: true, clientId: newClient.id });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom HMAC session tokens | Better Auth database sessions | This phase | Sessions persist across restarts, support revocation, multi-device |
| Shared admin password | Per-user email+password (coach/admin) + magic link (client) | This phase | True multi-user system with role-based access |
| Single-role system | Three-role RBAC (admin/coach/client) | This phase | Fine-grained access control per route and data |
| No assessment ownership | coach_id + client_id on assessments | This phase | Data isolation between coaches and clients |

**Deprecated/outdated:**
- `src/lib/auth/session.ts` -- replaced by Better Auth session management
- `src/lib/auth/rate-limit.ts` -- replaced by Better Auth built-in rate limiting
- `src/app/api/auth/login/route.ts` -- replaced by Better Auth catch-all handler
- `src/app/api/auth/logout/route.ts` -- replaced by Better Auth catch-all handler
- `src/app/api/auth/verify-password/route.ts` -- replaced by Better Auth session validation
- `ADMIN_PASSWORD` env var -- replaced by database-stored admin user credentials

## Discretion Recommendations

Based on research, here are recommendations for areas left to Claude's discretion:

### Auth Library: Better Auth (recommended)
Better Auth integrates cleanly with the existing Drizzle ORM setup, provides all required features (email+password, magic links, roles, admin management) as plugins, and has a native Next.js integration. Extending the current custom auth would require building all of these features from scratch.

### Magic Link Token Format and Expiry
Use Better Auth defaults: cryptographically secure random string, 5-minute expiry (300 seconds), single-use (1 allowed attempt). These are secure defaults that work well for the magic link use case.

### Database Schema for Auth Tables
Use `npx auth@latest generate` to auto-generate the required Drizzle schema for user, session, account, and verification tables. This ensures compatibility with Better Auth's expected schema. Add the `role` field (from admin plugin) to the user table. Need separate generation for both PostgreSQL (`schema.ts`) and SQLite (`schema-sqlite.ts`).

### Rate Limiting Strategy
Better Auth has built-in rate limiting. For magic link requests specifically, the existing `sendMagicLink` callback can add a simple cooldown check (e.g., 60-second gap between requests to the same email) via a lightweight in-memory or DB-based check. The existing `checkRateLimit` logic pattern can inform this, but Better Auth's built-in handling should be sufficient for most cases.

### Migration from Shared Admin Password
1. Create a seed script (`scripts/seed-admin.ts`) that creates an admin user in the database using `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars.
2. Run the seed script once during deployment.
3. Remove the old `ADMIN_PASSWORD` env var usage from middleware and API routes.
4. The old login route files (`login/`, `logout/`, `verify-password/`) get deleted and replaced by Better Auth's catch-all handler.

## Open Questions

1. **Next.js 16 middleware vs proxy naming**
   - What we know: Next.js 16 docs suggest renaming `middleware.ts` to `proxy.ts`. The current codebase uses `middleware.ts` and it works on Next.js 16.1.6.
   - What's unclear: Whether `middleware.ts` is deprecated or just renamed with backwards compatibility.
   - Recommendation: Keep `middleware.ts` if it works. If it stops working, rename to `proxy.ts`. Test during implementation.

2. **Better Auth + dual SQLite/PostgreSQL schema**
   - What we know: Better Auth Drizzle adapter takes a `provider` option ("sqlite" or "pg"). The project has two separate schema files.
   - What's unclear: Whether `npx auth@latest generate` can produce both schema formats, or if one must be manually adapted.
   - Recommendation: Generate for PostgreSQL, manually create SQLite equivalent. This matches the project's existing pattern.

3. **Client account creation flow**
   - What we know: Coaches invite clients (D-01). Better Auth admin plugin has `createUser` API. Magic link plugin can sign in new users automatically.
   - What's unclear: Whether `createUser` (admin API) creates a user without sending any email, allowing the invitation email to be a separate step.
   - Recommendation: Create user via admin API (role: "client"), then trigger magic link send as the invitation. If `createUser` sends a verification email by default, disable email verification for magic-link-only users.

## Sources

### Primary (HIGH confidence)
- [Better Auth Installation](https://better-auth.com/docs/installation) - Server config, client setup, route handler
- [Better Auth Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle) - Adapter config, schema generation, provider options
- [Better Auth Magic Link Plugin](https://better-auth.com/docs/plugins/magic-link) - Plugin config, sendMagicLink callback, sign-in flow
- [Better Auth Admin Plugin](https://better-auth.com/docs/plugins/admin) - Role management, user CRUD, permission checking
- [Better Auth Session Management](https://better-auth.com/docs/concepts/session-management) - Session config, cookie caching, expiry
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next) - Route handler, middleware, server-side getSession

### Secondary (MEDIUM confidence)
- [npm registry](https://www.npmjs.com/package/better-auth) - Version 1.6.2 confirmed current
- Existing codebase analysis: `src/lib/auth/session.ts`, `src/middleware.ts`, `src/lib/db/schema.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Better Auth is a locked decision, verified current version, official docs reviewed
- Architecture: HIGH - Better Auth Next.js integration is well-documented, patterns verified from official docs
- Pitfalls: HIGH - Based on direct codebase analysis (dual schema, existing routes, middleware) and official docs warnings about middleware security
- Magic link + SMTP2Go: MEDIUM - SMTP2Go API integration is straightforward but the exact interaction between Better Auth's createUser and magic link invitation flow needs validation during implementation

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable ecosystem, Better Auth 1.x)
