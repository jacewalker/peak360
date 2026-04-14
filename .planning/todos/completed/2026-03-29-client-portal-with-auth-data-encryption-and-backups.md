---
created: 2026-03-29T05:57:00.000Z
title: Client portal with auth, data encryption, and backups
area: auth
files:
  - src/lib/db/schema.ts
  - src/middleware.ts
  - src/app/login/page.tsx
---

## Problem

Currently only coaches/admins can log in (single shared password via ADMIN_PASSWORD env var). Clients have no way to access their own assessment data. Coaches must manually share results (PDF export or in-person review). Clients who do multiple assessments over time have no way to track their longitudinal progress independently.

Additionally, health assessment data is sensitive (blood results, medical history) — there's no encryption at rest, no backup strategy, and no multi-tenancy data isolation.

## Solution

- **Client accounts & auth:**
  - Add a `users` table with role-based access (coach/client)
  - Clients get invited by coaches (email link or generated credentials)
  - Client login gives read-only access to their own assessments
  - Clients can view all their assessments and track progress across multiple visits
  - Coach view shows all clients; client view shows only their own data

- **Data structure:**
  - Link assessments to client user accounts (not just name strings)
  - Support multiple assessments per client with chronological ordering
  - Client dashboard showing trends across assessments

- **Encryption & security:**
  - Encrypt sensitive fields at rest (blood results, medical screening answers)
  - Use application-level encryption (AES-256) with key management
  - Audit log for data access

- **Backups:**
  - Automated SQLite backup strategy (scheduled dumps, off-site copies)
  - Point-in-time recovery capability
  - Data export for client portability (GDPR-style data access requests)
