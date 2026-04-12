# Requirements: Peak360 Milestone 2 — Landing Page

**Defined:** 2026-04-12
**Core Value:** Prospective clients can discover the Peak360 Longevity Program through a branded landing page with program overview and contact form.

**Constraint:** No data loss on existing database. All schema changes must be additive (new tables only). Existing tables must not be altered or migrated in a way that risks data loss.

## v2.0 Requirements

Requirements for Milestone 2. Each maps to roadmap phases.

### Landing Page Content

- [ ] **LAND-01**: Visitor sees a hero section with Peak360 logo, "Discover Your True Health Age" headline, subtitle, and "Are You Aging Faster Than You Should?" callout banner
- [ ] **LAND-02**: Visitor sees the program philosophy section with "We don't train people to be younger. We train people to be harder to age." and three pillars (Measure First, Act Early, Maintain What Matters)
- [ ] **LAND-03**: Visitor sees "What We Test" section with four categories: Advanced Blood Biomarkers (60+), VO2 Max Testing, Strength & Flexibility, and Evolt 360 Body Composition
- [ ] **LAND-04**: Visitor sees technology showcase cards for Vald Force Decks, Evolt360 Scanner, and Calibre VO2 Tester with feature bullet lists
- [ ] **LAND-05**: Visitor sees a testing protocol timeline (Week 1-4 + Ongoing quarterly reassessments)
- [ ] **LAND-06**: Visitor sees benefits grid with checkmark items covering healthspan optimization, fall prevention, biomarker tracking, etc.
- [ ] **LAND-07**: Visitor sees a CTA section with "Ready to Invest in Your Longevity?" headline and action button

### Contact Form

- [ ] **CONT-01**: Visitor can submit a contact form with name, email, phone, and message fields
- [ ] **CONT-02**: Contact form submissions are stored in the database for coach review
- [ ] **CONT-03**: Contact form validates required fields (name, email) and shows inline errors

### Design & Responsiveness

- [ ] **DSGN-01**: Landing page uses Peak360 brand colors (navy #1a2332, gold #f5b041), Montserrat headings, Open Sans body text via Tailwind CSS theme tokens
- [ ] **DSGN-02**: Landing page is fully responsive across mobile, tablet, and desktop breakpoints
- [ ] **DSGN-03**: Landing page includes smooth scroll navigation between sections

### Hostname Routing

- [ ] **HOST-01**: Requests to peak360.com.au serve landing page routes via Next.js middleware hostname detection
- [ ] **HOST-02**: Requests to portal.peak360.com.au continue serving existing dashboard/assessment routes unchanged
- [ ] **HOST-03**: Root domain peak360.com.au is added to the DigitalOcean app and DNS configured

## Previous Milestone Requirements (v1.0)

Carried forward from Milestone 1. Not in scope for this milestone's roadmap.

### Clinical Accuracy (Phase 1)
- CLIN-01 through CLIN-04: Gender-specific ratings — Pending
- REPT-01 through REPT-05: Report visualization — Partial (REPT-03, REPT-04 complete)

### Authentication (Phase 2)
- AUTH-01 through AUTH-05: Role-based auth — Pending

### Admin Panel (Phase 3)
- ADMN-01 through ADMN-06: Normative data management — Partial (ADMN-01, ADMN-02, ADMN-05 complete)

### Security (Phase 4)
- SECU-01 through SECU-03: Encryption, audit, backup — Pending

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Email Notifications

- **EMAL-01**: Contact form submissions trigger email notification to coach
- **EMAL-02**: Auto-reply confirmation email sent to visitor after form submission

### Landing Page Enhancements

- **LNDE-01**: Testimonials section with client success stories
- **LNDE-02**: Pricing/packages section
- **LNDE-03**: FAQ accordion section
- **LNDE-04**: Blog/articles section

## Out of Scope

| Feature | Reason |
|---------|--------|
| Email sending from contact form | Requires SMTP setup; v2.0 stores submissions for manual review |
| Online booking/scheduling | Complex integration; contact form sufficient for now |
| Payment processing | Not needed for landing page; future milestone |
| CMS for landing page content | Hardcoded content matches brochure; no dynamic editing needed |
| Separate deployment for landing page | One-app approach with hostname routing is more cost-effective |
| Existing database migration | No data loss constraint; schema changes are additive only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOST-01 | Phase 6 | Pending |
| HOST-02 | Phase 6 | Pending |
| HOST-03 | Phase 6 | Pending |
| DSGN-01 | Phase 6 | Pending |
| LAND-01 | Phase 7 | Pending |
| LAND-02 | Phase 7 | Pending |
| LAND-03 | Phase 7 | Pending |
| LAND-04 | Phase 7 | Pending |
| LAND-05 | Phase 7 | Pending |
| LAND-06 | Phase 7 | Pending |
| LAND-07 | Phase 7 | Pending |
| CONT-01 | Phase 7 | Pending |
| CONT-02 | Phase 7 | Pending |
| CONT-03 | Phase 7 | Pending |
| DSGN-02 | Phase 7 | Pending |
| DSGN-03 | Phase 7 | Pending |

**Coverage:**
- v2.0 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after roadmap creation*
