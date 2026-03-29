# Project Research Summary

**Project:** Peak360 Milestone 1 (Auth, Admin, Encryption, Visualizations, Gender Ranges)
**Domain:** Health/longevity assessment platform for coaches and clients
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

Peak360 is a coach-facing longevity assessment platform that needs to evolve from a single-user tool with a shared password into a multi-user platform with role-based access, a client portal, admin-managed normative data, and clinically accurate gender-specific biomarker ranges. The recommended approach is to layer new capabilities onto the existing Next.js + Drizzle + SQLite/Postgres stack with minimal new dependencies: Better Auth for authentication and RBAC, Node.js built-in crypto for field-level encryption, and the already-installed Recharts for report visualizations. No admin framework or additional charting library is needed.

The most important finding across all research is that clinical accuracy must come before platform features. The current rating engine produces incorrect results for approximately 15-20 blood markers when applied to female clients because it lacks gender-specific ranges. This is not a nice-to-have -- it is a credibility-destroying bug that undermines every downstream feature (reports, client portal, trend tracking). Gender-specific ranges should be the first phase, before any auth or admin work begins.

The primary risks are: (1) the middleware-only auth pattern is known to be bypassable (CVE-2025-29927), requiring defense-in-depth with per-route API validation; (2) application-level encryption of JSON blobs will break any future query capability on encrypted fields, which must be accepted as a tradeoff; and (3) moving normative data from hardcoded files to a database introduces a versioning problem where admin edits can corrupt in-progress assessments if ranges are not snapshotted at assessment creation time.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, React 19, Drizzle ORM, Tailwind v4, Zustand, Recharts) remains unchanged. Only one new runtime dependency is needed: Better Auth for authentication. See [STACK.md](./STACK.md) for full details.

**Core additions:**
- **Better Auth 1.5.6**: Authentication with built-in RBAC, admin plugin, credentials provider with rate limiting, and first-class Drizzle adapter for both SQLite and Postgres. Replaces the current shared-password cookie system.
- **Node.js crypto (built-in)**: AES-256-GCM field-level encryption for sensitive section data. Zero new dependencies. Encrypts JSON blobs at the API layer before DB writes.
- **Custom admin panel**: Built with existing React + Tailwind components. The scope is 3-4 CRUD pages -- too small to justify React Admin or Refine.
- **Recharts 3.8.0 (existing)**: RadialBarChart for gauge visualizations, custom bar shapes for 5-tier range indicators.
- **TanStack Table (optional)**: Only if normative range listing requires sorting/filtering beyond a plain table.

**Note on auth library discrepancy:** ARCHITECTURE.md references Auth.js v5, but STACK.md provides a more thorough analysis recommending Better Auth instead. Better Auth is the correct choice -- it has built-in RBAC, a credentials provider that includes rate limiting and account lockout, and the Auth.js project is now maintained by the Better Auth team. All architecture patterns (middleware guard + API double-check, role-based routing, session management) apply equally to Better Auth.

### Expected Features

See [FEATURES.md](./FEATURES.md) for the full landscape analysis.

**Must have (table stakes):**
- Gender-specific blood marker ranges -- clinical accuracy baseline; without this, ratings are wrong for half the population
- Horizontal range bar visualization -- every competing lab platform shows this; users are trained to expect it
- Role-based authentication (coach/client) -- multi-user is table stakes for any practitioner tool
- Client read-only portal -- coaches need to stop manually sharing PDFs
- Encryption at rest for sensitive fields -- ethically necessary for health data
- Referral flags for critical values -- duty-of-care when markers are dangerously out of range
- Actionable recommendations per marker -- a tier label without context is useless
- Medical disclaimer -- legally prudent, trivially implemented

**Should have (differentiators):**
- Admin panel for normative range management -- lets coaches customize without a developer
- Coach-controlled result release -- hold results for review before client sees them
- Longitudinal trend tracking -- high value for repeat clients
- Per-marker coach notes -- personalization layer
- PDF report with practice branding -- professional polish

**Defer (v2+):**
- Biological age score -- needs validated algorithm, high complexity, low urgency
- Wearable integrations -- maintenance black hole
- Mobile native app -- responsive web is sufficient
- HIPAA certification -- operational burden only justified if selling to US medical practices
- Real-time collaboration -- coaches and clients never edit simultaneously

### Architecture Approach

The architecture adds three new layers to the existing stack: an auth system (Better Auth with Drizzle adapter), an encryption layer (AES-256-GCM wrapping sensitive JSON blobs), and a normative engine upgrade (DB-backed with in-memory cache and hardcoded fallback). The existing three-surface pattern (Coach App, Client Portal, Admin Panel) maps to role-based route groups, all sharing a single auth system with post-login redirect based on role. See [ARCHITECTURE.md](./ARCHITECTURE.md) for component diagrams and data flows.

**Major components:**
1. **Auth system (Better Auth)** -- session management, RBAC (admin/coach/client roles), credentials provider, Drizzle adapter for user/session tables
2. **Coach App (existing, modified)** -- assessment CRUD scoped to coach_id ownership, dashboard filtered by coach
3. **Client Portal (new)** -- read-only assessment viewing at /portal/*, scoped to client_id, report with visualizations
4. **Admin Panel (new)** -- normative range CRUD at /admin/*, user management via Better Auth admin plugin, audit logging
5. **Normative Engine (modified)** -- DB-backed ranges with in-memory cache, hardcoded fallback, cache invalidation on admin writes
6. **Encryption Layer (new)** -- transparent encrypt/decrypt at API layer for sections 3 and 5, AES-256-GCM with per-record IV
7. **Report Visualizations (new components)** -- proportional range bars, gauge charts, trend lines using existing Recharts

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for all 12 pitfalls with detailed prevention strategies.

1. **Gender range fallback produces wrong ratings** -- When adding gender-specific blood markers, the type system must handle both SimpleMarker and GenderedMarker. Missing gender falls back silently to wrong ranges. Prevention: extend union type (same pattern as body_comp/strength), add source field to RatingResult, unit test every gendered marker with both sexes.

2. **Middleware-only auth bypass (CVE-2025-29927)** -- Next.js middleware can be bypassed with a header. Prevention: validate auth in every API route handler independently; middleware is for UX redirects only, not security.

3. **Admin edits corrupt in-progress assessments** -- Changing normative ranges mid-assessment produces inconsistent ratings. Prevention: snapshot range version at assessment creation, implement explicit "recalculate" action, show "rated using ranges from [date]" in reports.

4. **Application-level encryption breaks queries** -- Encrypting JSON blobs makes those fields unsearchable. Prevention: accept this tradeoff explicitly; keep metadata (dates, status, section numbers) in plaintext columns; do not encrypt fitness metrics that are not sensitive.

5. **Client portal exposes other clients' data** -- Without ownership columns, authenticated clients can access any assessment by UUID. Prevention: add coach_id and client_id to assessments table, enforce ownership checks in every API route.

## Implications for Roadmap

Based on combined research, five phases are recommended. The ordering is driven by dependency chains and risk mitigation.

### Phase 1: Clinical Accuracy (Gender-Specific Ranges + Visualizations)
**Rationale:** Fixes a clinical correctness problem that undermines trust in everything else. Zero infrastructure changes needed -- pure data and component work. Lowest risk, highest immediate impact.
**Delivers:** Accurate gender-specific ratings for all blood markers, horizontal range bar visualizations, referral flags for critical values, expanded actionable recommendations, medical disclaimer.
**Addresses:** 5 table-stakes features (gender ranges, range bars, referral flags, recommendations, disclaimer)
**Avoids:** Pitfall 1 (gender fallback), Pitfall 6 (gauge proportions), Pitfall 9 (sex vs gender terminology)

### Phase 2: Authentication and Ownership
**Rationale:** Foundation for everything multi-user. Must exist before admin panel (needs role gating) and client portal (needs client login). The current shared-password system is a security liability.
**Delivers:** Better Auth integration, user table with roles (admin/coach/client), session management, assessment ownership (coach_id/client_id columns), migration from shared password to credentials provider.
**Uses:** Better Auth 1.5.6, Drizzle adapter
**Implements:** Auth system component, middleware guard + API double-check pattern
**Avoids:** Pitfall 2 (middleware bypass), Pitfall 5 (missing ownership), Pitfall 11 (session duration)

### Phase 3: Admin Panel and DB-Backed Normative Data
**Rationale:** Requires Phase 2 for role-based access control. Moves normative data to the database, unlocking coach customization. Must include range versioning from day one to prevent data corruption.
**Delivers:** Normative tables (categories, markers, ranges), automated seed from hardcoded data, in-memory cache with invalidation, admin CRUD UI, audit logging for threshold changes, range versioning.
**Addresses:** Admin panel for range management (differentiator), red flag marker weighting
**Avoids:** Pitfall 4 (unversioned ranges), Pitfall 7 (migration data loss), Pitfall 10 (no audit trail)

### Phase 4: Client Portal and Encryption
**Rationale:** Requires Phase 2 (client auth) and Phase 3 (DB-backed ranges for gauge visualizations). Encryption ships alongside the portal because sensitive data becomes accessible to a new user class.
**Delivers:** Client portal (/portal/*) with read-only assessment access, coach-controlled result release, AES-256-GCM encryption for sensitive sections, HTTPS enforcement.
**Addresses:** Client portal (table stakes), encryption at rest (table stakes), coach-controlled release (differentiator)
**Avoids:** Pitfall 3 (encryption query breakage -- accepted tradeoff), Pitfall 8 (transit exposure)

### Phase 5: Engagement and Polish
**Rationale:** Only matters once clients are actively using the portal. These features drive retention and professional perception.
**Delivers:** Longitudinal trend tracking across assessments, optimal vs normal range overlay, per-marker coach notes, PDF report with practice branding.
**Addresses:** Remaining differentiators from FEATURES.md

### Phase Ordering Rationale

- **Clinical accuracy first** because wrong ratings undermine trust in every other feature. A client portal showing incorrect blood marker ratings is worse than no portal at all.
- **Auth before admin** because the admin panel needs role-based route protection. Building admin CRUD without auth means either it is unprotected or you build throwaway auth.
- **Admin before client portal** because the portal renders reports that depend on DB-backed normative data with proper gauge visualizations. The admin panel establishes the data layer the portal consumes.
- **Encryption ships with client portal** because introducing a new user class (clients) to sensitive data requires encryption to be in place. Shipping the portal without encryption creates a window of exposure.
- **Engagement features last** because they only provide value when clients are actively using the system.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Auth):** Better Auth integration with Next.js 16's proxy.ts (replacing middleware.ts) has limited community examples. The official docs cover it, but implementation details around Drizzle adapter configuration with dual SQLite/Postgres may need validation.
- **Phase 3 (Admin/Normative DB):** Range versioning schema design needs careful thought. The snapshot-at-creation approach vs version-reference approach has tradeoffs that should be resolved during phase planning.
- **Phase 4 (Encryption):** Key rotation strategy and the encrypt-on-client-vs-server decision need prototyping with real data volumes to validate performance.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Clinical Accuracy):** The gender-specific range pattern already exists in body_comp and strength. This is extending a known pattern to blood_tests. Well-documented clinical reference data is available.
- **Phase 5 (Engagement):** Trend tracking and PDF branding are standard web development patterns with no domain-specific complexity.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended technologies verified on npm with current versions. Better Auth has official Drizzle adapter and Next.js integration docs. Only uncertainty: TanStack Table may not be needed. |
| Features | HIGH | Feature landscape validated against 4+ competitor products (InsideTracker, Rupa Health, Heads Up Health, CoachRx). Table stakes vs differentiators are well-established in the longevity platform market. |
| Architecture | MEDIUM-HIGH | Patterns are sound (auth guard + API check, normative cache with fallback, transparent encryption). Discrepancy between STACK.md and ARCHITECTURE.md on auth library resolved in favor of Better Auth. Architecture doc references Auth.js v5 patterns that apply equally to Better Auth. |
| Pitfalls | HIGH | Critical pitfalls backed by real CVEs (middleware bypass), clinical literature (gender-specific ranges), and standard software engineering failure modes (versioning, encryption query breakage). |

**Overall confidence:** HIGH

### Gaps to Address

- **Better Auth + Next.js 16 proxy.ts:** The exact configuration for Better Auth with Next.js 16's new proxy.ts (which replaces middleware.ts for some use cases) should be validated during Phase 2 planning. Official docs exist but the pattern is new.
- **Range versioning schema:** Two approaches identified (snapshot-at-creation vs version-reference) but neither was deeply prototyped. Phase 3 planning should resolve this with a concrete schema design.
- **Encryption key rotation:** The HKDF-based per-record key derivation approach is mentioned but not detailed. If key rotation is needed before v2, the implementation needs design work during Phase 4.
- **Sex vs gender terminology:** Research identified this as a clinical and UX concern. The exact field naming and UI copy should be decided in Phase 1 planning with input from the product owner.
- **Print/PDF rendering of Recharts gauges:** Pitfall 12 flags that complex SVG visualizations may break in print mode. This needs early testing in Phase 1, not discovery at the end.

## Sources

### Primary (HIGH confidence)
- [Better Auth official docs](https://better-auth.com/docs/installation) -- auth framework, admin plugin, Drizzle adapter
- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next) -- route handler setup, proxy.ts support
- [Node.js AES-256-GCM](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81) -- encryption implementation pattern
- [Auth.js official reference](https://authjs.dev/reference/nextjs) -- session patterns (applicable to Better Auth)
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) -- Argon2id recommendation
- [PMC: Gender-Specific Reference Intervals](https://pmc.ncbi.nlm.nih.gov/articles/PMC7956001/) -- sex-based range differences
- Existing codebase analysis -- direct source review of middleware.ts, ratings.ts, schema files

### Secondary (MEDIUM confidence)
- [Rupa Health Blood Lab Dashboards](https://www.rupahealth.com/blood-lab-dashboards) -- competitor feature analysis
- [Heads Up Health Product](https://headsuphealth.com/product/) -- competitor feature analysis
- [InsideTracker Pro](https://info.insidetracker.com/npti) -- competitor feature analysis
- [PMC: Graphical display for laboratory data](https://pmc.ncbi.nlm.nih.gov/articles/PMC2995657/) -- visualization effectiveness
- [CVE-2025-29927 middleware bypass](https://www.jigz.dev/blogs/how-to-use-middleware-for-role-based-access-control-in-next-js-15-app-router) -- security vulnerability

### Tertiary (LOW confidence)
- [Auth.js v5 with Next.js 16 community guide](https://dev.to/huangyongshan46a11y/authjs-v5-with-nextjs-16-the-complete-authentication-guide-2026-2lg) -- community article, patterns transferable to Better Auth
- Biological age score algorithm -- no validated open-source algorithm identified; deferred to v2+

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
