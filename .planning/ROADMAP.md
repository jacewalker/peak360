# Roadmap: Peak360

## Milestones

- 🚧 **v1.0 MVP** - Phases 1-5 (in progress)
- 🚧 **v2.0 Peak360 Landing Page** - Phases 6-7 (in progress)
- 🚧 **v3.0 Client Login & Trainer Dashboard** - Phases 8-11 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) — Milestone 1</summary>

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
- [ ] 01-01-PLAN.md — Gender-specific blood marker data layer (types, ranges, rating engine, report-markers)
- [x] 01-02-PLAN.md — Enhanced insights with specific supplement dosages and lifestyle recommendations
- [ ] 01-03-PLAN.md — Report UI: range bars, referral flags, and medical disclaimer
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
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

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
**Goal**: Sensitive health data is encrypted at rest with audit trails and automated backups, and clients have a dedicated portal to view their assessments
**Depends on**: Phase 2, Phase 3
**Requirements**: SECU-01, SECU-02, SECU-03
**Success Criteria** (what must be TRUE):
  1. Blood test results and medical screening data are encrypted at rest using AES-256-GCM; raw sensitive data is not visible in the database file
  2. An audit log records who accessed what assessment data and when, viewable by admins
  3. Automated SQLite backups run on a schedule with point-in-time recovery capability
  4. The application continues to function correctly with encrypted data (read, write, display in reports)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Migrate PDF generation to react-pdf/renderer
**Goal**: Replace html2canvas+jsPDF rasterize-and-slice PDF export with @react-pdf/renderer for native vector PDFs with built-in pagination, selectable text, and smaller file sizes
**Depends on**: None (independent of other phases)
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06, PDF-07, PDF-08
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

</details>

### v2.0 Peak360 Landing Page

**Milestone Goal:** Prospective clients can discover the Peak360 Longevity Program through a branded landing page that communicates the program's philosophy, testing protocol, and benefits -- and reach out via a contact form. Hostname routing separates the public site from the coach portal.

- [ ] **Phase 6: Routing Infrastructure & Design System** - Hostname-based routing middleware, DNS configuration, and brand design tokens (fonts, colors, gradients)
- [ ] **Phase 7: Landing Page & Contact Form** - All landing page content sections, contact form with DB persistence, responsive design, and smooth scroll navigation

## Phase Details

### Phase 6: Routing Infrastructure & Design System
**Goal**: The application correctly serves different experiences based on hostname, and the landing page design system (fonts, colors, gradients) is established as reusable Tailwind tokens
**Depends on**: Phase 5
**Requirements**: HOST-01, HOST-02, HOST-03, DSGN-01
**Success Criteria** (what must be TRUE):
  1. Visiting peak360.com.au in a browser serves the landing page route (not the dashboard)
  2. Visiting portal.peak360.com.au in a browser serves the existing dashboard and assessment routes unchanged
  3. Montserrat and Open Sans fonts load on the landing page, and navy/gold brand colors render correctly via Tailwind theme tokens
  4. DNS for peak360.com.au resolves to the DigitalOcean app
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Hostname routing middleware, font setup, design tokens, landing route (HOST-01, HOST-02, DSGN-01)
- [ ] 06-02-PLAN.md — DNS configuration for peak360.com.au and portal subdomain (HOST-03)

### Phase 7: Landing Page & Contact Form
**Goal**: Visitors experience a complete, responsive landing page that communicates the Peak360 Longevity Program and can submit inquiries via a validated contact form
**Depends on**: Phase 6
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, CONT-01, CONT-02, CONT-03, DSGN-02, DSGN-03
**Success Criteria** (what must be TRUE):
  1. Visitor scrolls through all landing page sections in order: hero, philosophy, what we test, technology showcase, testing protocol timeline, benefits grid, and CTA
  2. Visitor can fill out the contact form with name, email, phone, and message, and sees inline validation errors for missing required fields (name, email)
  3. Submitted contact form data appears in a new database table accessible for coach review
  4. Landing page renders correctly on mobile (375px), tablet (768px), and desktop (1280px) with no horizontal overflow or broken layouts
  5. Clicking a navigation link smooth-scrolls to the target section on the page
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 07-01: TBD

---

### v3.0 Client Login & Trainer Dashboard

**Milestone Goal:** Clients can securely log in to view their own assessment results, and coaches have a dedicated dashboard to manage clients, track progress, and deliver assessments -- all with proper role-based access control.

- [ ] **Phase 8: Auth Infrastructure** - Better Auth setup with role-based accounts, session management, middleware guards, and API route protection
- [ ] **Phase 9: Assessment Ownership & Data Migration** - Link assessments to coaches and clients with additive schema changes and backwards compatibility for existing data
- [ ] **Phase 10: Coach Dashboard** - Coach-facing UI for managing clients, creating assessments, tracking progress, and inviting clients
- [ ] **Phase 11: Client Portal** - Client-facing read-only portal for viewing own assessments and reports

### Phase 8: Auth Infrastructure
**Goal**: Users can create accounts, log in with role-based access (admin/coach/client), and all routes enforce authentication and authorization
**Depends on**: Phase 7
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, SAFE-02
**Success Criteria** (what must be TRUE):
  1. A user can log in with email and password and is assigned the correct role (admin, coach, or client)
  2. A coach can create their own account and access coach-level routes
  3. An admin can access admin-only routes; coaches and clients receive a 403 when attempting the same
  4. A logged-in user's session persists across browser refresh and expires after a configurable inactivity period
  5. API routes return 401 for unauthenticated requests and 403 for insufficient role, independently of middleware
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Assessment Ownership & Data Migration
**Goal**: Every assessment is linked to a coach and optionally a client, and existing assessments without ownership continue to function normally
**Depends on**: Phase 8
**Requirements**: DASH-04, SAFE-01
**Success Criteria** (what must be TRUE):
  1. New assessments are created with a coach_id linking them to the logged-in coach
  2. New assessments can be linked to a client_id when created for a specific client
  3. Existing assessments that predate ownership fields load, display, and save without errors
  4. The database schema changes are additive only -- no existing columns are removed or renamed
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

### Phase 10: Coach Dashboard
**Goal**: Coaches have a dedicated dashboard to manage their client roster, create and track assessments, and invite new clients to the platform
**Depends on**: Phase 9
**Requirements**: DASH-01, DASH-02, DASH-03, CLNT-04
**Success Criteria** (what must be TRUE):
  1. A logged-in coach sees a dashboard listing their clients with assessment counts and last activity
  2. A coach can create a new assessment and assign it to a specific client from the dashboard
  3. A coach can view assessment history and progress trends for any of their clients
  4. A coach can invite a client via email link or generated credentials, and the invited client can log in
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 10-01: TBD

### Phase 11: Client Portal
**Goal**: Clients can log in and view their own assessment results in a secure, read-only portal
**Depends on**: Phase 10
**Requirements**: CLNT-01, CLNT-02, CLNT-03
**Success Criteria** (what must be TRUE):
  1. A client can log in and see a list of only their own assessments (not other clients' data)
  2. A client can open a completed assessment and view the Section 11 longevity report in read-only mode
  3. A client who attempts to access another client's assessment URL receives a 403 or is redirected away
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 11-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Clinical Accuracy & Report Quality | v1.0 | 1/3 | In progress | - |
| 2. Authentication & Ownership | v1.0 | 0/0 | Not started | - |
| 3. Admin Panel & Normative Data Management | v1.0 | 2/4 | In progress | - |
| 4. Security & Client Portal | v1.0 | 0/0 | Not started | - |
| 5. PDF Migration | v1.0 | 4/4 | Complete | 2026-04-10 |
| 6. Routing Infrastructure & Design System | v2.0 | 0/2 | Not started | - |
| 7. Landing Page & Contact Form | v2.0 | 0/0 | Not started | - |
| 8. Auth Infrastructure | v3.0 | 0/0 | Not started | - |
| 9. Assessment Ownership & Data Migration | v3.0 | 0/0 | Not started | - |
| 10. Coach Dashboard | v3.0 | 0/0 | Not started | - |
| 11. Client Portal | v3.0 | 0/0 | Not started | - |
