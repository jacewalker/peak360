# Phase 4: Security & Client Portal - Research

**Researched:** 2026-04-12
**Domain:** Application-level encryption, audit logging, SQLite backup
**Confidence:** HIGH

## Summary

Phase 4 adds three security capabilities to Peak360: AES-256-GCM encryption at rest for sensitive health data (blood tests, medical screening, AI extractions, signatures), an append-only audit log with admin browser UI, and automated SQLite backups with 30-day retention.

All three capabilities use Node.js built-in modules (crypto) and the existing better-sqlite3 driver (backup API). The only new dependency is node-cron for backup scheduling. The encryption layer intercepts JSON serialization/deserialization at the database access layer, making it transparent to existing application code. Audit logging adds a new table and a utility function called from API route handlers. Backups use better-sqlite3's native `.backup()` method which works correctly with WAL mode.

**Primary recommendation:** Implement encryption as a pair of `encrypt(plaintext)` / `decrypt(ciphertext)` functions in `src/lib/crypto.ts` that wrap Node.js `crypto.createCipheriv`/`createDecipheriv` with AES-256-GCM. Apply them in the section data read/write paths. Keep the encryption module stateless -- key comes from `process.env.ENCRYPTION_KEY` at call time.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Encrypt `assessment_sections.data` JSON blobs for section 3 (medical screening) and section 5 (blood tests) only. These contain the clinically sensitive health data specified in SECU-01.
- **D-02:** Encrypt `uploadedFiles.extractedData` (AI-extracted lab values) and `signatures.signatureData` (consent signatures) -- both contain sensitive client health information.
- **D-03:** Leave client PII (name, email, DOB) unencrypted -- needed for query/search/display on dashboard and client list. Assessment metadata (dates, status, section progress) also remains unencrypted.
- **D-04:** Encryption is transparent to the application layer -- encrypt on write, decrypt on read. Existing code that reads/writes section data should not need changes beyond the data access layer.
- **D-05:** Single `ENCRYPTION_KEY` environment variable containing a 32-byte key (hex or base64 encoded). AES-256-GCM with a random 12-byte IV generated per encryption operation.
- **D-06:** IV stored prepended to the ciphertext in the database column (standard pattern: `IV + authTag + ciphertext` as a single base64 string).
- **D-07:** No key rotation in v1. Key rotation is tracked as DATA-02 in REQUIREMENTS.md for v2 scope.
- **D-08:** If `ENCRYPTION_KEY` is not set, the application should log a warning but continue operating without encryption (graceful degradation for development environments).
- **D-09:** New `audit_logs` table with columns: id, user_id, action, resource_type, resource_id, metadata (JSON), ip_address, user_agent, created_at.
- **D-10:** Actions logged: assessment view, section edit, report export, file upload, admin actions (normative range changes, user management). Do NOT log: normative data reads, page navigation, auth token refreshes.
- **D-11:** Audit logs are append-only -- no updates or deletes. Retention policy deferred to v2.
- **D-12:** Admin UI: searchable/filterable audit log browser as a table with pagination. Filter by user, action type, date range, resource.
- **D-13:** Use SQLite `.backup()` API for atomic, non-blocking point-in-time snapshots (compatible with WAL mode).
- **D-14:** Schedule: daily backup via application-level cron (node-cron or similar library). Backup runs at a configurable time (default: 2:00 AM server time).
- **D-15:** Retention: 30 days rolling -- delete backups older than 30 days after successful new backup.
- **D-16:** Storage: local `backups/` directory with timestamped filenames (e.g., `peak360-2026-04-12T02-00-00.db`). Cloud storage (S3/DO Spaces) noted as future enhancement.
- **D-17:** Point-in-time recovery: combine WAL mode continuous journaling with daily full snapshots. Recovery procedure documented but not automated in v1.

### Claude's Discretion
- Exact encryption helper module structure and API surface
- Audit log middleware vs explicit logging calls -- pick whichever integrates cleanest
- Whether to use node-cron or a simpler setInterval-based scheduler
- Admin audit log UI layout and component structure
- Migration strategy for encrypting existing unencrypted data (one-time migration script)

### Deferred Ideas (OUT OF SCOPE)
- Admin panel for normative range management (Phase 3)
- Gender-based blood marker normative ranges (Phase 1)
- Report marker range visualization and recommendations (Phase 1)
- Encryption key rotation strategy (DATA-02, v2)
- Cloud backup storage (S3/DO Spaces)
- Automated backup restoration tooling
- Audit log retention policy and archival
- Field-level audit logging for compliance scenarios
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SECU-01 | AES-256-GCM encryption at rest for sensitive fields (blood results, medical screening) | Node.js crypto module verified for AES-256-GCM. Encryption targets: assessment_sections.data for sections 3 and 5, uploadedFiles.extractedData, signatures.signatureData. Format: base64(IV + authTag + ciphertext). |
| SECU-02 | Audit log recording who accessed what data and when | New audit_logs table (both schema files). Explicit logging calls in API route handlers using session context from requireSession(). Admin UI at /portal/admin/audit-logs. |
| SECU-03 | Automated SQLite backup strategy with point-in-time recovery capability | better-sqlite3 .backup() API verified working with WAL mode. node-cron for scheduling. Local backups/ directory with 30-day rolling retention. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 + React 19 + Tailwind CSS v4 + SQLite/Drizzle -- must stay consistent
- **Data sensitivity:** Blood results and medical screening data require encryption at rest
- **Backwards compatibility:** Existing assessments must continue to work
- **Dual schema:** Both `schema.ts` (PostgreSQL) and `schema-sqlite.ts` (SQLite) must be updated for new tables
- **Import aliases:** Always use `@/` imports, never relative paths
- **Type imports:** Use `import type { ... }` for TypeScript types
- **API response format:** `NextResponse.json({ success, data?, error? })`
- **Component pattern:** `'use client'` directive for interactive components

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js crypto | built-in | AES-256-GCM encryption/decryption | Zero dependencies, native performance, well-tested |
| better-sqlite3 | ^12.6.2 | SQLite driver with .backup() API | Already in project, backup API verified working |
| Drizzle ORM | 0.45.1 | Schema definition for audit_logs table | Already in project |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-cron | 4.2.1 | Cron-style scheduler for daily backups | Application-level scheduling, no OS dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron | setInterval | setInterval drifts over time, no cron expression syntax, harder to configure specific times |
| node-cron | OS crontab | Requires deployment-specific setup, not portable, harder to configure from env vars |
| Application-level encryption | SQLCipher | SQLCipher encrypts entire DB (overkill per D-01/D-03), requires different SQLite driver, breaks better-sqlite3 |

**Installation:**
```bash
npm install node-cron
npm install -D @types/node-cron
```

**Version verification:**
- node-cron: 4.2.1 (verified 2026-04-12 via npm view)
- @types/node-cron: 3.0.11 (verified 2026-04-12 via npm view)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── crypto.ts              # encrypt() / decrypt() / isEncrypted() helpers
│   ├── audit.ts               # logAuditEvent() helper
│   ├── backup.ts              # runBackup() / startBackupScheduler()
│   └── db/
│       ├── schema.ts          # + audit_logs table (PostgreSQL)
│       └── schema-sqlite.ts   # + audit_logs table (SQLite)
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── audit-logs/
│   │           └── route.ts   # GET with pagination/filtering
│   └── portal/
│       └── admin/
│           └── audit-logs/
│               └── page.tsx   # Audit log browser UI
└── scripts/
    └── encrypt-existing.ts    # One-time migration script
```

### Pattern 1: Transparent Encryption Layer
**What:** Encrypt/decrypt at the serialization boundary -- after JSON.stringify on write, before JSON.parse on read. The encrypted string replaces the plaintext in the database column.
**When to use:** For all columns identified in D-01 and D-02.
**Example:**
```typescript
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Support both hex (64 chars) and base64 (44 chars) encoded keys
  if (raw.length === 64) return Buffer.from(raw, 'hex');
  return Buffer.from(raw, 'base64');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext; // Graceful degradation (D-08)

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: base64(iv + tag + ciphertext) per D-06
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  if (!key) return ciphertext; // Graceful degradation

  // Detect if data is not encrypted (backwards compat with existing data)
  if (!isEncrypted(ciphertext)) return ciphertext;

  const combined = Buffer.from(ciphertext, 'base64');
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function isEncrypted(value: string): boolean {
  // Unencrypted JSON starts with { or [; base64-encoded ciphertext won't
  // Also check minimum length: IV(12) + tag(16) + at least 1 byte = 29 bytes -> ~40 base64 chars
  if (value.startsWith('{') || value.startsWith('[')) return false;
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length >= IV_LENGTH + TAG_LENGTH + 1;
  } catch {
    return false;
  }
}
```

### Pattern 2: Explicit Audit Logging
**What:** A `logAuditEvent()` function called explicitly in API route handlers after successful operations. Preferred over middleware because (a) middleware in Next.js runs at the edge and cannot access the database, and (b) explicit calls give precise control over what is logged (D-10 specifies only certain actions).
**When to use:** In every API route handler that performs a loggable action.
**Example:**
```typescript
// src/lib/audit.ts
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';

export type AuditAction =
  | 'assessment.view'
  | 'section.edit'
  | 'report.export'
  | 'file.upload'
  | 'normative.update'
  | 'user.manage';

export async function logAuditEvent(params: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: uuid(),
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Audit logging should never break the main operation
    console.error('Failed to write audit log');
  }
}
```

### Pattern 3: Backup Scheduler
**What:** Use node-cron to schedule daily backups via better-sqlite3's `.backup()` API. Start the scheduler on application boot.
**When to use:** Only when running SQLite (not PostgreSQL -- PostgreSQL has its own backup tools).
**Example:**
```typescript
// src/lib/backup.ts
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const RETENTION_DAYS = 30;

export async function runBackup(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `peak360-${timestamp}.db`;
  const dest = path.join(BACKUP_DIR, filename);

  // Access the underlying better-sqlite3 instance
  // The db proxy wraps drizzle; need raw access for .backup()
  const Database = require('better-sqlite3');
  const rawDb = new Database('local.db', { readonly: true });
  await rawDb.backup(dest);
  rawDb.close();

  // Clean old backups
  const files = fs.readdirSync(BACKUP_DIR);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of files) {
    const filepath = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(filepath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(filepath);
    }
  }

  return dest;
}

export function startBackupScheduler() {
  const schedule = process.env.BACKUP_SCHEDULE ?? '0 2 * * *'; // 2 AM daily
  cron.schedule(schedule, () => {
    runBackup().catch((err) => console.error('Backup failed:', err));
  });
}
```

### Anti-Patterns to Avoid
- **Encrypting at the component level:** Encryption must happen at the data access layer, not in React components or API request handlers. Components should never see ciphertext.
- **Storing the encryption key in code or config files:** Key must come from environment variable only. Never commit a key to git.
- **Using CBC mode instead of GCM:** CBC does not provide authentication. GCM provides both confidentiality and integrity (detects tampering).
- **Reusing IVs:** Every encryption call must generate a fresh random IV. IV reuse with the same key completely breaks GCM security.
- **Making audit log writes block the response:** Audit logging should be fire-and-forget with error swallowing. Never let a logging failure cause a 500 error.
- **Opening a second database connection for backup:** Use a separate readonly connection to avoid interfering with the main application connection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AES-256-GCM | Custom crypto primitives | Node.js `crypto` module | Built-in, battle-tested, FIPS-compliant |
| Cron scheduling | Custom timer/interval loop | node-cron | Handles cron expression parsing, timezone, drift correction |
| SQLite backup | File copy of .db file | better-sqlite3 `.backup()` API | Atomic snapshot, WAL-compatible, non-blocking |
| UUID generation | Custom ID generator | `uuid` (already installed) | RFC 4122 compliant, collision-resistant |

**Key insight:** The entire encryption implementation uses zero external dependencies beyond what Node.js provides. The backup uses the existing better-sqlite3 driver's built-in API. Only the cron scheduler requires a new package.

## Common Pitfalls

### Pitfall 1: Forgetting to Handle Unencrypted Legacy Data
**What goes wrong:** After deploying encryption, existing database rows still contain plaintext JSON. Decrypt attempts on plaintext will throw authentication errors.
**Why it happens:** GCM decryption fails if the data is not actually encrypted (invalid auth tag).
**How to avoid:** The `isEncrypted()` detection function checks whether data looks like base64-encoded ciphertext or raw JSON. Decrypt gracefully falls back. Additionally, run a one-time migration script to encrypt all existing sensitive data.
**Warning signs:** "Unsupported state or unable to authenticate data" errors after deployment.

### Pitfall 2: Backup Scheduler Not Starting
**What goes wrong:** Backups never run because the scheduler initialization code is never called.
**Why it happens:** Next.js API routes are cold-started on demand. There is no guaranteed "application start" hook in serverless Next.js.
**How to avoid:** Initialize the backup scheduler in the database module (`src/lib/db/index.ts`) or in a custom server entry point. For DigitalOcean App Platform with standalone output, the scheduler runs in the same Node process as the server. Alternatively, expose a `/api/admin/backup` endpoint for manual triggers and document cron via OS or platform scheduler as fallback.
**Warning signs:** `backups/` directory remains empty after deployment.

### Pitfall 3: PostgreSQL Schema Mismatch
**What goes wrong:** The audit_logs table is added to the SQLite schema but forgotten in the PostgreSQL schema (or vice versa).
**Why it happens:** This project maintains dual schemas (`schema.ts` for PG, `schema-sqlite.ts` for SQLite).
**How to avoid:** Always update both schema files together. The audit_logs table definition is identical in structure; only the column type helpers differ (`text()` vs `jsonb()` for the metadata column).
**Warning signs:** "relation audit_logs does not exist" errors in production (which uses PostgreSQL).

### Pitfall 4: Encryption Key Not Available in Production
**What goes wrong:** Application deploys without `ENCRYPTION_KEY` set, silently stores data unencrypted.
**Why it happens:** D-08 specifies graceful degradation -- no crash, just a warning. In production this is a security gap.
**How to avoid:** Log a prominent warning at startup when `ENCRYPTION_KEY` is missing. Consider adding a build-time or startup check that requires the key in production (`NODE_ENV=production`).
**Warning signs:** Database file inspection shows plaintext JSON for sections 3 and 5.

### Pitfall 5: Audit Log Table Growing Unbounded
**What goes wrong:** Over time, audit_logs becomes the largest table, slowing queries.
**Why it happens:** Append-only with no retention policy (deferred to v2 per D-11).
**How to avoid:** Add indexes on `created_at`, `user_id`, and `action` columns from the start. The admin UI should use cursor-based or offset pagination. Consider adding a `created_at` index as a clustered/sorted index hint.
**Warning signs:** Slow audit log page loads after a few months of use.

## Code Examples

### Audit Logs Schema (SQLite)
```typescript
// In schema-sqlite.ts
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});
```

### Audit Logs Schema (PostgreSQL)
```typescript
// In schema.ts
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});
```

### Encryption Integration in Section Route
```typescript
// In src/app/api/assessments/[id]/sections/[num]/route.ts
import { encrypt, decrypt } from '@/lib/crypto';

const ENCRYPTED_SECTIONS = new Set([3, 5]);

// In GET handler, after fetching row:
let data = row?.data;
if (data && ENCRYPTED_SECTIONS.has(sectionNum) && typeof data === 'string') {
  data = JSON.parse(decrypt(data));
}

// In PUT handler, before writing:
let dataToStore = body.data;
if (ENCRYPTED_SECTIONS.has(sectionNum)) {
  dataToStore = encrypt(JSON.stringify(body.data));
}
```

### Extract Request Headers for Audit Context
```typescript
// Helper to get IP and user agent from request
import { headers } from 'next/headers';

async function getRequestContext() {
  const h = await headers();
  return {
    ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}
```

### One-Time Migration Script
```typescript
// scripts/encrypt-existing.ts
// Run with: npx tsx scripts/encrypt-existing.ts
import Database from 'better-sqlite3';
import { encrypt, isEncrypted } from '../src/lib/crypto';

const db = new Database('local.db');
const SENSITIVE_SECTIONS = [3, 5];

const rows = db.prepare(
  `SELECT id, section_number, data FROM assessment_sections WHERE section_number IN (${SENSITIVE_SECTIONS.join(',')})`
).all() as { id: number; section_number: number; data: string | null }[];

let encrypted = 0;
for (const row of rows) {
  if (!row.data || isEncrypted(row.data)) continue;
  const enc = encrypt(row.data);
  db.prepare('UPDATE assessment_sections SET data = ? WHERE id = ?').run(enc, row.id);
  encrypted++;
}
console.log(`Encrypted ${encrypted} rows`);

// Also encrypt uploadedFiles.extractedData and signatures.signatureData
// ... similar pattern for each table
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQLCipher (full-DB encryption) | Application-level field encryption | Always valid | Fine-grained control, no driver change |
| crypto.createCipher (deprecated) | crypto.createCipheriv | Node.js 10+ | Must use IV variant; createCipher removed |
| File copy for SQLite backup | .backup() API | better-sqlite3 v7+ | Atomic, WAL-safe, non-blocking |

**Deprecated/outdated:**
- `crypto.createCipher()` / `crypto.createDecipher()`: Removed in Node.js 22. Always use `createCipheriv` / `createDecipheriv`.

## Open Questions

1. **Raw database access for backup**
   - What we know: Drizzle wraps better-sqlite3, but `.backup()` is on the raw driver instance. The current `db` export is a Drizzle proxy.
   - What's unclear: Whether opening a second readonly better-sqlite3 connection to `local.db` for backup is safe while the main connection is active.
   - Recommendation: Verified that better-sqlite3 supports concurrent connections and `.backup()` with WAL mode. Open a separate readonly connection for backup operations. This is the documented approach.

2. **Backup scheduler lifecycle in Next.js standalone mode**
   - What we know: DigitalOcean App Platform runs Next.js in standalone mode (single Node.js process).
   - What's unclear: Whether the process stays alive continuously or gets recycled.
   - Recommendation: Initialize scheduler on first request via the db module. Also expose a manual `/api/admin/backup` endpoint as fallback. Document OS-level cron as production alternative.

3. **Encryption for PostgreSQL JSONB columns**
   - What we know: SQLite stores JSON as text, so encryption produces a text string that goes directly into the column. PostgreSQL uses JSONB.
   - What's unclear: Encrypted data is an opaque base64 string, not valid JSON. Storing it in a JSONB column would fail.
   - Recommendation: For PostgreSQL, the encrypted columns should use `text` type instead of `jsonb`. This requires a schema migration for the affected columns. However, since only sections 3 and 5 are encrypted and the column stores arbitrary JSON, an alternative is to store the encrypted string as a JSON string value (e.g., `"encrypted:base64..."`) which is valid JSONB. The simpler approach is to encrypt the JSON string and store it in a text column -- but this requires altering the column type. **Flag for planner: this needs a clear decision on PG column handling.**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js crypto | Encryption | Yes | Built-in | -- |
| better-sqlite3 | Backup API | Yes | 12.6.2 | -- |
| node-cron | Backup scheduling | Not installed | 4.2.1 (npm) | setInterval or OS cron |
| uuid | Audit log IDs | Yes | Installed | -- |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- node-cron: Not yet installed, trivial `npm install` step

## Sources

### Primary (HIGH confidence)
- Node.js crypto module documentation -- AES-256-GCM createCipheriv/createDecipheriv API verified via runtime test
- better-sqlite3 backup API -- `.backup(destination)` returns Promise, verified via runtime test on local machine
- better-sqlite3 npm package -- version 12.6.2, backup API confirmed working with WAL mode

### Secondary (MEDIUM confidence)
- [AES-256-GCM Node.js pattern](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81) -- IV + authTag + ciphertext concatenation pattern
- [node-cron npm](https://www.npmjs.com/package/node-cron) -- version 4.2.1, cron expression scheduler
- [better-sqlite3 GitHub API docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) -- backup() method signature and behavior

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js crypto is built-in, better-sqlite3 backup verified locally, node-cron is stable
- Architecture: HIGH - Encryption/decryption pattern is standard, audit logging is straightforward table + utility function
- Pitfalls: HIGH - All pitfalls identified from direct code analysis of existing schema and route handlers

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, no fast-moving dependencies)
