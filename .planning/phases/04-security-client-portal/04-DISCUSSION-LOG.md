# Phase 4: Security & Client Portal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 04-security-client-portal
**Areas discussed:** Encryption scope, Key management, Audit log design, Backup strategy
**Mode:** Auto (all areas auto-selected, recommended defaults chosen)

---

## Encryption Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Sensitive health data fields only | Encrypt section 3/5 data blobs, extracted data, signatures; leave PII unencrypted for queries | ✓ |
| All assessment data | Encrypt all assessment_sections.data regardless of section number | |
| Full database encryption | Encrypt entire database file (SQLite Encryption Extension or similar) | |

**User's choice:** Sensitive health data fields only (auto-selected recommended default)
**Notes:** SECU-01 specifies "blood results and medical screening data" — encrypting only those keeps queries fast while protecting the most sensitive clinical data. Client PII left unencrypted for search/display functionality.

---

## Key Management

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variable with AES-256-GCM | Single ENCRYPTION_KEY env var, random IV per operation, no rotation in v1 | ✓ |
| Key management service (AWS KMS / Vault) | External key management with automatic rotation | |
| Per-record key derivation | Derive unique keys per assessment from master key | |

**User's choice:** Environment variable with AES-256-GCM (auto-selected recommended default)
**Notes:** Simplest approach meeting SECU-01. Key rotation tracked as DATA-02 for v2. Graceful degradation when key not set (dev environments).

---

## Audit Log Design

| Option | Description | Selected |
|--------|-------------|----------|
| Assessment-level read/write logging | Log assessment views, edits, exports, uploads at resource level | ✓ |
| Field-level change tracking | Log every individual field change with before/after values | |
| Action-only logging | Log only write operations (no read tracking) | |

**User's choice:** Assessment-level read/write logging (auto-selected recommended default)
**Notes:** Gives actionable audit trail without drowning in noise. Append-only table, admin-viewable with search/filter. Field-level logging deferred as overkill for current scale.

---

## Backup Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Application-triggered SQLite backup with cron | Daily .backup() API snapshots, 30-day retention, local storage | ✓ |
| WAL checkpoint + file copy | Checkpoint WAL then copy database file on schedule | |
| Streaming replication | Litestream or similar for continuous replication to cloud | |

**User's choice:** Application-triggered SQLite backup with cron (auto-selected recommended default)
**Notes:** SQLite .backup() API is atomic and non-blocking in WAL mode. Daily frequency matches data change rate. Local storage initially, cloud noted for future. Point-in-time recovery via WAL + daily snapshots.

---

## Claude's Discretion

- Encryption helper module structure and API surface
- Audit log middleware vs explicit logging approach
- Scheduler library choice (node-cron vs setInterval)
- Admin audit log UI layout
- Migration strategy for encrypting existing unencrypted data

## Deferred Ideas

- Encryption key rotation (v2 — DATA-02)
- Cloud backup storage (S3/DO Spaces)
- Automated restoration tooling
- Audit log retention/archival policy
- Field-level audit logging for compliance
