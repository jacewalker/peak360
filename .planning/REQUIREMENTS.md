# Requirements: Peak360 Milestone 3 — Client Login & Trainer Dashboard

**Defined:** 2026-04-12
**Core Value:** Clients can securely log in to view their own assessment results, and coaches have a dedicated dashboard to manage clients, track progress, and deliver assessments.

**Constraint:** No data loss on existing database. Schema changes must be additive only (new columns/tables with defaults, new tables). Existing assessments without ownership must continue to work.

## v3.0 Requirements

Requirements for Milestone 3. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in with email and password using role-based accounts (admin, coach, client)
- [ ] **AUTH-02**: Coach can create and manage their own account
- [ ] **AUTH-03**: Admin can access admin-only routes that coaches and clients cannot reach
- [ ] **AUTH-04**: Session persists across browser refresh and expires after inactivity
- [ ] **AUTH-05**: API routes reject unauthenticated requests and enforce role-based access independently of middleware

### Client Portal

- [ ] **CLNT-01**: Client can log in and see only their own assessments in a read-only view
- [ ] **CLNT-02**: Client can view their completed assessment report (Section 11) from the portal
- [ ] **CLNT-03**: Client cannot view or access assessments belonging to other clients
- [ ] **CLNT-04**: Coach can invite a client via email link or generated credentials

### Coach Dashboard

- [ ] **DASH-01**: Coach sees a dashboard with their client list and assessment overview
- [ ] **DASH-02**: Coach can create a new assessment linked to a specific client
- [ ] **DASH-03**: Coach can view assessment history and progress for each client
- [ ] **DASH-04**: Assessment ownership: each assessment is linked to a coach_id and client_id

### Data Safety

- [ ] **SAFE-01**: Existing assessments without ownership fields continue to work (backwards compatible)
- [ ] **SAFE-02**: Database schema changes are additive only (new columns/tables); no data loss

## Previous Milestone Requirements

### v1.0 MVP (Phases 1-5)
- Clinical Accuracy (CLIN-01-04): Gender-specific ratings — Partial
- Report Visualization (REPT-01-05): Range bars, referral flags — Partial
- Admin Panel (ADMN-01-06): Normative data management — Partial
- Security (SECU-01-03): Encryption, audit, backup — Pending
- PDF Migration (PDF-01-08): React-pdf renderer — Complete

### v2.0 Landing Page (Phases 6-7)
- Landing Page Content (LAND-01-07): All content sections — Pending
- Contact Form (CONT-01-03): Form with DB persistence — Pending
- Design & Responsiveness (DSGN-01-03): Brand tokens, responsive — Pending
- Hostname Routing (HOST-01-03): Middleware routing, DNS — Pending

## Future Requirements

### Client Engagement

- **ENGE-01**: Client dashboard showing trends across multiple assessments with charts
- **ENGE-02**: Magic link login for clients (requires email infrastructure)
- **ENGE-03**: Coach notes per assessment visible to client
- **ENGE-04**: Branded PDF export with coach/business logo

### Security Hardening

- **SECU-01**: AES-256-GCM encryption at rest for sensitive fields
- **SECU-02**: Audit log recording who accessed what data and when
- **SECU-03**: Automated backup strategy with point-in-time recovery

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth/social login | Email/password sufficient for v3.0; adds complexity |
| Two-factor authentication | Future enhancement; not critical for initial auth |
| Password reset via email | Requires email sending infrastructure; coaches can reset manually for now |
| Real-time notifications | Not needed for initial dashboard |
| Client self-registration | Clients are invited by coaches; no public signup |
| Data encryption at rest | Deferred to security-focused milestone |
| Existing table schema changes | No data loss constraint; additive only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | — |

**Coverage:**
- v3.0 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
