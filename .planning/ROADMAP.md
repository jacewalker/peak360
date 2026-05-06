# Roadmap: Peak360 Milestone 1

## Overview

This milestone transforms Peak360 from a single-user assessment tool into a multi-user, clinically accurate platform. The work starts by fixing clinical correctness (gender-specific ranges and report improvements), then layers on authentication and ownership, followed by admin-managed normative data, and finally security hardening with the client-facing portal. Each phase delivers a coherent capability that builds on the previous one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Clinical Accuracy & Report Quality** - Gender-specific ratings, range visualizations, referral flags, and actionable recommendations
- [ ] **Phase 2: Authentication & Ownership** - Role-based auth, user accounts, assessment ownership, client invitations
- [ ] **Phase 3: Admin Panel & Normative Data Management** - DB-backed normative ranges, admin CRUD UI, range versioning, red flag weighting
- [ ] **Phase 4: Security & Client Portal** - Encryption at rest, audit logging, automated backups, client read-only portal

## Phase Details

### Phase 1: Clinical Accuracy & Report Quality
**Goal**: Coaches can deliver clinically accurate, gender-aware assessments with visual range indicators and actionable recommendations
**Depends on**: Nothing (first phase)
**Requirements**: CLIN-01, CLIN-02, CLIN-03, CLIN-04, REPT-01, REPT-02, REPT-03, REPT-04, REPT-05
**Success Criteria** (what must be TRUE):
  1. A female client's blood marker ratings differ from a male client's for gender-sensitive markers (hemoglobin, ferritin, testosterone, iron, creatinine)
  2. Section 11 report displays a horizontal range bar next to each rated marker showing the value's position across all 5 tiers
  3. Markers critically out of range show a visible referral flag recommending further medical investigation
  4. Markers in poor or cautious tiers display supplementation and lifestyle recommendations
  5. A medical advice disclaimer is clearly visible on every generated report
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Gender-specific blood marker data layer (types, ranges, rating engine, report-markers)
- [x] 01-02-PLAN.md — Enhanced insights with specific supplement dosages and lifestyle recommendations
- [x] 01-03-PLAN.md — Report UI: range bars, referral flags, and medical disclaimer
**UI hint**: yes

### Phase 2: Authentication & Ownership
**Goal**: Users can securely log in with role-appropriate access, and every assessment is owned by a specific coach and linked to a specific client
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. A coach can log in with credentials and see only their own assessments on the dashboard
  2. An admin can log in and access admin-only routes that coaches and clients cannot reach
  3. A coach can invite a client via email link, and that client can log in to view their own assessments in read-only mode
  4. API routes reject unauthenticated requests and enforce role-based access independently of middleware
  5. A client cannot view or access assessments belonging to other clients
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md -- Auth data layer: Better Auth install, server/client config, DB schemas, email sender, seed script (AUTH-01, AUTH-02, AUTH-04)
- [ ] 02-02-PLAN.md -- Middleware, login UI, and session management
- [x] 02-03-PLAN.md -- API protection, ownership enforcement, client invitations

### Phase 3: Admin Panel & Normative Data Management
**Goal**: Admins can manage normative ranges through a UI, and the rating engine uses DB-backed ranges with hardcoded fallback and per-assessment versioning
**Depends on**: Phase 2
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06
**Success Criteria** (what must be TRUE):
  1. An admin can browse all normative markers grouped by category (blood, body comp, cardio, strength, mobility, balance) in the admin UI
  2. An admin can edit min/max tier values for any marker and see changes reflected in new assessments
  3. Existing assessments retain the normative range version they were created with, unaffected by subsequent admin edits
  4. If no DB overrides exist for a marker, the system falls back to hardcoded defaults and ratings still work correctly
  5. An admin can configure red flag marker severity weighting
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — DB schema, types, query layer, and rating engine fallback (ADMN-01, ADMN-02)
- [x] 03-02-PLAN.md — Normative range versioning with assessment snapshots (ADMN-05)
- [ ] 03-03-PLAN.md — Admin browse UI: category browser with search/filter (ADMN-03)
- [ ] 03-04-PLAN.md — Admin edit UI: tier editor, severity slider, save/reset (ADMN-04, ADMN-06)
**UI hint**: yes

### Phase 4: Security & Client Portal
**Goal**: Sensitive health data is encrypted at rest with audit trails and automated backups
**Depends on**: Phase 2, Phase 3
**Requirements**: SECU-01, SECU-02, SECU-03
**Success Criteria** (what must be TRUE):
  1. Blood test results and medical screening data are encrypted at rest using AES-256-GCM; raw sensitive data is not visible in the database file
  2. An audit log records who accessed what assessment data and when, viewable by admins
  3. Automated SQLite backups run on a schedule with point-in-time recovery capability
  4. The application continues to function correctly with encrypted data (read, write, display in reports)
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Encryption at rest: AES-256-GCM crypto module, schema additions, route integration, migration script (SECU-01)
- [x] 04-02-PLAN.md — Automated SQLite backups with daily scheduling and 30-day retention (SECU-03)
- [x] 04-03-PLAN.md — Audit logging: event logger, route integration, admin browser UI (SECU-02)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Clinical Accuracy & Report Quality | 0/3 | Planning complete | - |
| 2. Authentication & Ownership | 1/3 | In progress | - |
| 3. Admin Panel & Normative Data Management | 0/4 | Planning complete | - |
| 4. Security & Client Portal | 3/3 | Complete | 2026-04-13 |
| 5. Migrate PDF generation to react-pdf/renderer | 0/4 | UAT gap closure | - |

### Phase 5: Migrate PDF generation to react-pdf/renderer

**Goal:** Replace html2canvas+jsPDF rasterize-and-slice PDF export with @react-pdf/renderer for native vector PDFs with built-in pagination, selectable text, and smaller file sizes
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06, PDF-07, PDF-08
**Depends on:** None (independent of other phases)
**Success Criteria** (what must be TRUE):
  1. Export PDF button produces a vector PDF with selectable text (not a raster bitmap)
  2. All report sections (header, readiness, medical, consent, tier summary, markers, insights, disclaimer) appear in the PDF
  3. Range bars render as SVG with 5 colored segments and a needle indicator
  4. Page breaks never split a marker row mid-row
  5. PDF file size is under 500KB (down from 2-5MB)
  6. html2canvas-pro and jspdf are fully removed from the project
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — Install deps, shared PDF foundation (types, colors, styles), server-side data loader, API route shell (PDF-01, PDF-02, PDF-03)
- [x] 05-02-PLAN.md — Build all react-pdf report components and wire into Peak360Report document (PDF-04, PDF-05, PDF-06)
- [x] 05-03-PLAN.md — Replace Section 11 export with fetch-and-download, remove old deps, visual verification (PDF-07, PDF-08)
- [x] 05-04-PLAN.md — Fix footer text overflow and add page break before Detailed Results (gap closure)

### Phase 7: Multi-tenant auth UX

**Goal:** Complete the deferred client and coach experiences from milestone v3.0 — distinct login flows per role, coach dashboard differentiated from admin, invitation flow accepts either coach or admin as inviter, multi-coach data scoping enforced (coach sees own clients only, admin sees all plus own clients), admins inherit coach capabilities (admin IS a coach but not all coaches are admins), clients read-only on own data.
**Requirements**: TBD (run /gsd-spec-phase 7 to clarify and lock)
**Depends on:** Phase 2 (auth backbone), Phase 4 (encryption + audit)
**Plans:** 0 plans

**Open spec questions to resolve before planning:**
- Login UX differentiation — separate URLs (e.g. `/login/client`, `/login/coach`) vs. same URL with mode toggle vs. branding-only?
- Coach dashboard vs. admin dashboard — what differs beyond data scope (UI affordances, invitation surfaces, navigation)?
- Admin acting as coach for own clients — "coach mode" toggle, or scope inferred from `coach_id` ownership only?
- Self-service signup vs. invitation-only for coaches?

Plans:
- [ ] TBD (run /gsd-spec-phase 7 → /gsd-plan-phase 7 to break down)
