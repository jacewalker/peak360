# Codebase Concerns

**Analysis Date:** 2026-03-29

## Tech Debt

**Weak Session Authentication:**
- Issue: Session token based on `btoa(password:date)` with only URL-safe base64 encoding. Token changes daily but is entirely deterministic and reversible. No rate limiting on login attempts.
- Files: `src/middleware.ts`, `src/app/api/auth/login/route.ts`
- Impact: Session token can be computed without knowing the actual password if a valid token is captured on any date. Brute-force attacks possible on login endpoint without throttling.
- Fix approach: Implement proper session management (JWT with secret, or use a session store). Add rate limiting to `/api/auth/login`. Consider passwordless auth or proper password hashing (bcrypt/argon2).

**Database Schema Duality (PostgreSQL vs SQLite):**
- Issue: Two separate schema files (`schema.ts` for PostgreSQL with `jsonb`, `schema-sqlite.ts` for SQLite with `text`). Runtime database detection in `src/lib/db/index.ts` loads different schemas dynamically. Migrations duplicated in `runMigrations()` function.
- Files: `src/lib/db/schema.ts`, `src/lib/db/schema-sqlite.ts`, `src/lib/db/index.ts`
- Impact: Hard to maintain consistency. Schema changes require updates to both files plus the migration logic. Risk of divergence. Type safety varies by environment.
- Fix approach: Consolidate to single dialect using Drizzle's dialect selection, or abstract migrations into a shared module. Add schema validation tests for both databases.

**Global Database Proxy with Type Erasure:**
- Issue: Database instance created as a Proxy to defer initialization until first use. Uses `any` types extensively (`globalForDb.db: any`, `getDb() as any`).
- Files: `src/lib/db/index.ts` (lines 5-39)
- Impact: Type safety lost for database operations. Harder to catch issues at compile time. Makes IDE autocomplete unreliable.
- Fix approach: Use proper lazy initialization with typed returns, or initialize on app startup. Export strongly-typed db instance.

**Large Component Files with Mixed Concerns:**
- Issue: Several components exceed 500 lines with multiple responsibilities:
  - `Section11.tsx` (666 lines): PDF export logic, report generation, data formatting, UI rendering
  - `TrendsTab.tsx` (562 lines): Chart rendering, AI assessment generation, caching, timeline aggregation
  - `Section5.tsx` (297 lines): AI extraction, form state, file upload handling
- Files: `src/components/sections/Section11.tsx`, `src/app/clients/[name]/TrendsTab.tsx`, `src/components/sections/Section5.tsx`
- Impact: Hard to test, harder to modify, logic difficult to reuse. Each modification risks breaking multiple features in same file.
- Fix approach: Extract PDF logic to separate utility (`exportToPdf.ts`). Move chart logic to dedicated hook (`useMetricChart.ts`). Separate AI extraction state (`useAiExtraction.ts`). Use composition over monolithic components.

**ClientStorage in Client Component Without Hydration Guard:**
- Issue: `TrendsTab.tsx` uses `localStorage.getItem()` and `localStorage.setItem()` for caching AI assessments without checking if code runs in browser.
- Files: `src/app/clients/[name]/TrendsTab.tsx` (lines 214, 228)
- Impact: Will throw on server-side rendering. Auto-trigger on mount (lines 274-278) uses custom state variable hack instead of proper effect cleanup, potentially calling API twice on mount.
- Fix approach: Wrap localStorage access in `typeof window !== 'undefined'` guard. Use `useEffect` with proper dependency array and cleanup for API triggers.

**CSV Import/Export Without Input Validation:**
- Issue: CSV parser in `src/lib/csv/import.ts` manually handles RFC 4180 parsing (100+ lines). No column name normalization before import. Values from CSV directly inserted to database without type coercion for numbers.
- Files: `src/lib/csv/import.ts` (lines 72-159), `src/lib/csv/export.ts`
- Impact: Manual CSV parsing is fragile—edge cases in field quoting, escaping could cause silent data corruption. No validation that imported data matches expected types.
- Fix approach: Use a battle-tested CSV library (`papaparse` or `csv-parse`). Add TypeScript validation on import using zod or similar. Test with edge-case CSVs (quotes, newlines, null bytes).

**AI Extraction No Timeout:**
- Issue: OpenAI API calls in `src/app/api/ai/extract/route.ts` and `src/app/api/ai/verify/route.ts` have no timeout. File reads into memory without size limits.
- Files: `src/app/api/ai/extract/route.ts` (lines 80-88), `src/app/api/ai/verify/route.ts` (lines 21-32)
- Impact: Large file uploads can exhaust memory. API calls hanging indefinitely. No user-facing feedback if extraction stalls.
- Fix approach: Add `timeout` parameter to OpenAI client. Limit file upload size (50 MB? configurable). Stream file reading if file > threshold. Add abort controller on client side with user feedback.

**Unhandled Promise Rejections in Components:**
- Issue: fetch() calls throughout the codebase don't all have `.catch()` handlers. Examples:
  - `src/app/page.tsx` line 20: `.catch(() => setLoading(false))` loses error details
  - `src/components/sections/Section11.tsx` line 142: Promise.all() in PDF export can fail silently if import fails
- Files: Multiple (see impact)
- Impact: Silent errors in production. Users see spinner forever or broken functionality without understanding why.
- Fix approach: Standardize error handling with typed error boundaries. Log all fetch errors to monitoring. Show user-facing error messages. Use AbortController with timeout.

## Known Bugs

**Daily Session Token Predictability:**
- Symptoms: Session cookies valid only for one day. Token is deterministic from password and date string.
- Files: `src/app/api/auth/login/route.ts` (line 18-21), `src/middleware.ts` (line 34-39)
- Trigger: Request authentication token for any date, compute token offline using the password
- Workaround: Rotate `ADMIN_PASSWORD` daily. Monitor for unauthorized sessions.

**Field Mapping Collision in AI Extraction:**
- Symptoms: Extracted field IDs may map to wrong form fields if field-mapping aliases are too generic.
- Files: `src/lib/ai/field-mappings.ts`, `src/app/api/ai/extract/route.ts` (lines 99-109)
- Trigger: Upload lab document with abbreviations like "T3" or "FSH" that could map to wrong hormone fields
- Workaround: Review extracted values in UI before accepting.

**CSV Export Type Coercion on Reimport:**
- Symptoms: Exporting CSV and reimporting loses type information. All values become strings unless explicitly numeric during import parsing.
- Files: `src/lib/csv/export.ts`, `src/lib/csv/import.ts` (line 117)
- Trigger: Export assessment with numbers, reimport, numbers remain as strings in store until edited
- Workaround: Always edit at least one field before submitting to re-coerce types.

## Security Considerations

**Weak Password-Only Auth:**
- Risk: Single environment variable (`ADMIN_PASSWORD`) is the only authentication. No audit trail, no multi-user support, no permission scoping.
- Files: `src/app/api/auth/login/route.ts`, `src/middleware.ts`
- Current mitigation: Session cookies are httpOnly and secure (in production).
- Recommendations: Add user table with bcrypt passwords. Implement proper JWT with secret. Add audit logging for assessment access. Consider OAuth2/OIDC for multi-user deployments. Rate-limit login attempts (e.g., 5 attempts per minute).

**Assessment Data Fully Exposed in JSON Blobs:**
- Risk: All assessment data stored as JSON text/jsonb in database. No field-level encryption. No column-level access control.
- Files: `src/lib/db/schema.ts`, `src/app/api/assessments/[id]/sections/[num]/route.ts`
- Current mitigation: Database behind authentication middleware. No export to third parties visible in code.
- Recommendations: Encrypt sensitive fields (health data, names, emails) at rest. Use TDE (Transparent Data Encryption) at database level. Implement field-level audit logging for access.

**AI Extraction Prompts Include Sample Field Names:**
- Risk: Prompts in `src/lib/ai/prompts.ts` list all expected field names, allowing users to see which biomarkers the system knows about.
- Files: `src/lib/ai/prompts.ts` (lines 15-89)
- Current mitigation: Prompts are server-side only (not sent to client).
- Recommendations: This is low-risk in context. If privacy-critical, move field list to database and dynamically inject into prompts.

**CSV Import Allows Arbitrary Assessment Creation:**
- Risk: No validation that CSV import comes from trusted source. Attacker with file upload access could inject assessments.
- Files: `src/app/api/assessments/import/route.ts`
- Current mitigation: Import endpoint requires authentication (middleware).
- Recommendations: Add CSV file signature validation if possible. Log all imports with user/timestamp. Implement soft-delete so bad imports can be audited.

## Performance Bottlenecks

**Section11 PDF Export Renders Entire Document in Memory:**
- Problem: `html2canvas-pro` renders full report as canvas, then converts to PDF. Large reports (many biomarkers) cause memory spike and slow export.
- Files: `src/components/sections/Section11.tsx` (lines 138-170+)
- Cause: No pagination during rendering. Entire DOM converted to bitmap before PDF generation.
- Improvement path: Use `jsPDF` directly with text rendering instead of canvas. Implement server-side PDF generation using a library like `pdfkit` or `puppeteer`. Cache PDF on first generation.

**TrendsTab Auto-Generates AI Assessment on Every Page Load:**
- Problem: Lines 274-278 in `TrendsTab.tsx` trigger API call to `/api/ai/client-assessment` even if data hasn't changed.
- Files: `src/app/clients/[name]/TrendsTab.tsx` (lines 234-278)
- Cause: Misuse of useState—the hook call inside a conditional breaks React rules. Local storage cache checked but re-fetched if expired.
- Improvement path: Move to `useEffect` with proper dependency tracking. Extend cache TTL. Debounce rapid page navigations.

**Assessment List Loads All Assessments Without Pagination:**
- Problem: GET `/api/assessments` returns all assessments ordered by update date. No limit, offset, or pagination.
- Files: `src/app/api/assessments/route.ts`, `src/app/page.tsx`
- Cause: Simplicity during development. OK for <1000 assessments, poor at scale.
- Improvement path: Add `limit`, `offset`, `sortBy` query params. Implement cursor-based pagination. Add database index on `updatedAt`.

**Normative Data Embedded in Code:**
- Problem: All biomarker thresholds (489 lines) hardcoded in `src/lib/normative/data.ts`. Updates require recompilation.
- Files: `src/lib/normative/data.ts`
- Cause: Made sense during development for immutable reference data.
- Improvement path: Move to database table `normative_thresholds`. Cache in memory with version check. Allow admin UI to update thresholds.

## Fragile Areas

**Section Components Directly Access Store:**
- Files: All `src/components/sections/Section*.tsx` components
- Why fragile: Each section tightly coupled to Zustand store structure. Schema changes require updates to every section. No validation layer between store and components.
- Safe modification: Create facade hooks (`useSection1Data()`, `useSection2Data()`) that abstract store structure. Add schema migration logic to handle old data formats.
- Test coverage: Section update tests present (`src/__tests__/sections/sections.test.tsx`) but incomplete—missing edge cases and store sync failures.

**AI Extraction Field Mapping:**
- Files: `src/lib/ai/field-mappings.ts` (249 lines), `src/app/api/ai/extract/route.ts` (lines 99-109)
- Why fragile: Mapping is a flat key-to-key lookup. New biomarkers require manual addition. No validation that GPT extracted field IDs match schema.
- Safe modification: Use structured field definitions (type-safe record with validation). Add test that extracted samples map correctly. Diff GPT response schema against expected schema in tests.
- Test coverage: Basic field mapping tested, but no integration tests with real lab PDFs or GPT responses.

**Report Generation (Section 11):**
- Files: `src/components/sections/Section11.tsx` (666 lines), `src/lib/normative/insights.ts` (297 lines)
- Why fragile: Insight generation and tier calculation logic intertwined. New insight categories require changes in multiple places (REPORT_MARKERS, generatePeak360Insights, Section11 rendering).
- Safe modification: Move insight playbook to data-driven structure (JSON config). Add type-safe insight schema. Test all insight paths with synthetic data.
- Test coverage: Rating tests present (`src/__tests__/normative/ratings.test.ts`) but insight tests incomplete—only 2-3 insight patterns tested.

## Scaling Limits

**SQLite Database Bottleneck:**
- Current capacity: SQLite with WAL mode handles ~1000 concurrent users. Beyond that, lock contention rises.
- Limit: Write throughput ~100 assessments/second per database file. Auto-save frequency (1s debounce) could spike to 200+ writes/sec if 200+ users editing simultaneously.
- Scaling path: Migrate to PostgreSQL (already code-supported via schema duality). Implement database connection pooling. Shard by client or assessment date if needed.

**Zustand Store Holds Full Section Data:**
- Current capacity: Storing 11 sections × ~50 fields × ~10 assessments in-memory (50 KB per session).
- Limit: Becomes problematic with 100+ concurrent users. No server-side session storage cleanup.
- Scaling path: Move to server-side session store (Redis). Lazy-load section data on demand. Implement LRU cache with TTL.

**PDF Export Single-Threaded:**
- Current capacity: One user can export PDF at a time (html2canvas is synchronous on client).
- Limit: 500+ concurrent users generate bottleneck on PDF export requests.
- Scaling path: Move PDF rendering to background job queue (Bull, RQ). Stream PDF generation via server. Cache common reports.

## Dependencies at Risk

**OpenAI API Dependency:**
- Risk: Section 5 and 6 document extraction rely entirely on OpenAI's gpt-4o model. No fallback if API rates limit or model changes.
- Impact: Users cannot upload documents if OpenAI is down. Extraction prompts must be rewritten if model changes behavior.
- Migration plan: Add support for alternative vision models (Claude 3.5 Sonnet, Gemini 2). Implement OCR fallback (Tesseract) for text extraction. Cache extraction results.

**html2canvas-pro License/Maintenance:**
- Risk: html2canvas-pro is a paid/commercial wrapper. If package abandoned, PDF export breaks.
- Impact: No fallback for PDF generation. Stuck on version that may have security issues.
- Migration plan: Audit html2canvas (open-source) as replacement. Implement server-side PDF rendering with pdfkit or puppeteer for better control.

**Drizzle ORM Major Version Risk:**
- Risk: Using Drizzle 0.45 (relatively new ORM). Breaking changes possible in 1.x.
- Impact: Schema migrations may fail. Type definitions could change.
- Migration plan: Keep lockfile pinned. Monitor Drizzle releases. Add integration tests for schema operations.

## Missing Critical Features

**No Data Backup Strategy:**
- Problem: No documented backup process for SQLite database. No replication, no snapshots.
- Blocks: Disaster recovery. HIPAA/GDPR compliance (must retain data with 7-year audit trail).
- Recommendation: Implement automated daily backups to S3/cloud storage. Set up replication if using PostgreSQL. Add retention policy config.

**No Audit Logging:**
- Problem: No tracking of who viewed/edited what assessment or when. No field-level change history.
- Blocks: Regulatory compliance. Security investigations. User accountability.
- Recommendation: Add audit log table. Log all assessment access, modifications with user/timestamp. Implement read-only audit log with soft deletes.

**No Export Controls/Compliance Features:**
- Problem: Export endpoint serves all data as CSV with no privacy controls. No data residency options.
- Blocks: HIPAA/GDPR deployments. Multi-tenant SaaS.
- Recommendation: Add role-based export restrictions. Implement PII masking on export. Add compliance checkboxes/terms acceptance on export.

**No Assessment Status Validation:**
- Problem: Status field is free-text string. No enum validation. No workflow state machine.
- Blocks: Preventing invalid status transitions (e.g., completed → in_progress).
- Recommendation: Define Assessment status enum. Add validation middleware. Implement soft-delete for abandoned assessments rather than true delete.

## Test Coverage Gaps

**Assessment Store Auto-Save Logic Not Tested:**
- What's not tested: Zustand store `isDirty` flag and auto-save debounce timing. No tests for concurrent updates or merge conflicts.
- Files: `src/lib/store/assessment-store.ts`, tests in `src/__tests__/store/assessment-store.test.ts`
- Risk: Silent data loss if debounce timer resets unexpectedly or network fails between auto-save attempts. No verification that `lastSaved` timestamp is accurate.
- Priority: High

**API Error Handling Not Tested:**
- What's not tested: Fetch error handling in components. Network failures, timeouts, invalid JSON responses.
- Files: All API calls in `src/app/page.tsx`, `src/components/sections/Section*.tsx`
- Risk: Spinner loops forever, data corruption if half-written response processed as valid JSON.
- Priority: High

**AI Extraction Edge Cases Not Covered:**
- What's not tested: Empty documents, PDFs with no text, corrupted images, GPT hallucinations (extracted values that don't exist on document).
- Files: `src/app/api/ai/extract/route.ts`, `src/app/api/ai/verify/route.ts`
- Risk: Invalid values silently accepted into assessment. Misleading confidence scoring.
- Priority: Medium

**Database Migration Consistency Not Tested:**
- What's not tested: Schema migration from SQLite to PostgreSQL. Rollback scenarios. Data integrity after migration.
- Files: `src/lib/db/index.ts` (runMigrations), both schema files
- Risk: Silent schema mismatches between environments. Data type inconsistencies.
- Priority: Medium

**CSV Import Charset and Encoding Edge Cases:**
- What's not tested: UTF-8 BOM handling, non-ASCII characters, mixed encodings, null bytes, very long field values (>64KB).
- Files: `src/lib/csv/import.ts` (RFC 4180 parser)
- Risk: Silent data corruption or import failure for international datasets.
- Priority: Low

---

*Concerns audit: 2026-03-29*
