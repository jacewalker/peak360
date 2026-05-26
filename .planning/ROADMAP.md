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
**Requirements**: REQ-7.1 through REQ-7.12 (locked in 07-SPEC.md)
**Depends on:** Phase 2 (auth backbone), Phase 4 (encryption + audit)
**Plans:** 9 plans

Plans:
- [x] 07-01-PLAN.md — Auth config: disableSignUp + sendResetPassword + /reset-password page (REQ-7.2, REQ-7.8)
- [x] 07-02-PLAN.md — Sidebar role-filtered nav with no privileged-item flash (REQ-7.3)
- [x] 07-03-PLAN.md — /api/assessments JOIN user table to project coachName (REQ-7.4 enabler)
- [x] 07-04-PLAN.md — Login page rework: mode toggle + remove signup + Forgot/Magic-link CTAs (REQ-7.1, REQ-7.2, REQ-7.8, REQ-7.9)
- [x] 07-05-PLAN.md — Portal dashboard role-aware grouping + empty states + client trends (REQ-7.4, REQ-7.5, REQ-7.7, REQ-7.12)
- [x] 07-06-PLAN.md — Invitations API rewrite + /portal/admin/invitations page + StatusPill (REQ-7.11, REQ-7.2)
- [x] 07-07-PLAN.md — Admin users API + /portal/admin/users page + last-admin guard + audit log + RolePill + Toast (REQ-7.10)
- [x] 07-08-PLAN.md — Client read-only /report route + section page redirect + admin home placeholder replacement (REQ-7.6, REQ-7.10, REQ-7.11)
- [x] 07-09-PLAN.md — Security regression tests (auth-config, invitations role, last-admin-guard, sidebar role-flash, client redirect)
### Phase 8: Client report design refresh

**Goal:** Replace the dense Section 11 report hero with a five-pillar Peak Living module (portal interactive + PDF static mirror) backed by admin-authored definitions, page copy, and per-assessment per-pillar prescriptions, with composite-score traffic-light status derived from existing tier ratings.
**Requirements**: REQ-08-01 through REQ-08-10 (implicit, locked via decisions D-01..D-30 in 08-CONTEXT.md and the 08-UI-SPEC.md visual contract)
**Depends on:** Phase 7
**Plans:** 5 plans

Plans:
- [x] 08-01-PLAN.md — Schema (3 new tables: pillar_definitions, pillar_page_copy, pillar_prescriptions) + idempotent seed migration + AuditAction extension + BLOCKING db push (REQ-08-05, REQ-08-08; D-13, D-17, D-18, D-19)
- [x] 08-02-PLAN.md — Pure pillar layer: types, single-source-of-truth colours, marker→pillar mapping with D-05 Option A balance reclassification, score formula, SSR queries + Vitest unit tests (REQ-08-04; D-05, D-06, D-08, D-10, D-28)
- [x] 08-03-PLAN.md — Portal: hand-rolled Dialog + PillarsGrid/Card/Modal + Detailed marker results disclosure + ReportShell + extend SSR report page with pillar/page-copy/prescriptions/markers data load (preserves Phase 7 BL-05) (REQ-08-01, REQ-08-02, REQ-08-09; D-01..D-03, D-21..D-25, D-29)
- [x] 08-04-PLAN.md — Admin authoring: /api/admin/pillars + /api/admin/assessments/[id]/prescriptions + /portal/admin/pillars + /portal/admin/assessments/[id]/prescriptions + RBAC regression tests (REQ-08-06, REQ-08-07, REQ-08-08; D-12, D-15, D-16, D-19, D-20, D-30)
- [x] 08-05-PLAN.md — PDF mirror: extend ReportData + loadReportData + new PillarsPage component + insert before TierSummary in Peak360Report (REQ-08-03, REQ-08-10; D-01, D-26..D-28)

### Phase 9: Brand-language alignment across portal, dashboard, assessment, and client surfaces

**Goal:** Promote the landing-page brand language (dark `#0a0a0b` canvas, cream `#ece5d3` text, gold-brand `#c9a24a` accents, Inter Tight + JetBrains Mono) into every authenticated surface (login, reset-password, sidebar, portal dashboard, assessments list, clients list, client detail, admin pages, and all 11 assessment-section forms) via additive token migration, route-segment theme gating, and in-place restyle — with Phase 8 report card (`/portal/assessment/[id]/report`) and Phase 5 PDF preserved verbatim.
**Requirements**: UI-SPEC-AC-1 through UI-SPEC-AC-10 (implicit, locked via the 10-item Acceptance Heuristics in 09-UI-SPEC.md and decisions D-01..D-18 in 09-CONTEXT.md)
**Depends on:** Phase 8
**Plans:** 2/2 plans complete

Plans:
- [x] 09-01-PLAN.md — Foundations + auth surfaces: globals.css token additions, font rebind (Inter Tight + JetBrains Mono), theme-dark wrappers on portal/login/reset-password layouts (incl. NEW reset-password/layout.tsx), restyle Sidebar/Header/ProgressBar/NavigationButtons, MonoEyebrow primitive, ship /login + /reset-password (UI-SPEC-AC-1..UI-SPEC-AC-10)
- [x] 09-02-PLAN.md — Working surfaces: form-component sweep (all 11 sections inherit), SectionHeader mono eyebrow + Section 11 page-level injection, Dialog + Toast + MetricChart restyle, every /portal page (dashboard, clients, clients/[name], assessments, every admin/*), Phase 8 report-frame inner light wrapper (D-09 contract) (UI-SPEC-AC-1..UI-SPEC-AC-10)

### Phase 10: Section 11 + PDF brand language alignment

**Goal:** Retokenize Section 11 (in-app longevity report) and the PDF renderer (src/lib/pdf/) to the Phase 9 brand system — eliminate residual blue/yellow/white legacy palette. Section 11 must render correctly on the dark portal canvas; PDF must align with the Phase 8 print-safe variant of the same system (cream/navy/gold-brand). Acceptance: zero hardcoded hex literals or `text-white`/`bg-white`/legacy `gold` (yellow) tokens in Section 11; PDF visual diff against Phase 8 confirms consistent brand language; existing data display unchanged.
**Requirements**: REQ-9.1 (brand consistency across portal surfaces), inherited from Phase 9
**Depends on:** Phase 9
**Plans:** 1/2 plans executed

Plans:
- [ ] 10-01-PLAN.md — Section 11 in-app retokenization: light card surface, Phase 8 brand vocabulary, eliminate legacy navy/gold/white literals, add print-safe alias tokens to globals.css
- [x] 10-02-PLAN.md — PDF renderer brand alignment: shift COLORS.gold + COLORS.goldDark to gold-brand/champagne, route stray hex literals (MarkerTable/MarkerRow/ConsentStatus) through tokens, preserve Phase 8 sovereign palettes

### Phase 11: Report marker-detail expansion + admin coach insights

**Goal:** In the Longevity Analysis report's pillar modals (`PillarsDisplayModal`), make each marker clickable to reveal a detail panel — Definition (gender-neutral), Impact (gender-neutral), and a Coach Insight matched to the client's tier and gender — with two-pane master/detail on desktop and drill-in on mobile. Back it with a new admin-only global `marker_content` store (definition, impact, and a per-tier × per-gender coach-insight matrix), an admin authoring UI cloned from the normative-ranges editor, a client-readable report-read API, and pre-seeded researched draft content for all ~98 REPORT_MARKERS. Coach Insights fall back to the existing `generatePeak360Insights` output when unauthored. Web report only — no PDF/`@react-pdf` changes.
**Requirements**: Implicit, locked via decisions D-01..D-14 in 11-CONTEXT.md and the `mockups/marker-detail-modal.html` visual contract
**Depends on:** Phase 8 (pillar modal + global-content/admin/audit patterns), Phase 10 (Section 11 brand tokens)
**Plans:** 2/4 plans executed

Plans:
- [x] 11-01-PLAN.md — Foundation: marker_content schema (D-08) + MarkerContent queries (D-07) + audit action (D-11) + researched draft seed for all REPORT_MARKERS (D-09, D-14) + [BLOCKING] db:push
- [x] 11-02-PLAN.md — APIs: admin GET/PUT + list (409 + audit, D-11) + client-readable any-role GET (D-07, D-12)
- [ ] 11-03-PLAN.md — Admin UI: marker-content list + per-marker editor (definition/impact + 5-tier × male/female matrix, optimistic concurrency, dirty guard, tone guidance) + admin nav card (D-07, D-10, D-14)
- [ ] 11-04-PLAN.md — Report UI: PillarsDisplayModal master/detail (desktop two-pane, mobile drill-in) + thread marker content + gender from Section11; (tier,gender) insight with generatePeak360Insights fallback; dark-portal brand; no PDF (D-01..D-06, D-12, D-13, D-14)
