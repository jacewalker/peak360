# Domain Pitfalls

**Domain:** Health assessment platform -- adding auth, admin panel, encryption, gender-specific ranges, report visualizations
**Researched:** 2026-03-29

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or security failures.

### Pitfall 1: Gender Range Fallback Silently Produces Wrong Ratings

**What goes wrong:** Blood test markers like hemoglobin, iron, creatinine, and testosterone have dramatically different healthy ranges for males vs. females. The current `blood_tests` type in `normativeData` is `Record<string, SimpleMarker>` -- flat ranges with no gender dimension. When gender-specific ranges are added for some markers but not others, the rating engine may silently fall back to ungendered ranges (or worse, return `null`) without indicating which standard was used. A female client rated against male hemoglobin ranges could be told she's "poor" when she's actually "normal."

**Why it happens:** The existing `getStandards()` function already handles gendered lookups for `body_comp`, `fitness`, and `strength` -- but `blood_tests` is typed as `Record<string, SimpleMarker>` only. Adding gender-specific blood markers requires changing the TypeScript type, and every call site that reads `normativeData.blood_tests[key]` must handle both `SimpleMarker` and `GenderedMarker` variants. This is the same pattern already used in `body_comp` and `strength`, but the blood_tests section was never extended.

**Consequences:** Clinically incorrect ratings shown to clients. Loss of trust. Potential liability if a coach acts on an inaccurate "poor" flag for a marker that's actually normal for the client's sex.

**Prevention:**
1. Change `blood_tests` type from `Record<string, SimpleMarker>` to `Record<string, SimpleMarker | GenderedMarker>` to match `strength`
2. Extend `getStandards()` blood_tests branch to check for `'male' in test` (same pattern as body_comp/strength)
3. Add a `source` field to `RatingResult` indicating whether gender-specific or unisex ranges were used
4. Write unit tests for every gendered blood marker with both male and female inputs
5. If gender is missing/unknown, fall back to unisex ranges and flag it visually in the report

**Detection:** Test every marker where male/female ranges differ. If `getPeak360Rating('hemoglobin', 130, 35, 'female')` returns "poor" instead of "normal", the fallback is broken.

**Phase:** Gender-specific ranges phase (should be first -- foundational to correctness of everything downstream).

---

### Pitfall 2: Middleware-Only Auth Bypass (CVE-2025-29927 Pattern)

**What goes wrong:** The current auth lives entirely in `src/middleware.ts` -- a single shared `ADMIN_PASSWORD` checked via a cookie token. When upgrading to role-based auth (coach/client), developers commonly put all authorization checks in Next.js middleware. But Next.js middleware can be bypassed. CVE-2025-29927 showed attackers can skip middleware entirely by adding an `x-middleware-subrequest` header. If API routes trust that middleware already validated the user, all assessment data is exposed.

**Why it happens:** Next.js middleware feels like the "right place" for auth because it runs before every request. But middleware is a convenience layer, not a security boundary. The existing pattern (`peak360_session` cookie with `btoa(password:date)`) has no cryptographic signing, no expiration beyond "today," and no per-user identity.

**Consequences:** Any API route (`/api/assessments`, `/api/assessments/[id]/sections/[num]`) returns data to unauthenticated requests if middleware is bypassed. Blood test results, medical screening, and personal health data exposed.

**Prevention:**
1. Validate auth in EVERY API route handler, not just middleware. Middleware provides redirects for UX; API routes must independently verify the session
2. Use signed, httpOnly, secure cookies (or JWTs with proper signing) -- not `btoa(password:date)`
3. Check authorization (not just authentication) per-route: "Is this user allowed to access THIS assessment?"
4. Rate-limit the login endpoint to prevent brute force
5. Consider Auth.js (NextAuth v5) which handles session management correctly, or implement a lightweight session table in SQLite

**Detection:** Try accessing `/api/assessments` without cookies. If it returns data, auth is broken. Try with `x-middleware-subrequest` header set.

**Phase:** Auth phase. Must be addressed before client portal goes live.

---

### Pitfall 3: Application-Level Encryption Breaks Queries and Indexing

**What goes wrong:** Application-level AES-256 encryption of sensitive fields (blood results, medical history) renders those fields unsearchable and un-indexable. You cannot query "find all clients with HbA1c > 6.5" if HbA1c is encrypted in a JSON blob. Worse, the current architecture stores section data as JSON blobs in `assessment_sections.data` -- encrypting the entire blob means you can't even read individual fields without decrypting everything.

**Why it happens:** "Encrypt sensitive data" sounds simple, but the current data model stores ALL section fields in a single JSON column. There's no column-level granularity. Either you encrypt the whole blob (breaking all queries) or you encrypt field-by-field within JSON (complex serialization, key management headaches, significant performance overhead on every read/write).

**Consequences:** Coach dashboard can't search or filter by client health data. Report generation (Section 11) must decrypt all sections for every client. Performance degrades as client count grows. Admin panel analytics become impossible without full decryption.

**Prevention:**
1. Use SQLCipher or libsql encryption for full-database encryption at rest instead of application-level field encryption. This protects the `.db` file on disk while keeping queries functional
2. If application-level encryption is required (e.g., multi-tenant with per-tenant keys), encrypt only the JSON blob column, not individual fields within it. Accept that encrypted data is opaque
3. Keep non-sensitive metadata (assessment dates, completion status, section numbers) in plaintext columns for querying
4. Never store encryption keys in the same database or in environment variables alongside the database file
5. Implement key rotation strategy from day one -- retrofitting key rotation is extremely painful

**Detection:** After implementing encryption, try running the dashboard query that lists assessments. If it's 10x slower or broken, the encryption boundary is wrong.

**Phase:** Encryption phase. Design the encryption boundary BEFORE implementing it. Prototype with real data volumes.

---

### Pitfall 4: Admin Panel Edits Corrupt Active Assessments

**What goes wrong:** Moving normative thresholds from hardcoded `data.ts` to a database-backed admin panel means ranges can change while assessments are in progress. A client halfway through their assessment gets rated on one set of ranges for Section 5 (blood tests filled Tuesday) and a different set for Section 11 (report generated Thursday after an admin edit). The report shows inconsistent ratings.

**Why it happens:** The rating engine currently calls `getStandards()` which reads from the imported `normativeData` constant -- immutable at runtime. Once this reads from a database, it becomes mutable. No versioning means the ranges used for rating are "whatever's in the DB right now."

**Consequences:** Inconsistent ratings within a single assessment. Completed assessments may show different ratings when reopened. Coaches lose trust in the system.

**Prevention:**
1. Snapshot normative ranges at assessment creation time. Store the version/timestamp of ranges used in the assessment record
2. Implement range versioning: every edit creates a new version, assessments reference a specific version
3. Add a "recalculate ratings" action that explicitly re-rates an assessment against current ranges (with user confirmation)
4. Show "rated using ranges from [date]" in reports
5. Soft-delete old range versions -- never hard delete. Active assessments may still reference them

**Detection:** Create an assessment, rate some markers, edit the ranges in admin panel, then regenerate the Section 11 report. If ratings change without user action, versioning is missing.

**Phase:** Admin panel phase. The versioning schema must be designed before the first admin edit is possible.

---

### Pitfall 5: Client Portal Exposes Other Clients' Data via Direct URL Access

**What goes wrong:** Assessment URLs contain the assessment UUID (`/assessment/[id]/section/[num]`). With a client portal, authenticated clients can guess or enumerate UUIDs to access other clients' assessments. The current architecture has no ownership model -- there's no `coach_id` or `client_id` column on the `assessments` table.

**Why it happens:** The system was built for single-coach use. Every route assumes the authenticated user has access to every assessment. Adding auth without adding ownership creates authenticated users who can see everything.

**Consequences:** Client A sees Client B's blood test results, medical history, and health assessments. Serious privacy violation.

**Prevention:**
1. Add `coach_id` and `client_email` (or `client_id`) columns to the `assessments` table
2. Every API route must check: does the requesting user own this assessment (coach) or is this their assessment (client)?
3. UUIDs are not security -- they're collision avoidance. Always verify ownership server-side
4. Implement row-level access control: coaches see their own clients' assessments; clients see only their own
5. API routes must filter queries: `WHERE coach_id = ?` for coach role, `WHERE client_email = ?` for client role

**Detection:** Log in as Client A, manually change the assessment ID in the URL to another client's assessment. If it loads, ownership checks are missing.

**Phase:** Auth/client portal phase. Ownership columns must be added before any client-facing routes are enabled.

---

## Moderate Pitfalls

### Pitfall 6: Gauge Visualizations Misrepresent Clinical Ranges

**What goes wrong:** Gauge/bar visualizations for biomarker ratings use equal-width segments for each tier, but clinical ranges are not equally sized. For example, the "normal" range for fasting glucose spans 4.0--5.59 mmol/L (1.59 units wide), while "elite" spans 0--3.69 (3.69 units wide). An equal-width gauge makes "normal" look as significant as "elite," distorting clinical meaning. A value just barely in "cautious" looks identical to a value deep in "cautious."

**Why it happens:** Gauge chart libraries default to equal segments. Developers map 5 tiers to 5 equal slices without considering the actual numeric ranges.

**Prevention:**
1. Scale gauge segments proportionally to the actual range widths (min/max from normative data)
2. Show the actual value as a needle/marker position on the proportional scale
3. Display the numeric boundaries on the gauge (e.g., "4.0" and "5.6" at the normal/cautious boundary)
4. Include the actual value and tier label as text alongside any visualization -- never rely solely on the gauge
5. Cap visual range at clinically meaningful bounds (don't extend to `max: 99` visually)

**Detection:** Generate a report for a client with a value near a tier boundary. Does the visualization make it clear how close they are to the next tier?

**Phase:** Report visualization phase.

---

### Pitfall 7: Hardcoded-to-DB Migration Loses Existing Assessments' Context

**What goes wrong:** When normative data moves from `data.ts` to the database, existing assessments that were rated against hardcoded values now get re-rated against whatever the DB contains. If the DB was seeded incorrectly, or if an admin has already modified ranges before old assessments are viewed, historical ratings change silently.

**Why it happens:** The rating engine will be refactored to read from DB instead of `data.ts`. The migration must seed the DB with the exact values from `data.ts`, but JSON floating point issues, missing markers, or incomplete seeding can cause subtle differences.

**Prevention:**
1. Write a migration script that reads `data.ts` programmatically and seeds the DB -- do not manually re-enter values
2. After seeding, run a verification script that rates a fixed set of test values against both old (hardcoded) and new (DB) sources and confirms identical results
3. Keep `data.ts` as a read-only fallback: if a marker is missing from the DB, fall back to hardcoded values (the PROJECT.md already notes this requirement)
4. Log which source was used (DB vs fallback) for debugging

**Detection:** After migration, run `getPeak360Rating('cholesterol_total', 5.5, 40, 'male')` against both sources. Results must be identical.

**Phase:** Admin panel phase (migration step).

---

### Pitfall 8: Auto-Save Sends Unencrypted Data in Transit During Encryption Retrofit

**What goes wrong:** The auto-save mechanism sends section data via PUT every 1 second of idle time, and `sendBeacon` fires on page unload. If encryption is added at the database layer but not enforced in transit, sensitive health data flows in plaintext over HTTP (especially in development or misconfigured production). Even with HTTPS, the request payload contains full section JSON including blood test results.

**Why it happens:** The encryption effort focuses on data at rest. The existing auto-save sends full section payloads without any field-level sensitivity awareness.

**Prevention:**
1. Enforce HTTPS in production -- add HSTS headers, redirect HTTP to HTTPS
2. If using application-level encryption, encrypt before the fetch call on the client side, not just at the DB write. This protects data in server memory and logs
3. Ensure `sendBeacon` payloads are also encrypted if the main save path is
4. Never log request bodies for health data API routes
5. Sanitize error messages -- don't include field values in error responses

**Detection:** Check network tab in browser dev tools during form filling. If blood test values appear in plaintext request payloads in production, transit encryption needs work.

**Phase:** Encryption phase.

---

### Pitfall 9: Role Confusion Between "Sex" and "Gender" in Clinical Context

**What goes wrong:** The current schema uses `client_gender` and the rating engine uses `gender` parameter. But clinical reference ranges are based on biological sex (hormonal profiles affecting blood chemistry), not gender identity. Using "gender" terminology while meaning "sex" creates both clinical inaccuracy and user experience problems -- a transgender client may have a gender identity that doesn't match the biological sex their lab ranges should be based on.

**Why it happens:** The terms are often conflated in software. The existing codebase uses "gender" consistently, and the field currently captures "male"/"female" which works for most cases but is imprecise.

**Prevention:**
1. In the data model and rating engine, use "biological sex" (or "sex assigned at birth") as the parameter for range selection -- this is the clinically relevant variable
2. In the UI, consider capturing both gender identity and biological sex if clinically relevant, with clear labeling explaining why biological sex is needed (for accurate lab range interpretation)
3. Document in admin panel that ranges are keyed by biological sex, not gender identity
4. The rating engine parameter should be `sex` not `gender` to make the clinical intent clear

**Detection:** Review the UI copy. If it says "Gender" but means "biological sex for lab ranges," the terminology is misleading.

**Phase:** Gender-specific ranges phase. Get the terminology right before building the UI for it.

---

## Minor Pitfalls

### Pitfall 10: Admin Panel Without Audit Trail

**What goes wrong:** An admin changes a threshold value (e.g., sets "elite" HbA1c to min: 0, max: 6.0 instead of 4.69) and nobody knows who changed it, when, or what the previous value was. Clinical thresholds are safety-critical data.

**Prevention:**
1. Log every admin edit: who, when, old value, new value
2. Add a "change history" view for each marker in the admin panel
3. Require confirmation for changes that affect active assessments

**Phase:** Admin panel phase.

---

### Pitfall 11: Client Portal Session Duration Too Short or Too Long

**What goes wrong:** Coaches filling out long assessments (11 sections) get logged out mid-session. Clients with persistent sessions can be accessed if they leave their device unattended.

**Prevention:**
1. Different session durations for roles: coaches get longer sessions (8h), clients get shorter (1h with sliding window)
2. Warn before session expiry (5 min countdown)
3. Auto-save ensures no data loss on session expiry -- but the redirect-to-login must not discard unsaved changes

**Phase:** Auth phase.

---

### Pitfall 12: Recharts Gauge/Visualization Performance in PDF Export

**What goes wrong:** Section 11 currently uses browser print for PDF export. Complex SVG visualizations (gauges, bar charts from Recharts) may render differently or break entirely in print mode. Some chart libraries use CSS animations that don't translate to static PDF.

**Prevention:**
1. Test gauge components in print preview early -- don't build complex visualizations and discover they break in print
2. Use static SVG rendering (no animations) for charts that appear in the report
3. Add `.print` specific styles for chart containers (explicit widths, no overflow hidden)
4. Consider server-side PDF generation (e.g., puppeteer or react-pdf) if browser print proves unreliable

**Phase:** Report visualization phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Gender-specific ranges | Wrong TypeScript types break existing markers (Pitfall 1) | Extend union type, don't replace. Test all existing markers still rate correctly |
| Gender-specific ranges | Sex vs gender terminology confusion (Pitfall 9) | Decide terminology before touching UI or schema |
| Admin panel | Unversioned ranges corrupt active assessments (Pitfall 4) | Design version schema before first DB write |
| Admin panel | Migration from hardcoded data loses precision (Pitfall 7) | Automated seed + verification script |
| Admin panel | No audit trail for threshold changes (Pitfall 10) | Build audit log table alongside the ranges table |
| Auth / Client portal | Middleware-only auth bypass (Pitfall 2) | Validate in every API route handler independently |
| Auth / Client portal | Missing ownership model exposes data (Pitfall 5) | Add coach_id/client_id before enabling client routes |
| Auth / Client portal | Session duration mismatches (Pitfall 11) | Role-specific session config from day one |
| Encryption | App-level encryption breaks queries (Pitfall 3) | Use database-level encryption (SQLCipher), not field-level |
| Encryption | Auto-save transit exposure (Pitfall 8) | Enforce HTTPS, sanitize logs |
| Report visualization | Gauge proportions mislead (Pitfall 6) | Scale segments to actual range widths |
| Report visualization | Print/PDF rendering breaks (Pitfall 12) | Test print output early and often |

## Sources

- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) -- official auth patterns
- [Auth.js Role-Based Access Control](https://authjs.dev/guides/role-based-access-control) -- RBAC implementation
- [CVE-2025-29927 Next.js Middleware Bypass](https://www.jigz.dev/blogs/how-to-use-middleware-for-role-based-access-control-in-next-js-15-app-router) -- middleware security vulnerability
- [SQLCipher Full Database Encryption](https://www.zetetic.net/sqlcipher/) -- SQLite encryption at rest
- [Turso Open Source SQLite Encryption](https://turso.tech/blog/fully-open-source-encryption-for-sqlite-b3858225) -- libsql encryption alternative
- [SQLCipher Implementation Guide](https://oneuptime.com/blog/post/2026-02-02-sqlcipher-encryption/view) -- performance and setup considerations
- [Reference Interval Limitations in Clinical Chemistry](https://pmc.ncbi.nlm.nih.gov/articles/PMC10932992/) -- why reference ranges vary
- [Gender-Specific Reference Intervals for Biochemical Analytes](https://pmc.ncbi.nlm.nih.gov/articles/PMC7956001/) -- sex-based range differences
- [Transgender Reference Range Considerations](https://pmc.ncbi.nlm.nih.gov/articles/PMC7947826/) -- sex vs gender in lab interpretation
- [AHRQ Displaying Health Quality Report Data](https://www.ahrq.gov/talkingquality/translate/display/index.html) -- clinical data visualization best practices
- [Visualization Pitfalls in Scientific Publications](https://pmc.ncbi.nlm.nih.gov/articles/PMC8556474/) -- misleading chart patterns
- [HIPAA 2026 Security Rule Updates](https://healthcarereaders.com/insights/hipaa-cybersecurity-for-patient-data) -- mandatory encryption and MFA requirements
