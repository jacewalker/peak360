# Phase 4: Security & Client Portal - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Encrypt sensitive health data at rest using AES-256-GCM, add assessment-level audit logging viewable by admins, and implement automated SQLite backups with point-in-time recovery. The application must continue functioning correctly with encrypted data (read, write, display in reports). No new user-facing features beyond the admin audit log browser.

</domain>

<decisions>
## Implementation Decisions

### Encryption Scope
- **D-01:** Encrypt `assessment_sections.data` JSON blobs for section 3 (medical screening) and section 5 (blood tests) only. These contain the clinically sensitive health data specified in SECU-01.
- **D-02:** Encrypt `uploadedFiles.extractedData` (AI-extracted lab values) and `signatures.signatureData` (consent signatures) — both contain sensitive client health information.
- **D-03:** Leave client PII (name, email, DOB) unencrypted — needed for query/search/display on dashboard and client list. Assessment metadata (dates, status, section progress) also remains unencrypted.
- **D-04:** Encryption is transparent to the application layer — encrypt on write, decrypt on read. Existing code that reads/writes section data should not need changes beyond the data access layer.

### Key Management
- **D-05:** Single `ENCRYPTION_KEY` environment variable containing a 32-byte key (hex or base64 encoded). AES-256-GCM with a random 12-byte IV generated per encryption operation.
- **D-06:** IV stored prepended to the ciphertext in the database column (standard pattern: `IV + authTag + ciphertext` as a single base64 string).
- **D-07:** No key rotation in v1. Key rotation is tracked as DATA-02 in REQUIREMENTS.md for v2 scope.
- **D-08:** If `ENCRYPTION_KEY` is not set, the application should log a warning but continue operating without encryption (graceful degradation for development environments).

### Audit Logging
- **D-09:** New `audit_logs` table with columns: id, user_id, action, resource_type, resource_id, metadata (JSON), ip_address, user_agent, created_at.
- **D-10:** Actions logged: assessment view, section edit, report export, file upload, admin actions (normative range changes, user management). Do NOT log: normative data reads, page navigation, auth token refreshes.
- **D-11:** Audit logs are append-only — no updates or deletes. Retention policy deferred to v2.
- **D-12:** Admin UI: searchable/filterable audit log browser as a table with pagination. Filter by user, action type, date range, resource.

### Backup Strategy
- **D-13:** Use SQLite `.backup()` API for atomic, non-blocking point-in-time snapshots (compatible with WAL mode).
- **D-14:** Schedule: daily backup via application-level cron (node-cron or similar library). Backup runs at a configurable time (default: 2:00 AM server time).
- **D-15:** Retention: 30 days rolling — delete backups older than 30 days after successful new backup.
- **D-16:** Storage: local `backups/` directory with timestamped filenames (e.g., `peak360-2026-04-12T02-00-00.db`). Cloud storage (S3/DO Spaces) noted as future enhancement.
- **D-17:** Point-in-time recovery: combine WAL mode continuous journaling with daily full snapshots. Recovery procedure documented but not automated in v1.

### Claude's Discretion
- Exact encryption helper module structure and API surface
- Audit log middleware vs explicit logging calls — pick whichever integrates cleanest
- Whether to use node-cron or a simpler setInterval-based scheduler
- Admin audit log UI layout and component structure
- Migration strategy for encrypting existing unencrypted data (one-time migration script)

### Folded Todos
- **Client portal with auth, data encryption, and backups** — the encryption and backup portions map directly to SECU-01 and SECU-03. Auth/portal portions already addressed in Phase 2.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `src/lib/db/schema.ts` — PostgreSQL schema with jsonb columns for section data
- `src/lib/db/schema-sqlite.ts` — SQLite schema with text/json columns for section data
- `src/lib/db/index.ts` — Database proxy, connection setup, WAL mode initialization

### Security Context
- `.planning/codebase/CONCERNS.md` — Documents "Assessment Data Fully Exposed in JSON Blobs", "No Audit Logging", "No Data Backup Strategy" as known gaps

### Auth System (Phase 2 output)
- `src/lib/auth/session.ts` — Current session management
- `src/middleware.ts` — Route protection and role checks

### Requirements
- `.planning/REQUIREMENTS.md` — SECU-01 (AES-256-GCM encryption), SECU-02 (audit logging), SECU-03 (automated backups)

### Prior Phase Context
- `.planning/phases/02-authentication-ownership/02-CONTEXT.md` — Auth decisions (Better Auth, roles, additive schema changes)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db/index.ts`: Database proxy pattern — encryption/decryption layer can wrap the existing db access
- `src/lib/auth/session.ts`: Session/user context available for audit log user_id
- `src/middleware.ts`: Request pipeline — audit logging can hook into middleware or API route handlers
- Better Auth session tables: `session` table already tracks ip_address and user_agent — reusable for audit context

### Established Patterns
- Drizzle ORM with dual schema (SQLite + PostgreSQL) — new audit_logs table needs both schema files updated
- API response format: `NextResponse.json({ success, data?, error? })` — audit logging wraps around existing handlers
- JSON blob storage in `assessment_sections.data` — encryption operates on the serialized JSON string before DB write
- WAL mode for SQLite — compatible with `.backup()` API for non-blocking snapshots

### Integration Points
- `assessment_sections` read/write paths in `src/app/api/assessments/[id]/sections/[num]/route.ts` — encrypt on PUT, decrypt on GET
- `uploadedFiles` write path in AI extraction routes — encrypt `extractedData` after extraction
- `signatures` write path in section 4 (informed consent) — encrypt `signatureData` on save
- Admin routes need new `/api/admin/audit-logs` endpoint
- Backup scheduler needs application startup hook (likely in `src/app/api/` or a standalone script)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for application-level AES-256-GCM encryption, audit logging patterns, and SQLite backup strategies.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Admin panel for normative range management** — Phase 3 scope, not security-related
- **Gender-based blood marker normative ranges** — Phase 1 scope
- **Report marker range visualization and recommendations** — Phase 1 scope

### Future Enhancements
- Encryption key rotation strategy (DATA-02 in REQUIREMENTS.md)
- Cloud backup storage (S3/DO Spaces)
- Automated backup restoration tooling
- Audit log retention policy and archival
- Field-level audit logging for compliance scenarios

</deferred>

---

*Phase: 04-security-client-portal*
*Context gathered: 2026-04-12*
