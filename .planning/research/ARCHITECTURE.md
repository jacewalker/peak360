# Architecture Patterns

**Domain:** Health assessment platform -- adding auth, admin, client portal, DB-backed normative config, report visualizations
**Researched:** 2026-03-29

## Current State Summary

The existing system is a three-layer Next.js App Router application: React components (presentation) -> Next.js route handlers (API) -> Drizzle ORM + SQLite (data). Authentication is a single shared `ADMIN_PASSWORD` env var checked in middleware via a daily-rotating base64 cookie token. There are no user accounts, no roles, and no concept of "who owns this assessment." Normative data is hardcoded in `src/lib/normative/data.ts` (~60 markers across 5 categories). The rating engine (`ratings.ts`) already supports gender and age-bucketed lookups but the underlying data only has gender/age variants for a subset of markers.

## Recommended Architecture

### High-Level Component Map

```
                        +------------------+
                        |   Next.js        |
                        |   Middleware      |
                        |  (Auth Guard)    |
                        +--------+---------+
                                 |
              +------------------+------------------+
              |                  |                  |
     +--------v-------+  +------v--------+  +------v--------+
     |  Coach App      |  | Client Portal |  | Admin Panel   |
     |  /assessment/*  |  | /portal/*     |  | /admin/*      |
     |  /dashboard     |  | /portal/login |  | /admin/norms  |
     +--------+--------+  +------+--------+  +------+--------+
              |                  |                  |
              +------------------+------------------+
                                 |
                        +--------v---------+
                        |   API Layer       |
                        |  /api/assessments |
                        |  /api/admin/*     |
                        |  /api/portal/*    |
                        |  /api/auth/*      |
                        +--------+---------+
                                 |
              +------------------+------------------+
              |                  |                  |
     +--------v-------+  +------v--------+  +------v--------+
     | Normative       |  | Encryption    |  | Auth/Session  |
     | Engine          |  | Layer         |  | Manager       |
     | (DB + fallback) |  | (AES-256-GCM) |  | (Auth.js v5)  |
     +--------+--------+  +------+--------+  +------+--------+
              |                  |                  |
              +------------------+------------------+
                                 |
                        +--------v---------+
                        |   Drizzle ORM    |
                        |   SQLite / PG    |
                        +------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | New/Existing |
|-----------|---------------|-------------------|--------------|
| **Auth.js v5 (NextAuth)** | Session management, JWT tokens, credentials + magic-link providers | Middleware, API routes, DB (users table) | NEW |
| **Middleware (auth guard)** | Route protection, role-based path gating | Auth.js session, Next.js router | MODIFY existing |
| **Coach App** | Assessment creation/editing, dashboard, AI extraction | API layer, Zustand store | EXISTING (add user scoping) |
| **Client Portal** | Read-only assessment viewing, report access, progress tracking | API layer (portal endpoints) | NEW |
| **Admin Panel** | Normative range CRUD, user management, system config | API layer (admin endpoints) | NEW |
| **Normative Engine** | Resolve tier ratings from DB-backed config with hardcoded fallback | DB (normative tables), existing `ratings.ts` | MODIFY existing |
| **Encryption Layer** | AES-256-GCM encrypt/decrypt sensitive JSON fields transparently | DB layer (wraps read/write of sensitive columns) | NEW |
| **Report Visualizations** | Gauge bars, trend charts, radar plots for Section 11 | Recharts (existing), normative engine | NEW components, existing lib |

## Data Flow

### Authentication Flow (New)

```
1. User visits any route
2. Middleware checks Auth.js session (JWT from cookie)
3. No session -> redirect to /login (coach) or /portal/login (client)
4. Valid session -> extract role from JWT payload
5. Role check against route:
   - /admin/*     -> role === 'admin'
   - /assessment/* -> role === 'coach' || role === 'admin'
   - /portal/*    -> role === 'client'
   - /api/admin/* -> role === 'admin'
   - /api/portal/* -> role === 'client' (scoped to own assessments)
6. Role mismatch -> 403 or redirect to appropriate home
```

**Why Auth.js v5 over custom auth:** The existing middleware already does cookie-based auth. Auth.js v5 provides the same pattern but adds proper session management, JWT rotation, CSRF protection, and a credentials provider that maps directly to the current password-based flow. It works with Next.js 16 App Router and Drizzle ORM has an official Auth.js adapter. This avoids building session management from scratch while keeping the self-hosted, no-external-dependency model.

### Assessment Ownership Flow (Modified)

```
CURRENT:  Assessment has no owner. Anyone with password sees everything.
PROPOSED: Assessment gains coachId + clientId columns.

1. Coach creates assessment -> coachId = session.user.id
2. Coach enters client email in Section 1 -> system checks if client user exists
3. If client exists -> link assessment.clientId = client.id
4. If not -> create invite (pending client user)
5. Client logs into portal -> sees only assessments where clientId = their id
6. Coach sees only assessments where coachId = their id (admin sees all)
```

### Normative Data Flow (Modified)

```
CURRENT:
  ratings.ts imports hardcoded data.ts -> resolves tier

PROPOSED:
  1. New DB tables: normative_categories, normative_markers, normative_ranges
  2. On app boot / first request: load normative config from DB into memory cache
  3. ratings.ts checks DB cache first, falls back to hardcoded data.ts
  4. Admin panel CRUD -> updates DB tables -> invalidates cache
  5. Cache strategy: in-memory Map with cache-bust on admin write
     (SQLite is single-process, no distributed cache needed)

  getStandards(testKey, age, gender)
    -> check dbNormativeCache[testKey]
    -> if miss: check hardcoded normativeData[category][testKey]
    -> resolve gender/age bucket as before
```

**Fallback is critical:** Existing assessments were rated against hardcoded values. The DB-backed system must seed from the same hardcoded data so historical reports remain consistent. The fallback chain ensures the system works even if the DB normative tables are empty.

### Encryption Flow (New)

```
Sensitive fields: blood test values, medical screening answers, client DOB, signatures

1. Define SENSITIVE_SECTIONS = [3, 5] (medical screening, blood tests)
2. Encryption utility: encrypt(plaintext, key) -> iv:ciphertext (AES-256-GCM)
3. On section save (API PUT):
   - If section in SENSITIVE_SECTIONS: encrypt JSON data blob before DB write
   - Store as encrypted text in assessment_sections.data
4. On section load (API GET):
   - If section in SENSITIVE_SECTIONS: decrypt JSON data blob after DB read
   - Return plaintext to authorized client
5. Key management: ENCRYPTION_KEY env var (32-byte hex string)
   - Derive per-record keys using HKDF with assessment ID as context
   - Enables key rotation without re-encrypting all data
```

**Why application-level, not SQLCipher:** SQLCipher encrypts the entire database file, which is heavier than needed and complicates the dual SQLite/Postgres support. Application-level encryption targets only sensitive fields, works identically across both database backends, and uses Node.js built-in `crypto` module (zero new dependencies).

### Client Portal Data Flow (New)

```
1. Client authenticates via /portal/login (magic link or credentials)
2. GET /api/portal/assessments -> returns assessments WHERE clientId = session.user.id
3. GET /api/portal/assessments/[id]/report -> returns Section 11 data (read-only)
4. Portal renders report with gauge visualizations, trends across assessments
5. No write access to any assessment data from portal routes
```

### Report Visualization Flow (Modified Section 11)

```
CURRENT:  Section 11 renders Recharts bar charts with tier colors
PROPOSED: Add gauge/bullet bars per marker showing value position within tier ranges

1. For each rated marker in report:
   a. Get all 5 tier ranges from normative engine
   b. Compute marker position as percentage across full range
   c. Render horizontal gauge: [poor|cautious|normal|great|elite] with pin at value
2. Radar/spider chart: aggregate category scores (blood, body comp, cardio, strength, mobility)
3. Trend view: if client has multiple assessments, show improvement over time
```

## New Database Tables

### Users and Auth

```sql
-- Auth.js managed tables (via Drizzle adapter)
users (
  id            TEXT PRIMARY KEY,    -- UUID
  name          TEXT,
  email         TEXT UNIQUE NOT NULL,
  emailVerified TEXT,                -- ISO timestamp
  passwordHash  TEXT,                -- bcrypt hash (credentials provider)
  role          TEXT DEFAULT 'coach', -- 'admin' | 'coach' | 'client'
  image         TEXT,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
)

sessions (
  sessionToken  TEXT PRIMARY KEY,
  userId        TEXT REFERENCES users(id) ON DELETE CASCADE,
  expires       TEXT NOT NULL
)

-- Auth.js also needs: accounts, verification_tokens (standard adapter tables)
```

### Assessment Ownership (modify existing)

```sql
-- ADD to existing assessments table:
ALTER TABLE assessments ADD COLUMN coach_id TEXT REFERENCES users(id);
ALTER TABLE assessments ADD COLUMN client_id TEXT REFERENCES users(id);
```

### Normative Configuration

```sql
normative_categories (
  id            TEXT PRIMARY KEY,    -- 'blood_tests', 'body_comp', 'fitness', etc.
  label         TEXT NOT NULL,       -- 'Blood Tests'
  sortOrder     INTEGER DEFAULT 0,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
)

normative_markers (
  id            TEXT PRIMARY KEY,    -- 'cholesterol_total', 'vo2max', etc.
  categoryId    TEXT REFERENCES normative_categories(id),
  label         TEXT NOT NULL,       -- 'Total Cholesterol'
  unit          TEXT NOT NULL,       -- 'mmol/L'
  note          TEXT,                -- Optional clinical note
  hasGender     INTEGER DEFAULT 0,   -- Boolean: gender-specific ranges?
  hasAgeBucket  INTEGER DEFAULT 0,   -- Boolean: age-bucketed ranges?
  sortOrder     INTEGER DEFAULT 0,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
)

normative_ranges (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  markerId      TEXT REFERENCES normative_markers(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL,       -- 'poor' | 'cautious' | 'normal' | 'great' | 'elite'
  min           REAL NOT NULL,
  max           REAL NOT NULL,
  gender        TEXT,                -- NULL (any), 'male', 'female'
  ageGroup      TEXT,                -- NULL (any), '18-25', '26-35', etc.
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
)
```

**Design rationale:** The three-table structure (categories -> markers -> ranges) mirrors the existing hardcoded structure exactly. Each row in `normative_ranges` represents one tier for one marker (optionally scoped by gender and age group). This makes the admin CRUD straightforward: list markers, edit ranges per tier. The `hasGender` and `hasAgeBucket` flags on markers tell the admin UI whether to show gender/age selectors.

## Patterns to Follow

### Pattern 1: Auth Guard in Middleware + API Double-Check

**What:** Middleware gates routes by role at the edge. API routes re-verify session and ownership before returning data.

**When:** Every protected route and API endpoint.

**Why:** Middleware runs on the edge (no DB access in Edge Runtime). It can check JWT claims but cannot verify fine-grained ownership. API routes run in Node.js and can query the DB to confirm the requesting user owns the resource.

```typescript
// middleware.ts - route-level gating
const { auth } = await import('@/auth');
const session = await auth();
if (pathname.startsWith('/admin') && session?.user?.role !== 'admin') {
  return NextResponse.redirect(new URL('/', req.url));
}

// API route - resource-level check
export async function GET(req, { params }) {
  const session = await auth();
  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.id, params.id)
  });
  if (session.user.role === 'client' && assessment.clientId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

### Pattern 2: Normative Data Caching with Invalidation

**What:** Load normative config from DB into an in-memory `Map` on first access. Invalidate on admin writes.

**When:** Every call to `getStandards()` or `getPeak360Rating()`.

```typescript
// src/lib/normative/cache.ts
let normativeCache: Map<string, ResolvedMarker> | null = null;

export function invalidateNormativeCache() {
  normativeCache = null;
}

export async function getNormativeCache(): Promise<Map<string, ResolvedMarker>> {
  if (normativeCache) return normativeCache;
  const markers = await db.query.normativeMarkers.findMany({
    with: { ranges: true, category: true }
  });
  normativeCache = new Map();
  for (const m of markers) {
    normativeCache.set(m.id, buildResolvedMarker(m));
  }
  return normativeCache;
}
```

### Pattern 3: Transparent Encryption Wrapper

**What:** Encrypt/decrypt at the data access layer so components never handle ciphertext.

**When:** Reading/writing sensitive section data (sections 3 and 5).

```typescript
// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string, key: Buffer): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}
```

### Pattern 4: Additive Schema Migration

**What:** Add new tables and columns without modifying existing table structures destructively.

**When:** Every schema change in this milestone.

**Why:** Existing data must survive. Adding `coach_id` and `client_id` to assessments as nullable columns means old assessments still work. The normative tables are entirely new. Auth tables are new.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting Auth Logic in Components

**What:** Checking `session.user.role` inside React components to show/hide UI.

**Why bad:** Creates scattered auth checks that are easy to miss. A component might render sensitive data before the check fires on the client.

**Instead:** Gate at middleware (route level) and API (data level). Components assume they are authorized if they render at all. Use server components to fetch data with auth checks before streaming to client.

### Anti-Pattern 2: Encrypting Everything

**What:** Encrypting all assessment data at rest.

**Why bad:** Massively complicates debugging, breaks text search, adds latency to every read/write, and most assessment data (fitness scores, mobility ranges) is not sensitive.

**Instead:** Encrypt only genuinely sensitive fields: blood test results (Section 5), medical screening (Section 3), signatures, and PII (DOB, email stored in assessments table). Fitness metrics are not sensitive enough to warrant encryption overhead.

### Anti-Pattern 3: Real-Time Normative Cache Sync

**What:** Using WebSockets or polling to push normative config changes to all connected clients.

**Why bad:** Over-engineering for a system where normative ranges change maybe once a month. Adds infrastructure complexity for no user-visible benefit.

**Instead:** In-memory cache with TTL or explicit invalidation on admin save. If a coach has a stale cache for a few seconds after an admin change, that is perfectly acceptable.

### Anti-Pattern 4: Separate Auth for Coach vs Client

**What:** Building two independent auth systems (one for coaches at `/login`, one for clients at `/portal/login`).

**Why bad:** Duplicates session management, token handling, password hashing. Two codepaths to maintain and secure.

**Instead:** Single Auth.js instance with role-based routing. Both coaches and clients authenticate through the same system. Post-login redirect based on role: coaches go to `/`, clients go to `/portal`.

## Suggested Build Order

The dependency chain dictates build order. Each layer builds on the previous.

```
Phase 1: Gender-Specific Normative Ranges (no new infrastructure)
   |  Extends hardcoded data.ts with male/female variants for blood markers
   |  Modifies ratings.ts to handle new gender paths
   |  Zero risk to existing architecture
   v
Phase 2: Authentication System (Auth.js v5)
   |  New users table + Auth.js adapter tables
   |  Replace middleware password check with Auth.js session
   |  Add role column to users (admin/coach/client)
   |  Migrate existing ADMIN_PASSWORD flow to credentials provider
   |  Assessment ownership (coachId/clientId columns)
   v
Phase 3: DB-Backed Normative Configuration
   |  Requires: Phase 2 (admin role for access control)
   |  New normative tables (categories, markers, ranges)
   |  Seed script: hardcoded data.ts -> DB rows
   |  Modify ratings.ts: DB lookup with hardcoded fallback
   |  Admin CRUD UI for normative ranges
   v
Phase 4: Client Portal + Report Visualizations
   |  Requires: Phase 2 (client auth), Phase 3 (DB normative for gauge ranges)
   |  Portal routes (/portal/*) with read-only assessment access
   |  Gauge bar components using normative range data
   |  Trend charts across multiple assessments per client
   v
Phase 5: Encryption + Backup
   |  Requires: Phase 2 (user model established), stable schema
   |  AES-256-GCM encryption layer for sensitive sections
   |  Backup automation (SQLite file copy or pg_dump)
   |  Can be added last because it wraps existing data access
```

**Why this order:**
- Gender ranges (Phase 1) is pure data work with no infrastructure changes -- lowest risk, immediate clinical value.
- Auth (Phase 2) must come before admin panel and client portal because both need role-based access.
- Normative DB (Phase 3) depends on auth because the admin panel needs access control.
- Client portal (Phase 4) depends on both auth (client login) and normative DB (gauge visualizations need range data from DB).
- Encryption (Phase 5) is safest to add last when the schema is stable, avoiding re-encryption during schema changes.

## Scalability Considerations

| Concern | Current (1-5 coaches) | At 50 coaches | At 500+ coaches |
|---------|----------------------|---------------|-----------------|
| Auth sessions | Cookie-based JWT, no DB session store needed | Same -- JWT is stateless | Consider session table for revocation |
| Normative cache | In-memory Map, single process | Same -- still single process with SQLite | Move to Redis if using Postgres in multi-instance |
| Assessment queries | Full table scan OK | Add indexes on coach_id, client_id | Pagination + composite indexes |
| Encryption overhead | Negligible (2 sections per assessment) | ~100ms total per assessment load | Acceptable -- encrypt/decrypt is CPU-bound, not I/O |
| SQLite concurrency | WAL handles 1-5 concurrent writers | May see occasional SQLITE_BUSY | Migrate to Postgres (already supported) |

## Sources

- [Auth.js v5 with Next.js 16 guide](https://dev.to/huangyongshan46a11y/authjs-v5-with-nextjs-16-the-complete-authentication-guide-2026-2lg) -- MEDIUM confidence (community article, consistent with official docs pattern)
- [Auth.js official Next.js reference](https://authjs.dev/reference/nextjs) -- HIGH confidence
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) -- HIGH confidence
- [Next.js middleware RBAC patterns](https://www.jigz.dev/blogs/how-to-use-middleware-for-role-based-access-control-in-next-js-15-app-router) -- MEDIUM confidence
- [AES-256-GCM in Node.js](https://ssojet.com/encryption-decryption/aes-256-in-nodejs) -- HIGH confidence (uses built-in crypto module)
- Existing codebase analysis: `src/middleware.ts`, `src/lib/normative/ratings.ts`, `src/lib/db/schema-sqlite.ts` -- HIGH confidence (direct source review)

---

*Architecture research: 2026-03-29*
