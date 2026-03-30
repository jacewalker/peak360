# Technology Stack

**Project:** Peak360 Milestone 1 (Auth, Admin, Encryption, Visualizations)
**Researched:** 2026-03-29

## Existing Stack (Unchanged)

These are already in place and must not change. New additions must integrate with them.

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 16.1.6 | Full-stack framework (App Router) |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Drizzle ORM | 0.45.1 | Database queries and schema |
| better-sqlite3 | 12.6.2 | SQLite driver (dev/local) |
| pg | 8.18.0 | PostgreSQL driver (production) |
| Zustand | 5.0.11 | Client state management |
| Recharts | 3.8.0 | Data visualization (already installed) |
| Vitest | 4.0.18 | Unit testing |

## Recommended Additions

### Authentication: Better Auth 1.5.6

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| better-auth | 1.5.6 | Auth framework with credentials, RBAC, admin plugin | HIGH |

**Why Better Auth over Auth.js (NextAuth v5):**

1. **Built-in RBAC** -- Better Auth ships an admin plugin with role management, user banning, impersonation, and granular permissions out of the box. Auth.js has no built-in RBAC; you build it yourself.
2. **Credentials done right** -- Better Auth's credentials provider includes password policies, rate limiting, and account lockout. Auth.js credentials require you to implement all security measures manually.
3. **First-class Drizzle adapter** -- The `@better-auth/drizzle-adapter` (v1.5.6, bundled) supports SQLite and PostgreSQL natively, matching our dual-database setup.
4. **Next.js 16 support** -- Better Auth supports Next.js 16's proxy.ts (replacing middleware.ts) with `toNextJsHandler` for route handlers and the `nextCookies` plugin for Server Actions.
5. **Auth.js is now maintained by the Better Auth team** -- The ecosystem is consolidating around Better Auth as the primary solution.
6. **Built-in password hashing** -- Uses @noble/hashes (Argon2id-compatible) so no separate hashing library needed.

**Integration approach:**
- Route handler at `/api/auth/[...all]/route.ts` using `toNextJsHandler`
- Drizzle adapter configured with existing `better-sqlite3` (dev) or `pg` (prod) connection
- Admin plugin enabled for coach role management
- Two roles: `coach` (full CRUD) and `client` (read-only on own assessments)
- Session validation in page/route level, not in proxy (per Better Auth recommendations)

**What NOT to use:**
- **Auth.js / NextAuth v5** -- Still in beta, no built-in RBAC, credentials provider is intentionally limited. The team behind it has shifted focus to Better Auth.
- **Clerk / Auth0 / WorkOS** -- Third-party SaaS auth adds external dependency, cost, and latency for a self-hosted health platform that handles sensitive data. Keep auth in-house.
- **Lucia** -- Deprecated as of March 2025. The author now recommends rolling your own or using Better Auth.

### Encryption: Application-Level AES-256-GCM (Node.js crypto)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Node.js `crypto` (built-in) | N/A | AES-256-GCM field-level encryption | HIGH |

**Why application-level encryption with Node.js crypto, not SQLCipher:**

1. **Field-level granularity** -- Only sensitive fields (blood results, medical history, signatures) need encryption. Full-database encryption via SQLCipher is overkill and adds native dependency complexity.
2. **Zero additional dependencies** -- `crypto` is built into Node.js. No native compilation issues, no prebuilt binary compatibility concerns.
3. **Works with both SQLite and PostgreSQL** -- Encrypted fields are stored as base64 strings in TEXT columns. Database-agnostic, preserving the dual-DB setup.
4. **Simpler than SQLCipher integration** -- `better-sqlite3-multiple-ciphers` (v12.8.0) is a fork that would replace `better-sqlite3` and requires different compilation. It also doesn't encrypt PostgreSQL, breaking the dual-DB pattern.

**Implementation approach:**
- Utility module at `src/lib/encryption/` with `encrypt(plaintext, key)` and `decrypt(ciphertext, key)` functions
- AES-256-GCM with random 12-byte IV per encryption, authentication tag stored alongside ciphertext
- Encryption key from `ENCRYPTION_KEY` environment variable (32-byte hex string)
- Encrypt on write in API routes, decrypt on read
- Fields to encrypt: `assessment_sections.data` (contains blood results, medical screening), `signatures.signature_data`, `uploaded_files.extracted_data`
- Non-sensitive fields (client_name, assessment_date, section_number) remain unencrypted for querying

**What NOT to use:**
- **better-sqlite3-multiple-ciphers** -- Replaces better-sqlite3, requires native compilation, encrypts entire DB (including non-sensitive data), incompatible with PostgreSQL path.
- **Third-party encryption libraries (node-forge, tweetnacl)** -- Node.js crypto is sufficient and maintained by the Node.js team. No reason to add a dependency.

### Admin Panel: Custom-built with existing stack

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| (No new library) | N/A | Build admin UI with existing React + Tailwind | HIGH |

**Why custom, not a framework like React Admin or Refine:**

1. **Small scope** -- The admin panel manages normative ranges and thresholds. This is a handful of CRUD pages (list thresholds, edit threshold, preview rating), not a general-purpose dashboard.
2. **Existing patterns** -- The project already has form components (FormField, SelectField, SliderField), layout components (Header), and Tailwind styling. A framework would introduce conflicting patterns.
3. **Better Auth admin plugin** -- User management (list users, assign roles, ban) comes from Better Auth's admin API, not a separate admin framework.
4. **Recharts already installed** -- For any admin dashboard visualizations, Recharts 3.8.0 is already in the project.

**Implementation approach:**
- Admin routes at `/admin/` protected by Better Auth role check (coach role required)
- `/admin/normative-ranges` -- CRUD for normative thresholds (moved from hardcoded `data.ts` to DB)
- `/admin/users` -- User management via Better Auth admin plugin API
- Reuse existing form components; add a data table component for listing/filtering
- Server Components for data fetching, Client Components only for interactive forms

**What NOT to use:**
- **React Admin / Refine** -- Heavy frameworks designed for large admin dashboards. Our admin panel is 3-4 pages. The integration overhead exceeds the time saved.
- **Shadcn/ui admin templates** -- Tempting, but introducing shadcn/ui alongside existing Tailwind components creates two competing component systems. Stick with what exists.

### Range Visualizations: Recharts (already installed)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Recharts | 3.8.0 (existing) | Gauge bars, range indicators for biomarker reports | HIGH |

**Why stick with Recharts for range visualizations:**

1. **Already installed** -- Recharts 3.8.0 is in `package.json` and used for dashboard trends.
2. **RadialBarChart for gauges** -- Recharts' `RadialBarChart` with `endAngle` creates semicircular gauge arcs. Combined with `Label` for center text, this handles the "where does this value fall in the range" visualization.
3. **Custom shapes** -- Recharts supports custom shape renderers for bars, allowing color-coded 5-tier range bars (poor/cautious/normal/great/elite segments).
4. **React 19 compatible** -- Recharts 3.x is built for React 18/19.

**Implementation approach:**
- Range gauge component: `RadialBarChart` with 180-degree arc showing current value position within the 5-tier range
- Horizontal range bar: Custom `BarChart` with stacked colored segments for each tier, marker for current value
- Both components accept the same normative data structure from `src/lib/normative/data.ts`
- Color mapping from existing `TIER_COLORS` in `src/types/normative.ts`

**What NOT to use:**
- **D3.js directly** -- Too low-level for what Recharts already handles. Would require significant custom code for React integration.
- **Chart.js / react-chartjs-2** -- Adding a second charting library when Recharts is already installed and sufficient.
- **Nivo** -- Excellent library but no reason to replace a working Recharts setup for this use case.

### Password Hashing: Handled by Better Auth

Better Auth uses `@noble/hashes` internally for password hashing. No separate bcrypt or argon2 package needed.

**If custom hashing is ever needed separately:**
- Use `argon2` (v0.44.0) -- OWASP 2026 recommendation, Argon2id variant
- Do NOT use bcrypt for new code -- not memory-hard, more vulnerable to GPU attacks

### Data Table (Admin): TanStack Table

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @tanstack/react-table | 8.x | Sortable/filterable tables for admin normative range management | MEDIUM |

**Why TanStack Table:**
- Headless (no styling conflicts with Tailwind)
- Sorting, filtering, pagination built-in
- Widely used with React 19
- Lightweight -- only adds the logic, you control the UI

**This is optional** -- if the normative ranges list is simple enough (under 50 items visible at once), a plain HTML table with manual sorting is fine. Add TanStack Table only when complexity warrants it.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Better Auth | Auth.js v5 (NextAuth) | No RBAC, credentials limited, perpetual beta |
| Auth | Better Auth | Clerk/Auth0 | SaaS dependency, cost, health data leaves your server |
| Auth | Better Auth | Lucia | Deprecated March 2025 |
| Encryption | Node.js crypto | better-sqlite3-multiple-ciphers | Full-DB encryption overkill, breaks dual-DB, native dep complexity |
| Encryption | Node.js crypto | node-forge | Unnecessary dependency when built-in crypto suffices |
| Admin UI | Custom + existing stack | React Admin/Refine | Heavy framework for 3-4 CRUD pages |
| Admin UI | Custom + existing stack | shadcn/ui | Introduces competing component system |
| Visualization | Recharts (existing) | D3.js | Too low-level, already have Recharts |
| Visualization | Recharts (existing) | Chart.js | Second charting library unnecessary |
| Tables | TanStack Table (optional) | AG Grid | Enterprise complexity for a simple admin list |

## Installation

```bash
# Auth
npm install better-auth

# Data table (optional, add when needed)
npm install @tanstack/react-table

# No other new dependencies required:
# - Encryption: Node.js crypto (built-in)
# - Visualization: Recharts (already installed)
# - Admin UI: Existing components
```

## Dev Dependencies

```bash
# Types for Better Auth are included in the package
# No additional dev dependencies needed
```

## Environment Variables (New)

```bash
# .env.local additions
BETTER_AUTH_SECRET=       # 32+ char random string for session signing
BETTER_AUTH_URL=          # http://localhost:3000 (dev) or production URL
ENCRYPTION_KEY=           # 64-char hex string (32 bytes for AES-256)
```

## Schema Changes Required

Better Auth with Drizzle adapter needs these tables added to the existing schema:
- `user` -- id, name, email, emailVerified, image, role, banned, banExpires
- `session` -- id, userId, token, expiresAt, ipAddress, userAgent
- `account` -- id, userId, providerId, accountId, accessToken, refreshToken, etc.
- `verification` -- id, identifier, value, expiresAt

Plus a new application table:
- `normative_ranges` -- id, marker_key, gender, age_min, age_max, tier, min_value, max_value, updated_by, updated_at

## Confidence Assessment

| Decision | Confidence | Reasoning |
|----------|------------|-----------|
| Better Auth for auth | HIGH | Verified: v1.5.6 on npm, official Drizzle+SQLite adapter, admin plugin with RBAC, Next.js integration docs, Auth.js team now maintains it |
| Node.js crypto for encryption | HIGH | Built-in module, well-documented AES-256-GCM pattern, no dependency risk |
| Custom admin panel | HIGH | Scope is small (3-4 pages), existing components sufficient, adding a framework would complicate the codebase |
| Recharts for gauges | HIGH | Already installed (v3.8.0), RadialBarChart supports gauge patterns, React 19 compatible |
| TanStack Table | MEDIUM | Good choice if needed, but may be premature -- evaluate during implementation |

## Sources

- [Better Auth official docs](https://better-auth.com/docs/installation)
- [Better Auth admin plugin](https://better-auth.com/docs/plugins/admin)
- [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Auth.js Drizzle adapter (SQLite)](https://authjs.dev/reference/drizzle-adapter/lib/sqlite)
- [Auth.js now part of Better Auth discussion](https://github.com/nextauthjs/next-auth/discussions/13252)
- [Better Auth vs Auth.js comparison](https://www.wisp.blog/blog/authjs-vs-betterauth-for-nextjs-a-comprehensive-comparison)
- [better-sqlite3-multiple-ciphers on npm](https://www.npmjs.com/package/better-sqlite3-multiple-ciphers)
- [Node.js AES-256-GCM example](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81)
- [Recharts RadialBarChart docs](https://recharts.github.io/en-US/examples/SimpleRadialBarChart/)
- [Password hashing guide 2025/2026](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/)
- [OWASP password storage recommendations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

*Stack research: 2026-03-29*
